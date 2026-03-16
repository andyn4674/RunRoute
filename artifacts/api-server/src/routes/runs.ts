import { Router, type IRouter } from "express";
import { LogRunBody, ListRunsQueryParams, ListRunsResponse } from "@workspace/api-zod";
import { db, runsTable, profilesTable } from "@workspace/db";
import { desc, eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_PROFILE_ID = 1;

router.get("/runs", async (req, res) => {
  try {
    const params = ListRunsQueryParams.parse(req.query);
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const runs = await db
      .select()
      .from(runsTable)
      .orderBy(desc(runsTable.completedAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(runsTable);

    const response = ListRunsResponse.parse({
      runs: runs.map((r) => ({
        id: r.id,
        routeId: r.routeId,
        trainingGoal: r.trainingGoal,
        distanceMiles: r.distanceMiles,
        durationMinutes: r.durationMinutes,
        avgPaceMinsPerMile: r.avgPaceMinsPerMile,
        elevationGainFt: r.elevationGainFt,
        temperatureF: r.temperatureF,
        perceivedEffort: r.perceivedEffort,
        notes: r.notes,
        completedAt: r.completedAt.toISOString(),
      })),
      total: totalResult.count,
    });

    res.json(response);
  } catch (error: any) {
    console.error("List runs error:", error);
    res.status(500).json({ error: "Failed to list runs" });
  }
});

router.post("/runs", async (req, res) => {
  try {
    const body = LogRunBody.parse(req.body);
    const avgPace = body.durationMinutes / body.distanceMiles;

    const [run] = await db
      .insert(runsTable)
      .values({
        routeId: body.routeId,
        trainingGoal: body.trainingGoal,
        distanceMiles: body.distanceMiles,
        durationMinutes: body.durationMinutes,
        avgPaceMinsPerMile: Math.round(avgPace * 100) / 100,
        elevationGainFt: body.elevationGainFt,
        temperatureF: body.temperatureF,
        perceivedEffort: body.perceivedEffort,
        notes: body.notes,
      })
      .returning();

    await db
      .update(profilesTable)
      .set({
        totalRunsLogged: sql`${profilesTable.totalRunsLogged} + 1`,
        totalMilesRun: sql`${profilesTable.totalMilesRun} + ${body.distanceMiles}`,
      })
      .where(eq(profilesTable.id, DEFAULT_PROFILE_ID));

    res.status(201).json({
      id: run.id,
      routeId: run.routeId,
      trainingGoal: run.trainingGoal,
      distanceMiles: run.distanceMiles,
      durationMinutes: run.durationMinutes,
      avgPaceMinsPerMile: run.avgPaceMinsPerMile,
      elevationGainFt: run.elevationGainFt,
      temperatureF: run.temperatureF,
      perceivedEffort: run.perceivedEffort,
      notes: run.notes,
      completedAt: run.completedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Log run error:", error);
    res.status(400).json({ error: error.message || "Failed to log run" });
  }
});

export default router;
