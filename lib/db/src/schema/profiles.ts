import { pgTable, serial, text, real, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull().default("Runner"),
  preferredGoals: jsonb("preferred_goals").notNull().$type<string[]>().default([]),
  preferredDistanceMiles: real("preferred_distance_miles").notNull().default(5),
  averagePaceMinsPerMile: real("average_pace_mins_per_mile").notNull().default(10),
  preferredSurfaces: jsonb("preferred_surfaces").notNull().$type<string[]>().default([]),
  heatTolerance: text("heat_tolerance").notNull().default("moderate"),
  elevationTolerance: text("elevation_tolerance").notNull().default("moderate"),
  totalRunsLogged: integer("total_runs_logged").notNull().default(0),
  totalMilesRun: real("total_miles_run").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, createdAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
