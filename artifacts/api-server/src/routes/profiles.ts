import { Router, type IRouter } from "express";
import { UpdateProfileBody } from "@workspace/api-zod";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_PROFILE_ID = 1;

async function getOrCreateProfile() {
  const existing = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, DEFAULT_PROFILE_ID))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(profilesTable)
    .values({
      nickname: "Runner",
      preferredGoals: ["general_fitness"],
      preferredDistanceMiles: 5,
      averagePaceMinsPerMile: 10,
      preferredSurfaces: ["pavement"],
      heatTolerance: "moderate",
      elevationTolerance: "moderate",
    })
    .returning();

  return created;
}

function formatProfile(profile: any) {
  return {
    id: profile.id,
    nickname: profile.nickname,
    preferredGoals: profile.preferredGoals,
    preferredDistanceMiles: profile.preferredDistanceMiles,
    averagePaceMinsPerMile: profile.averagePaceMinsPerMile,
    preferredSurfaces: profile.preferredSurfaces,
    heatTolerance: profile.heatTolerance,
    elevationTolerance: profile.elevationTolerance,
    totalRunsLogged: profile.totalRunsLogged,
    totalMilesRun: profile.totalMilesRun,
    createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
  };
}

router.get("/profiles", async (_req, res) => {
  try {
    const profile = await getOrCreateProfile();
    res.json(formatProfile(profile));
  } catch (error: any) {
    console.error("Get profile error:", error?.message || error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/profiles", async (req, res) => {
  try {
    const updates = UpdateProfileBody.parse(req.body);
    await getOrCreateProfile();

    const updateData: Record<string, any> = {};
    if (updates.nickname !== undefined) updateData.nickname = updates.nickname;
    if (updates.preferredGoals !== undefined) updateData.preferredGoals = updates.preferredGoals;
    if (updates.preferredDistanceMiles !== undefined) updateData.preferredDistanceMiles = updates.preferredDistanceMiles;
    if (updates.averagePaceMinsPerMile !== undefined) updateData.averagePaceMinsPerMile = updates.averagePaceMinsPerMile;
    if (updates.preferredSurfaces !== undefined) updateData.preferredSurfaces = updates.preferredSurfaces;
    if (updates.heatTolerance !== undefined) updateData.heatTolerance = updates.heatTolerance;
    if (updates.elevationTolerance !== undefined) updateData.elevationTolerance = updates.elevationTolerance;

    const [updated] = await db
      .update(profilesTable)
      .set(updateData)
      .where(eq(profilesTable.id, DEFAULT_PROFILE_ID))
      .returning();

    res.json(formatProfile(updated));
  } catch (error: any) {
    console.error("Update profile error:", error?.message || error);
    res.status(400).json({ error: error?.message || "Failed to update profile" });
  }
});

export default router;
