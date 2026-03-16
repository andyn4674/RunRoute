import { v4 as uuidv4 } from "crypto";

interface RouteParams {
  trainingGoal: string;
  distanceMiles: number;
  startLat: number;
  startLng: number;
  temperatureF?: number;
  humidity?: number;
  windSpeedMph?: number;
  uvIndex?: number;
  timeOfDay?: string;
  preferShade?: boolean;
  avoidTraffic?: boolean;
  preferTrails?: boolean;
}

interface GoalWeightConfig {
  label: string;
  description: string;
  weights: Record<string, number>;
}

const GOAL_WEIGHTS: Record<string, GoalWeightConfig> = {
  mountain_hiking: {
    label: "Mountain Hiking Prep",
    description: "Prioritizes elevation gain and sustained climbs to build mountain endurance",
    weights: {
      elevation: 0.35,
      terrain_difficulty: 0.20,
      shade: 0.05,
      traffic: 0.10,
      safety: 0.15,
      surface_trail: 0.15,
    },
  },
  heat_tolerance: {
    label: "Heat Tolerance Training",
    description: "Reduces shade preference and targets sun-exposed routes for heat adaptation",
    weights: {
      elevation: 0.05,
      terrain_difficulty: 0.10,
      shade: -0.20,
      traffic: 0.15,
      safety: 0.20,
      surface_trail: 0.10,
      sun_exposure: 0.20,
    },
  },
  recovery: {
    label: "Recovery Run",
    description: "Flat terrain, shaded routes, minimal intersections for easy recovery",
    weights: {
      elevation: -0.15,
      terrain_difficulty: -0.10,
      shade: 0.30,
      traffic: 0.20,
      safety: 0.25,
      surface_smooth: 0.10,
    },
  },
  speed_workout: {
    label: "Speed Workout",
    description: "Flat roads with minimal interruptions for interval and tempo training",
    weights: {
      elevation: -0.20,
      terrain_difficulty: -0.10,
      shade: 0.10,
      traffic: 0.25,
      safety: 0.20,
      surface_smooth: 0.15,
    },
  },
  endurance: {
    label: "Endurance Training",
    description: "Long continuous routes with gradual elevation changes for building stamina",
    weights: {
      elevation: 0.15,
      terrain_difficulty: 0.10,
      shade: 0.15,
      traffic: 0.15,
      safety: 0.20,
      surface_trail: 0.10,
      continuity: 0.15,
    },
  },
  general_fitness: {
    label: "General Fitness",
    description: "Balanced routes suitable for maintaining overall fitness",
    weights: {
      elevation: 0.10,
      terrain_difficulty: 0.10,
      shade: 0.15,
      traffic: 0.15,
      safety: 0.25,
      surface_smooth: 0.10,
      variety: 0.15,
    },
  },
};

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function destinationPoint(lat: number, lng: number, distanceKm: number, bearingDeg: number): [number, number] {
  const R = 6371;
  const d = distanceKm / R;
  const brng = toRadians(bearingDeg);
  const lat1 = toRadians(lat);
  const lng1 = toRadians(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [toDegrees(lat2), toDegrees(lng2)];
}

function generateElevationProfile(
  numPoints: number,
  goal: string,
  baseElevation: number
): number[] {
  const elevations: number[] = [baseElevation];
  let current = baseElevation;

  for (let i = 1; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    let change: number;

    switch (goal) {
      case "mountain_hiking":
        if (progress < 0.5) {
          change = 15 + Math.random() * 30;
        } else {
          change = -(15 + Math.random() * 30);
        }
        break;
      case "recovery":
      case "speed_workout":
        change = (Math.random() - 0.5) * 4;
        break;
      case "endurance":
        change = (Math.random() - 0.5) * 12;
        break;
      case "heat_tolerance":
        change = (Math.random() - 0.5) * 10;
        break;
      default:
        change = (Math.random() - 0.5) * 8;
    }

    current += change;
    current = Math.max(0, current);
    elevations.push(Math.round(current));
  }

  return elevations;
}

function generateWaypoints(
  startLat: number,
  startLng: number,
  distanceMiles: number,
  numPoints: number,
  routeVariant: number
): Array<{ lat: number; lng: number }> {
  const distanceKm = distanceMiles * 1.60934;
  const perimeterKm = distanceKm;
  const radiusKm = perimeterKm / (2 * Math.PI);

  const baseAngle = routeVariant * 120;
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    const angle = baseAngle + (360 * i) / numPoints;
    const r = radiusKm * (0.7 + Math.random() * 0.6);
    const [lat, lng] = destinationPoint(startLat, startLng, r, angle);
    points.push({ lat, lng });
  }

  points.push({ lat: startLat, lng: startLng });

  return [{ lat: startLat, lng: startLng }, ...points];
}

const SURFACE_TYPES = ["pavement", "gravel", "trail", "mixed"] as const;
const TRAFFIC_LEVELS = ["low", "moderate", "high"] as const;

function getSurfaceForGoal(goal: string): (typeof SURFACE_TYPES)[number] {
  const rand = Math.random();
  switch (goal) {
    case "mountain_hiking":
      return rand < 0.6 ? "trail" : rand < 0.8 ? "gravel" : "mixed";
    case "speed_workout":
      return rand < 0.8 ? "pavement" : "mixed";
    case "recovery":
      return rand < 0.5 ? "pavement" : rand < 0.8 ? "trail" : "gravel";
    case "endurance":
      return rand < 0.3 ? "trail" : rand < 0.6 ? "mixed" : rand < 0.9 ? "pavement" : "gravel";
    default:
      return SURFACE_TYPES[Math.floor(rand * SURFACE_TYPES.length)];
  }
}

function getTrafficForGoal(goal: string, timeOfDay?: string): (typeof TRAFFIC_LEVELS)[number] {
  const baseRand = Math.random();
  const timeMod = timeOfDay === "morning" ? -0.1 : timeOfDay === "afternoon" ? 0.2 : timeOfDay === "evening" ? 0.1 : -0.2;
  const adjusted = baseRand + timeMod;

  if (goal === "recovery" || goal === "speed_workout") {
    return adjusted < 0.7 ? "low" : "moderate";
  }
  return adjusted < 0.4 ? "low" : adjusted < 0.75 ? "moderate" : "high";
}

function calculateShade(goal: string, timeOfDay?: string): number {
  let base: number;
  switch (goal) {
    case "heat_tolerance":
      base = 10 + Math.random() * 20;
      break;
    case "recovery":
      base = 60 + Math.random() * 30;
      break;
    default:
      base = 30 + Math.random() * 40;
  }

  if (timeOfDay === "morning" || timeOfDay === "evening") base += 10;
  if (timeOfDay === "night") base += 30;

  return Math.min(100, Math.max(0, Math.round(base)));
}

function computeScoreBreakdown(
  segments: any[],
  goal: string,
  totalElevationGain: number,
  distanceMiles: number,
  temperatureF?: number
): {
  terrainMatch: number;
  safetyScore: number;
  environmentalFit: number;
  trainingEffectiveness: number;
  shadeScore: number;
  trafficScore: number;
} {
  const avgShade = segments.reduce((s, seg) => s + seg.shadePercentage, 0) / segments.length;
  const avgSafety = segments.reduce((s, seg) => s + seg.safetyScore, 0) / segments.length;
  const lowTrafficPct = segments.filter((s) => s.trafficLevel === "low").length / segments.length;

  let terrainMatch = 50;
  switch (goal) {
    case "mountain_hiking":
      terrainMatch = Math.min(100, 30 + (totalElevationGain / distanceMiles) * 0.5);
      break;
    case "recovery":
    case "speed_workout":
      terrainMatch = Math.min(100, 90 - (totalElevationGain / distanceMiles) * 0.3);
      break;
    case "endurance":
      terrainMatch = Math.min(100, 60 + Math.abs(totalElevationGain / distanceMiles - 50) * -0.2);
      break;
    default:
      terrainMatch = 65 + Math.random() * 20;
  }

  let envFit = 70;
  if (temperatureF !== undefined) {
    if (goal === "heat_tolerance" && temperatureF > 85) envFit += 15;
    else if (goal === "recovery" && temperatureF > 90) envFit -= 20;
    else if (temperatureF > 95) envFit -= 10;
  }

  const trainingEffectiveness = Math.min(100, terrainMatch * 0.5 + avgSafety * 5 + lowTrafficPct * 20);

  return {
    terrainMatch: Math.round(Math.min(100, Math.max(0, terrainMatch))),
    safetyScore: Math.round(avgSafety * 10),
    environmentalFit: Math.round(Math.min(100, Math.max(0, envFit))),
    trainingEffectiveness: Math.round(Math.min(100, Math.max(0, trainingEffectiveness))),
    shadeScore: Math.round(avgShade),
    trafficScore: Math.round(lowTrafficPct * 100),
  };
}

const ROUTE_NAMES: Record<string, string[]> = {
  mountain_hiking: ["Summit Seeker Loop", "Ridge Trail Circuit", "Highland Climber"],
  heat_tolerance: ["Sun Runner Path", "Exposed Desert Loop", "Heat Training Circuit"],
  recovery: ["Gentle Shade Loop", "Easy Creek Trail", "Park Recovery Path"],
  speed_workout: ["Flat & Fast Track", "Sprint Circuit", "Interval Road Loop"],
  endurance: ["Long Haul Trail", "Steady State Loop", "Distance Builder"],
  general_fitness: ["Balanced Fitness Loop", "Mixed Terrain Circuit", "Active Explorer Trail"],
};

function getWeatherSummary(params: RouteParams) {
  const temp = params.temperatureF ?? 72;
  const humidity = params.humidity ?? 50;
  const wind = params.windSpeedMph ?? 5;
  const uv = params.uvIndex ?? 5;

  const heatIndex = temp + 0.5 * (temp - 61 + (temp - 68) * 0.012 * humidity);

  let conditions = "Clear";
  if (humidity > 80) conditions = "Humid";
  else if (wind > 15) conditions = "Windy";
  else if (temp > 90) conditions = "Hot";
  else if (temp < 40) conditions = "Cold";

  let recommendation = "Good conditions for running.";
  if (heatIndex > 105) recommendation = "Extreme heat - consider postponing or reducing intensity.";
  else if (heatIndex > 90) recommendation = "High heat index - stay hydrated and take breaks.";
  else if (temp < 32) recommendation = "Below freezing - wear layers and watch for ice.";
  else if (wind > 20) recommendation = "Strong winds - choose sheltered routes.";
  else if (uv > 8) recommendation = "Very high UV - apply sunscreen and consider shade.";

  return {
    temperatureF: temp,
    humidity,
    windSpeedMph: wind,
    uvIndex: uv,
    conditions,
    heatIndex: Math.round(heatIndex),
    recommendation,
  };
}

export function generateRoutes(params: RouteParams) {
  const goal = params.trainingGoal;
  const numRoutes = 3;
  const routes = [];

  for (let r = 0; r < numRoutes; r++) {
    const numPoints = 8 + Math.floor(Math.random() * 5);
    const waypoints = generateWaypoints(
      params.startLat,
      params.startLng,
      params.distanceMiles,
      numPoints,
      r
    );

    const baseElevation = 100 + Math.random() * 500;
    const elevations = generateElevationProfile(waypoints.length, goal, baseElevation);

    const waypointsWithElevation = waypoints.map((wp, i) => ({
      ...wp,
      elevation: elevations[i],
      name: i === 0 ? "Start/Finish" : `Waypoint ${i}`,
    }));

    const segments = [];
    let totalElevationGain = 0;
    let totalElevationLoss = 0;
    const surfaceCounts: Record<string, number> = {};
    const segmentDistance = params.distanceMiles / (waypoints.length - 1);

    for (let i = 0; i < waypoints.length - 1; i++) {
      const elevGain = Math.max(0, elevations[i + 1] - elevations[i]);
      const elevLoss = Math.max(0, elevations[i] - elevations[i + 1]);
      totalElevationGain += elevGain;
      totalElevationLoss += elevLoss;

      const surface = getSurfaceForGoal(goal);
      surfaceCounts[surface] = (surfaceCounts[surface] || 0) + 1;

      const grade = segmentDistance > 0 ? ((elevations[i + 1] - elevations[i]) / (segmentDistance * 5280)) * 100 : 0;

      segments.push({
        startIndex: i,
        endIndex: i + 1,
        distanceMiles: Math.round(segmentDistance * 100) / 100,
        elevationGainFt: Math.round(elevGain),
        grade: Math.round(grade * 10) / 10,
        surfaceType: surface,
        shadePercentage: calculateShade(goal, params.timeOfDay),
        trafficLevel: getTrafficForGoal(goal, params.timeOfDay),
        safetyScore: Math.round((6 + Math.random() * 4) * 10) / 10,
        lightingAvailable: params.timeOfDay !== "night" || Math.random() > 0.4,
      });
    }

    const totalSegments = waypoints.length - 1;
    const surfaceBreakdown: Record<string, number> = {};
    for (const [surface, count] of Object.entries(surfaceCounts)) {
      surfaceBreakdown[surface] = Math.round((count / totalSegments) * 100);
    }

    const scoreBreakdown = computeScoreBreakdown(
      segments,
      goal,
      totalElevationGain,
      params.distanceMiles,
      params.temperatureF
    );

    const overallScore = Math.round(
      (scoreBreakdown.terrainMatch * 0.25 +
        scoreBreakdown.safetyScore * 0.20 +
        scoreBreakdown.environmentalFit * 0.15 +
        scoreBreakdown.trainingEffectiveness * 0.20 +
        scoreBreakdown.shadeScore * 0.10 +
        scoreBreakdown.trafficScore * 0.10)
    );

    const avgPace = goal === "speed_workout" ? 7 + Math.random() * 2 : goal === "recovery" ? 10 + Math.random() * 2 : 8.5 + Math.random() * 2;
    const estimatedDuration = Math.round(params.distanceMiles * avgPace);

    const names = ROUTE_NAMES[goal] || ROUTE_NAMES.general_fitness;
    const warnings: string[] = [];
    const highlights: string[] = [];

    if (params.temperatureF && params.temperatureF > 90) warnings.push("High temperature - stay hydrated");
    if (segments.some((s) => !s.lightingAvailable)) warnings.push("Some segments lack lighting");
    if (segments.some((s) => s.trafficLevel === "high")) warnings.push("Route includes high-traffic segments");

    if (totalElevationGain > 200) highlights.push(`${Math.round(totalElevationGain)}ft total elevation gain`);
    if (surfaceBreakdown.trail && surfaceBreakdown.trail > 40) highlights.push("Mostly trail running");
    if (scoreBreakdown.shadeScore > 60) highlights.push("Well-shaded route");
    if (scoreBreakdown.trafficScore > 70) highlights.push("Low traffic throughout");

    const descriptions: Record<string, string[]> = {
      mountain_hiking: [
        "A challenging loop with sustained climbs and descents, perfect for building mountain endurance.",
        "This hilly circuit targets elevation training with varying grades and trail surfaces.",
        "Steep switchback-style route designed to simulate mountain hiking conditions.",
      ],
      heat_tolerance: [
        "Sun-exposed route with minimal shade, ideal for heat acclimatization training.",
        "Open terrain circuit designed to build heat tolerance in direct sunlight.",
        "A sun-drenched path through exposed areas for progressive heat adaptation.",
      ],
      recovery: [
        "A gentle, flat route through shaded areas, perfect for active recovery days.",
        "Easy loop with smooth surfaces and minimal elevation change for post-workout recovery.",
        "Relaxed path following shaded corridors with low traffic for easy running.",
      ],
      speed_workout: [
        "Flat, uninterrupted route ideal for tempo runs and speed intervals.",
        "Smooth pavement circuit with minimal stops, designed for fast-paced training.",
        "Quick and flat loop optimized for sprint intervals and race-pace workouts.",
      ],
      endurance: [
        "Long, flowing route with gentle undulations for building aerobic endurance.",
        "Extended loop with varied but manageable terrain for long-distance training.",
        "Continuous path designed for sustained effort and distance building.",
      ],
      general_fitness: [
        "Balanced route mixing terrain types for well-rounded fitness development.",
        "Varied circuit combining flat stretches with gentle hills for general conditioning.",
        "All-purpose loop suitable for maintaining fitness with a mix of challenges.",
      ],
    };

    routes.push({
      id: generateId(),
      name: names[r % names.length],
      description: (descriptions[goal] || descriptions.general_fitness)[r % 3],
      distanceMiles: Math.round(params.distanceMiles * 100) / 100,
      estimatedDurationMinutes: estimatedDuration,
      elevationGainFt: Math.round(totalElevationGain),
      elevationLossFt: Math.round(totalElevationLoss),
      overallScore: Math.min(100, Math.max(0, overallScore)),
      scoreBreakdown,
      waypoints: waypointsWithElevation,
      segments,
      surfaceBreakdown,
      warnings,
      highlights,
    });
  }

  routes.sort((a, b) => b.overallScore - a.overallScore);

  return {
    routes,
    weatherSummary: getWeatherSummary(params),
    generatedAt: new Date().toISOString(),
  };
}

export function getScoringFactors() {
  return {
    goals: GOAL_WEIGHTS,
  };
}
