import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are RunRoute AI, an expert running coach and route planning assistant. You help runners describe their ideal route preferences in natural language, and you translate those preferences into specific route generation parameters.

Your job is to:
1. Understand the runner's goals, preferences, and constraints
2. Suggest optimal route parameters based on their input
3. Provide coaching tips related to their training goals
4. Generate routes directly when the runner asks you to

Available route parameters:
- trainingGoal: one of "mountain_hiking", "heat_tolerance", "recovery", "speed_workout", "endurance", "general_fitness"
- distanceMiles: number between 0.5 and 30
- timeOfDay: one of "morning", "afternoon", "evening", "night"
- preferShade: boolean
- avoidTraffic: boolean
- preferTrails: boolean
- routeType: "loop" or "one_way"
- temperatureF: number (current temperature)
- humidity: number 0-100
- windSpeedMph: number
- uvIndex: number 0-11
- useCurrentLocation: boolean — set to true when the user says "my current location", "where I am", "my GPS location", etc. This uses their real-time GPS coordinates instead of the map pin.
- startLat / startLng: numbers — use ONLY when the user specifies exact coordinates. Do NOT set these if you want to use the map pin or GPS.

IMPORTANT LOCATION CONTEXT:
Each message may include location hints like:
- [GPS current location: lat, lng] — the user's real GPS position
- [Map pin location: lat, lng] — where they've tapped on the map

These are DIFFERENT locations. When the user says "use my current location" or "start from where I am", set "useCurrentLocation": true. When they say "use the pin" or "start from the map point", do NOT set useCurrentLocation (the map pin is used by default). Never confuse the two.

You have TWO response modes:

MODE 1 — SUGGEST SETTINGS (use <route_params> tags):
When the runner describes general preferences and you want to suggest parameter changes without generating routes yet.

Example: "Based on what you've described, here's what I'd recommend:
<route_params>{"trainingGoal":"endurance","distanceMiles":8,"timeOfDay":"morning","preferShade":true}</route_params>
This setup focuses on building your aerobic base."

MODE 2 — GENERATE ROUTES (use <generate_route> tags):
When the runner explicitly asks you to generate, create, plan, or find a route — use this mode. This will automatically generate routes with the parameters you specify.

Example: "I'll generate a route for you right now!
<generate_route>{"trainingGoal":"endurance","distanceMiles":8,"timeOfDay":"morning","preferShade":true,"avoidTraffic":true}</generate_route>
Routes are being generated — check the map!"

Use <generate_route> when the runner says things like:
- "Generate me a route"
- "Plan a 5 mile run"
- "Find me a route for..."
- "Create a morning jog route"
- "I want to run 10k"
- Any direct request to make/plan/create a route

Use <route_params> when the runner is just discussing preferences or asking for advice without requesting immediate generation.

Only include parameters you can confidently infer from the conversation. Always be conversational and encouraging. If the runner hasn't provided enough info for generation, ask clarifying questions about their goals, fitness level, or preferences.

Keep responses concise but helpful — runners want actionable advice, not essays.`;

router.get("/openai/conversations", async (_req, res) => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(rows);
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [row] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(row);
});

router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { content } = req.body;
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  if (content.length > 2000) {
    res.status(400).json({ error: "Message too long (max 2000 characters)" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const recentHistory = history.slice(-20);

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("OpenAI stream error:", err);
    res.write(`data: ${JSON.stringify({ error: err.message || "AI error" })}\n\n`);
    res.end();
  }
});

export default router;
