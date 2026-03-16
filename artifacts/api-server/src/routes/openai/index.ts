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

When the runner describes preferences, extract and respond with a JSON block wrapped in <route_params> tags containing any of these parameters you can infer:
- trainingGoal: one of "mountain_hiking", "heat_tolerance", "recovery", "speed_workout", "endurance", "general_fitness"
- distanceMiles: number between 0.5 and 30
- timeOfDay: one of "morning", "afternoon", "evening", "night"
- preferShade: boolean
- avoidTraffic: boolean
- preferTrails: boolean
- temperatureF: number (current temperature)
- humidity: number 0-100
- windSpeedMph: number
- uvIndex: number 0-11

Example response format when you detect route preferences:
"Based on what you've described, here's what I'd recommend:

<route_params>{"trainingGoal":"endurance","distanceMiles":8,"timeOfDay":"morning","preferShade":true,"avoidTraffic":true}</route_params>

This setup focuses on building your aerobic base with a longer morning run. The shade preference will keep you comfortable, and avoiding traffic means safer, more peaceful running."

Only include parameters you can confidently infer from the conversation. Always be conversational and encouraging. If the runner hasn't provided enough info, ask clarifying questions about their goals, fitness level, or preferences.

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
