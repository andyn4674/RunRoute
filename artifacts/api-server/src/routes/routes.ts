import { Router, type IRouter } from "express";
import { GenerateRoutesBody } from "@workspace/api-zod";
import { generateRoutes, getScoringFactors } from "./route-engine";

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

export default router;
