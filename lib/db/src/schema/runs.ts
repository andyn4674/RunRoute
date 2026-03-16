import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const runsTable = pgTable("runs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  routeId: text("route_id").notNull(),
  trainingGoal: text("training_goal").notNull(),
  distanceMiles: real("distance_miles").notNull(),
  durationMinutes: real("duration_minutes").notNull(),
  avgPaceMinsPerMile: real("avg_pace_mins_per_mile").notNull(),
  elevationGainFt: real("elevation_gain_ft").notNull(),
  temperatureF: real("temperature_f").notNull(),
  perceivedEffort: integer("perceived_effort").notNull(),
  notes: text("notes"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertRunSchema = createInsertSchema(runsTable).omit({ id: true, completedAt: true });
export type InsertRun = z.infer<typeof insertRunSchema>;
export type RunRecord = typeof runsTable.$inferSelect;
