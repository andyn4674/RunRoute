import { Router, type IRouter } from "express";
import { GenerateRoutesBody } from "@workspace/api-zod";
import { generateRoutes, getScoringFactors } from "./route-engine";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const routeCache = new Map<string, any>();

router.post("/routes/generate", async (req, res) => {
  try {
    const parsed = GenerateRoutesBody.parse(req.body);
    const result = await generateRoutes({
      trainingGoal: parsed.trainingGoal,
      distanceMiles: parsed.distanceMiles,
      startLat: parsed.startLat,
      startLng: parsed.startLng,
      temperatureF: parsed.temperatureF ?? undefined,
      humidity: parsed.humidity ?? undefined,
      windSpeedMph: parsed.windSpeedMph ?? undefined,
      uvIndex: parsed.uvIndex ?? undefined,
      timeOfDay: parsed.timeOfDay ?? undefined,
      preferShade: parsed.preferShade ?? undefined,
      avoidTraffic: parsed.avoidTraffic ?? undefined,
      preferTrails: parsed.preferTrails ?? undefined,
      routeType: parsed.routeType ?? undefined,
    });

    for (const route of result.routes) {
      routeCache.set(route.id, route);
    }

    if (routeCache.size > 100) {
      const keys = Array.from(routeCache.keys());
      for (let i = 0; i < keys.length - 100; i++) {
        routeCache.delete(keys[i]);
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("Route generation error:", error?.message || error);
    res.status(400).json({ error: error?.message || "Invalid request" });
  }
});

router.get("/routes/scoring-factors", (_req, res) => {
  const factors = getScoringFactors();
  res.json(factors);
});

router.get("/routes/:routeId", (req, res) => {
  const route = routeCache.get(req.params.routeId);
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  res.json(route);
});

const analysisCache = new Map<string, string>();

router.get("/routes/:routeId/analysis", async (req, res) => {
  const routeId = req.params.routeId;
  const route = routeCache.get(routeId);
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }

  const cached = analysisCache.get(routeId);
  if (cached) {
    res.json({ analysis: cached });
    return;
  }

  try {
    const prompt = `Analyze this running route and provide a brief pros and cons assessment for a runner. Be specific and actionable.

Route: "${route.name}"
Description: ${route.description}
Distance: ${route.distanceMiles} miles
Estimated Duration: ${route.estimatedDurationMinutes} minutes
Elevation Gain: ${route.elevationGainFt} ft
Elevation Loss: ${route.elevationLossFt} ft
Overall Score: ${route.overallScore}/100
Score Breakdown:
- Terrain Match: ${route.scoreBreakdown.terrainMatch}/100
- Safety: ${route.scoreBreakdown.safetyScore}/100
- Environmental Fit: ${route.scoreBreakdown.environmentalFit}/100
- Training Effectiveness: ${route.scoreBreakdown.trainingEffectiveness}/100
- Shade Coverage: ${route.scoreBreakdown.shadeScore}/100
- Low Traffic: ${route.scoreBreakdown.trafficScore}/100
Surfaces: ${Object.entries(route.surfaceBreakdown).map(([s, p]) => `${s} ${p}%`).join(", ")}
Warnings: ${route.warnings.length > 0 ? route.warnings.join("; ") : "None"}
Highlights: ${route.highlights.join("; ")}

Format your response as:
**Pros:**
- (2-4 specific pros)

**Cons:**
- (1-3 specific cons or considerations)

**Best For:** (one sentence about who this route is ideal for)

Keep it concise — about 150 words total.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert running coach providing route analysis. Be concise, specific, and helpful." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || "Analysis unavailable.";

    analysisCache.set(routeId, analysis);
    if (analysisCache.size > 50) {
      const keys = Array.from(analysisCache.keys());
      for (let i = 0; i < keys.length - 50; i++) {
        analysisCache.delete(keys[i]);
      }
    }

    res.json({ analysis });
  } catch (error: any) {
    console.error("Route analysis error:", error?.message || error);
    res.status(500).json({ error: "Failed to generate analysis" });
  }
});

export default router;
