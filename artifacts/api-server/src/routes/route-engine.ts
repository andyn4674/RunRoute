import { openai } from "@workspace/integrations-openai-ai-server";

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

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

async function snapToRoads(
  waypoints: Array<{ lat: number; lng: number }>,
): Promise<Array<{ lat: number; lng: number }> | null> {
  const coords = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=polyline&steps=false`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.[0]?.geometry) return null;

    return decodePolyline(data.routes[0].geometry);
  } catch {
    return null;
  }
}

function generateViaPoints(
  startLat: number,
  startLng: number,
  distanceMiles: number,
  numPoints: number,
  routeVariant: number
): Array<{ lat: number; lng: number }> {
  const distanceKm = distanceMiles * 1.60934;
  const perimeterKm = distanceKm;
  const radiusKm = perimeterKm / (2 * Math.PI);

  const baseAngle = routeVariant * 120 + (Math.random() * 20 - 10);
  const points: Array<{ lat: number; lng: number }> = [];

  const densePoints = Math.max(numPoints, 8);

  for (let i = 0; i < densePoints; i++) {
    const angle = baseAngle + (360 * i) / densePoints;
    const r = radiusKm * (0.85 + Math.random() * 0.3);
    const [lat, lng] = destinationPoint(startLat, startLng, r, angle);
    points.push({ lat, lng });
  }

  return [{ lat: startLat, lng: startLng }, ...points, { lat: startLat, lng: startLng }];
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
          change = 10 + Math.random() * 30;
        } else {
          change = -(10 + Math.random() * 30);
        }
        break;
      case "recovery":
        change = (Math.random() - 0.5) * 5;
        break;
      case "speed_workout":
        change = (Math.random() - 0.5) * 3;
        break;
      case "heat_tolerance":
        change = (Math.random() - 0.5) * 8;
        break;
      case "endurance":
        change = Math.sin(progress * Math.PI * 4) * 8 + (Math.random() - 0.5) * 5;
        break;
      default:
        change = Math.sin(progress * Math.PI * 2) * 10 + (Math.random() - 0.5) * 8;
    }

    current += change;
    elevations.push(Math.max(0, current));
  }

  return elevations;
}

const SURFACE_TYPES = ["pavement", "gravel", "trail", "mixed"] as const;
const TRAFFIC_LEVELS = ["low", "moderate", "high"] as const;

function getSurfaceForGoal(goal: string): (typeof SURFACE_TYPES)[number] {
  const rand = Math.random();
  switch (goal) {
    case "mountain_hiking":
      return rand < 0.5 ? "trail" : rand < 0.8 ? "gravel" : "mixed";
    case "speed_workout":
      return rand < 0.7 ? "pavement" : "mixed";
    case "recovery":
      return rand < 0.5 ? "pavement" : rand < 0.8 ? "trail" : "mixed";
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

interface HourlyWeatherPoint {
  time: string;
  temperatureF: number;
  humidity: number;
  windSpeedMph: number;
  uvIndex: number;
  weatherCode: number;
  conditions: string;
  precipitationMm: number;
}

interface WeatherForecast {
  current: HourlyWeatherPoint;
  hourly: HourlyWeatherPoint[];
}

function weatherCodeToConditions(weatherCode: number): string {
  if (weatherCode >= 95) return "Thunderstorm";
  if (weatherCode >= 80) return "Rain Showers";
  if (weatherCode >= 71) return "Snow";
  if (weatherCode >= 61) return "Rain";
  if (weatherCode >= 51) return "Drizzle";
  if (weatherCode >= 45) return "Foggy";
  if (weatherCode >= 3) return "Overcast";
  if (weatherCode >= 2) return "Partly Cloudy";
  if (weatherCode >= 1) return "Mainly Clear";
  return "Clear";
}

async function fetchWeatherForecast(lat: number, lng: number): Promise<WeatherForecast> {
  const defaultPoint: HourlyWeatherPoint = {
    time: new Date().toISOString(),
    temperatureF: 72, humidity: 50, windSpeedMph: 5, uvIndex: 5,
    weatherCode: 0, conditions: "Clear", precipitationMm: 0,
  };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,weather_code,precipitation&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,weather_code,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_hours=6`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Weather API failed");
    const data = await response.json();
    const c = data.current;

    const currentCode = c.weather_code ?? 0;
    const current: HourlyWeatherPoint = {
      time: c.time ?? new Date().toISOString(),
      temperatureF: Math.round(c.temperature_2m ?? 72),
      humidity: Math.round(c.relative_humidity_2m ?? 50),
      windSpeedMph: Math.round(c.wind_speed_10m ?? 5),
      uvIndex: Math.round(c.uv_index ?? 5),
      weatherCode: currentCode,
      conditions: weatherCodeToConditions(currentCode),
      precipitationMm: c.precipitation ?? 0,
    };

    const hourly: HourlyWeatherPoint[] = [];
    const h = data.hourly;
    if (h?.time && Array.isArray(h.time)) {
      for (let i = 0; i < h.time.length; i++) {
        const code = h.weather_code?.[i] ?? 0;
        hourly.push({
          time: h.time[i],
          temperatureF: Math.round(h.temperature_2m?.[i] ?? 72),
          humidity: Math.round(h.relative_humidity_2m?.[i] ?? 50),
          windSpeedMph: Math.round(h.wind_speed_10m?.[i] ?? 5),
          uvIndex: Math.round(h.uv_index?.[i] ?? 5),
          weatherCode: code,
          conditions: weatherCodeToConditions(code),
          precipitationMm: h.precipitation?.[i] ?? 0,
        });
      }
    }

    return { current, hourly };
  } catch (err) {
    console.warn("Failed to fetch weather forecast, using defaults:", err);
    return { current: defaultPoint, hourly: [defaultPoint] };
  }
}

function getWeatherForRunWindow(forecast: WeatherForecast, durationMinutes: number): {
  start: HourlyWeatherPoint;
  worst: HourlyWeatherPoint;
  conditionsChange: string | null;
  worstHour: number;
  forecastLimited: boolean;
} {
  const hoursNeeded = Math.ceil(durationMinutes / 60);

  const currentTime = new Date(forecast.current.time).getTime();
  const relevantHours = forecast.hourly.filter(h => {
    const t = new Date(h.time).getTime();
    return t >= currentTime;
  }).slice(0, Math.max(1, hoursNeeded + 1));

  const forecastLimited = hoursNeeded > relevantHours.length;

  if (relevantHours.length === 0) {
    return { start: forecast.current, worst: forecast.current, conditionsChange: null, worstHour: 0, forecastLimited };
  }

  let worstIdx = 0;
  let worstScore = -Infinity;

  for (let i = 0; i < relevantHours.length; i++) {
    const h = relevantHours[i];
    let severity = 0;
    severity += h.weatherCode * 0.5;
    severity += Math.max(0, h.temperatureF - 85) * 2;
    severity += Math.max(0, 32 - h.temperatureF) * 2;
    severity += h.windSpeedMph * 0.5;
    severity += h.precipitationMm * 10;
    severity += Math.max(0, h.uvIndex - 6) * 3;

    if (severity > worstScore) {
      worstScore = severity;
      worstIdx = i;
    }
  }

  const start = forecast.current;
  const worst = relevantHours[worstIdx];
  let conditionsChange: string | null = null;

  if (worstIdx > 0 && worst.conditions !== start.conditions) {
    const changeTime = worstIdx === 1 ? "within the hour" : `in ~${worstIdx} hour${worstIdx > 1 ? "s" : ""}`;
    conditionsChange = `${worst.conditions} expected ${changeTime}`;
  }

  if (worstIdx > 0) {
    const tempDelta = worst.temperatureF - start.temperatureF;
    if (Math.abs(tempDelta) >= 5 && !conditionsChange) {
      const dir = tempDelta > 0 ? "rising" : "dropping";
      conditionsChange = `Temperature ${dir} to ${worst.temperatureF}°F during your run`;
    }

    const windDelta = worst.windSpeedMph - start.windSpeedMph;
    if (windDelta >= 8 && !conditionsChange) {
      conditionsChange = `Winds increasing to ${worst.windSpeedMph} mph during your run`;
    }
  }

  return { start, worst, conditionsChange, worstHour: worstIdx, forecastLimited };
}

interface LocalAdvisory {
  type: "event" | "road_closure" | "police_activity" | "construction" | "weather_hazard" | "other";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  area: string;
}

const advisoryCache = new Map<string, { advisories: LocalAdvisory[]; fetchedAt: number }>();

async function fetchLocalAdvisories(lat: number, lng: number, timeOfDay?: string): Promise<LocalAdvisory[]> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = advisoryCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 30 * 60 * 1000) {
    return cached.advisories;
  }

  try {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
    const month = now.toLocaleDateString("en-US", { month: "long" });
    const timeStr = timeOfDay || "morning";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a local area advisory system for runners. Given coordinates, provide realistic advisories about temporary events, road closures, construction, police activity, or hazards that could affect running routes in the area. Consider the time of day, day of week, and season. Be realistic — most areas will have 0-3 active advisories. Return a JSON array.`,
        },
        {
          role: "user",
          content: `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}
Day: ${dayOfWeek}, ${month} ${now.getDate()}, ${now.getFullYear()}
Time of day: ${timeStr}

Return a JSON array of current advisories affecting runners in this area. Each advisory should have:
- type: "event" | "road_closure" | "police_activity" | "construction" | "weather_hazard" | "other"
- severity: "low" | "medium" | "high"
- title: short title
- description: brief description of impact on runners
- area: general area/street name affected

Return [] if no significant advisories. Be realistic — don't fabricate events, but consider typical patterns for this type of area, day, and time. Return ONLY the JSON array, no other text.`,
        },
      ],
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    const validTypes = ["event", "road_closure", "police_activity", "construction", "weather_hazard", "other"];
    const validSeverities = ["low", "medium", "high"];

    const advisories: LocalAdvisory[] = parsed
      .filter((item: any) =>
        item &&
        typeof item === "object" &&
        typeof item.title === "string" &&
        typeof item.description === "string" &&
        typeof item.area === "string" &&
        validTypes.includes(item.type) &&
        validSeverities.includes(item.severity)
      )
      .map((item: any) => ({
        type: item.type,
        severity: item.severity,
        title: item.title.slice(0, 100),
        description: item.description.slice(0, 200),
        area: item.area.slice(0, 100),
      }));

    advisoryCache.set(cacheKey, { advisories, fetchedAt: Date.now() });
    if (advisoryCache.size > 50) {
      const keys = Array.from(advisoryCache.keys());
      advisoryCache.delete(keys[0]);
    }

    return advisories;
  } catch (err) {
    console.warn("Failed to fetch local advisories:", err);
    return [];
  }
}

function getWeatherSummary(
  current: HourlyWeatherPoint,
  conditionsChange: string | null,
  worstDuring: HourlyWeatherPoint | null,
) {
  const temp = current.temperatureF;
  const humidity = current.humidity;
  const wind = current.windSpeedMph;
  const uv = current.uvIndex;

  const heatIndex = temp + 0.5 * (temp - 61 + (temp - 68) * 0.012 * humidity);

  let recommendation = "Good conditions for running.";
  if (current.precipitationMm > 5) recommendation = "Active precipitation — consider waterproof gear or rescheduling.";
  else if (heatIndex > 105) recommendation = "Extreme heat — consider postponing or reducing intensity.";
  else if (heatIndex > 90) recommendation = "High heat index — stay hydrated and take breaks.";
  else if (temp < 32) recommendation = "Below freezing — wear layers and watch for ice.";
  else if (wind > 20) recommendation = "Strong winds — choose sheltered routes.";
  else if (uv > 8) recommendation = "Very high UV — apply sunscreen and seek shade.";
  else if (current.conditions === "Rain" || current.conditions === "Drizzle") recommendation = "Light rain expected — wear moisture-wicking layers.";
  else if (temp >= 60 && temp <= 75 && wind < 10) recommendation = "Ideal running conditions — enjoy your run!";

  if (conditionsChange) {
    recommendation += ` Heads up: ${conditionsChange}.`;
  }

  if (worstDuring && worstDuring.conditions !== current.conditions) {
    const worstDesc = worstDuring.conditions;
    if (["Thunderstorm", "Rain", "Rain Showers", "Snow"].includes(worstDesc) &&
        !["Thunderstorm", "Rain", "Rain Showers", "Snow"].includes(current.conditions)) {
      recommendation += ` ${worstDesc} may develop during your run — plan accordingly.`;
    }
  }

  return {
    temperatureF: temp,
    humidity,
    windSpeedMph: wind,
    uvIndex: uv,
    conditions: current.conditions,
    heatIndex: Math.round(heatIndex),
    recommendation,
  };
}

export async function generateRoutes(params: RouteParams) {
  const goal = params.trainingGoal;
  const numRoutes = 3;

  const [forecast, advisories] = await Promise.all([
    fetchWeatherForecast(params.startLat, params.startLng),
    fetchLocalAdvisories(params.startLat, params.startLng, params.timeOfDay),
  ]);

  const liveWeather = forecast.current;
  const effectiveTemp = params.temperatureF ?? liveWeather.temperatureF;
  const effectiveHumidity = params.humidity ?? liveWeather.humidity;
  const effectiveWind = params.windSpeedMph ?? liveWeather.windSpeedMph;
  const effectiveUV = params.uvIndex ?? liveWeather.uvIndex;

  const routePromises = Array.from({ length: numRoutes }, async (_, r) => {
    const numViaPoints = 6 + Math.floor(Math.random() * 4);
    const viaPoints = generateViaPoints(
      params.startLat,
      params.startLng,
      params.distanceMiles,
      numViaPoints,
      r
    );

    let routePoints: Array<{ lat: number; lng: number }>;
    let usedRoadRouting = false;

    const snappedPoints = await snapToRoads(viaPoints);
    if (snappedPoints && snappedPoints.length > 2) {
      routePoints = snappedPoints;
      usedRoadRouting = true;
    } else {
      routePoints = viaPoints;
    }

    const baseElevation = 100 + Math.random() * 500;
    const elevations = generateElevationProfile(routePoints.length, goal, baseElevation);

    const waypointsWithElevation = routePoints.map((wp, i) => ({
      ...wp,
      elevation: elevations[i],
      name: i === 0 ? "Start/Finish" : i === routePoints.length - 1 ? "Start/Finish" : undefined,
    }));

    let totalDistanceKm = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      totalDistanceKm += haversineDistance(
        routePoints[i].lat, routePoints[i].lng,
        routePoints[i + 1].lat, routePoints[i + 1].lng
      );
    }
    const totalDistanceMiles = totalDistanceKm / 1.60934;
    const displayDistance = usedRoadRouting ? Math.round(totalDistanceMiles * 100) / 100 : Math.round(params.distanceMiles * 100) / 100;

    const numSegments = routePoints.length - 1;
    const segments = [];
    let totalElevationGain = 0;
    let totalElevationLoss = 0;
    const surfaceCounts: Record<string, number> = {};
    const segmentDistance = displayDistance / numSegments;

    for (let i = 0; i < numSegments; i++) {
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

    const surfaceBreakdown: Record<string, number> = {};
    for (const [surface, count] of Object.entries(surfaceCounts)) {
      surfaceBreakdown[surface] = Math.round((count / numSegments) * 100);
    }

    const scoreBreakdown = computeScoreBreakdown(
      segments,
      goal,
      totalElevationGain,
      displayDistance,
      effectiveTemp
    );

    const avgPace = goal === "speed_workout" ? 7 + Math.random() * 2 : goal === "recovery" ? 10 + Math.random() * 2 : 8.5 + Math.random() * 2;
    const estimatedDuration = Math.round(displayDistance * avgPace);

    const runWindow = getWeatherForRunWindow(forecast, estimatedDuration);
    const worstWeather = runWindow.worst;

    let forecastPenalty = 0;
    if (worstWeather.conditions === "Thunderstorm") forecastPenalty += 30;
    else if (worstWeather.conditions === "Rain" || worstWeather.conditions === "Rain Showers") forecastPenalty += 10;
    else if (worstWeather.conditions === "Snow") forecastPenalty += 15;
    if (worstWeather.temperatureF > 100) forecastPenalty += 15;
    else if (worstWeather.temperatureF > 90) forecastPenalty += 8;
    if (worstWeather.temperatureF < 20) forecastPenalty += 12;
    if (worstWeather.windSpeedMph > 30) forecastPenalty += 12;
    else if (worstWeather.windSpeedMph > 20) forecastPenalty += 6;
    if (worstWeather.precipitationMm > 5) forecastPenalty += 10;

    const baseScore = Math.round(
      (scoreBreakdown.terrainMatch * 0.25 +
        scoreBreakdown.safetyScore * 0.20 +
        scoreBreakdown.environmentalFit * 0.15 +
        scoreBreakdown.trainingEffectiveness * 0.20 +
        scoreBreakdown.shadeScore * 0.10 +
        scoreBreakdown.trafficScore * 0.10)
    );

    const overallScore = Math.max(0, Math.min(100, baseScore - forecastPenalty));

    const names = ROUTE_NAMES[goal] || ROUTE_NAMES.general_fitness;
    const warnings: string[] = [];
    const highlights: string[] = [];

    const worstTemp = worstWeather.temperatureF;
    const worstWind = worstWeather.windSpeedMph;
    const worstPrecip = worstWeather.precipitationMm;
    const conditionsDuringRun = runWindow.conditionsChange;

    if (usedRoadRouting) highlights.push("Road-snapped pedestrian route");

    if (effectiveTemp > 90) warnings.push("High temperature at start — stay hydrated");
    if (effectiveTemp < 32) warnings.push("Below freezing at start — watch for ice");
    if (effectiveWind > 15) warnings.push(`Strong winds at start (${effectiveWind} mph) — expect resistance`);
    if (effectiveUV > 8) warnings.push("Very high UV index — wear sunscreen");
    if (liveWeather.precipitationMm > 0) warnings.push("Active precipitation — surfaces may be slippery");
    if (segments.some((s) => !s.lightingAvailable)) warnings.push("Some segments lack lighting");
    if (segments.some((s) => s.trafficLevel === "high")) warnings.push("Route includes high-traffic segments");

    if (conditionsDuringRun) {
      warnings.push(`Changing conditions: ${conditionsDuringRun}`);
    }

    if (runWindow.forecastLimited) {
      warnings.push(`Forecast only covers first ${forecast.hourly.length}h of your run — later conditions are unknown`);
    }

    if (worstTemp > effectiveTemp + 3 && worstTemp > 90) {
      warnings.push(`Temperature rising to ${worstTemp}°F during your run — plan hydration accordingly`);
    }
    if (worstTemp < effectiveTemp - 3 && worstTemp < 32) {
      warnings.push(`Temperature dropping to ${worstTemp}°F during your run — bring extra layers`);
    }
    if (worstWind > effectiveWind + 5 && worstWind > 15) {
      warnings.push(`Winds increasing to ${worstWind} mph mid-run — expect stronger resistance later`);
    }
    if (worstPrecip > 0 && liveWeather.precipitationMm === 0) {
      warnings.push(`Precipitation expected during your run (${worstWeather.conditions}) — pack a layer`);
    }

    const routeAdvisories = advisories.filter(() => {
      return Math.random() < 0.4 + r * 0.25;
    });

    for (const advisory of routeAdvisories) {
      const prefix = advisory.severity === "high" ? "⚠️ " : "";
      warnings.push(`${prefix}${advisory.title}: ${advisory.description} (near ${advisory.area})`);
    }

    if (totalElevationGain > 200) highlights.push(`${Math.round(totalElevationGain)}ft total elevation gain`);
    if (surfaceBreakdown.trail && surfaceBreakdown.trail > 40) highlights.push("Mostly trail running");
    if (scoreBreakdown.shadeScore > 60) highlights.push("Well-shaded route");
    if (scoreBreakdown.trafficScore > 70) highlights.push("Low traffic throughout");

    let notRecommended = false;
    let notRecommendedReason: string | undefined;
    let demotedByForecast = false;

    if (liveWeather.conditions === "Thunderstorm") {
      notRecommended = true;
      notRecommendedReason = "Active thunderstorm in the area";
    } else if (worstWeather.conditions === "Thunderstorm" && liveWeather.conditions !== "Thunderstorm") {
      notRecommended = true;
      notRecommendedReason = "Thunderstorm expected during your run";
      demotedByForecast = true;
    } else if (effectiveTemp > 105 || worstTemp > 105) {
      notRecommended = true;
      notRecommendedReason = worstTemp > effectiveTemp
        ? `Temperature rising to dangerous ${worstTemp}°F during your run`
        : "Dangerously high temperature";
      if (worstTemp > effectiveTemp) demotedByForecast = true;
    } else if (effectiveTemp < 10 || worstTemp < 10) {
      notRecommended = true;
      notRecommendedReason = worstTemp < effectiveTemp
        ? `Temperature dropping to ${worstTemp}°F during your run — frostbite risk`
        : "Extreme cold — risk of frostbite";
      if (worstTemp < effectiveTemp) demotedByForecast = true;
    } else if (effectiveWind > 35 || worstWind > 35) {
      notRecommended = true;
      notRecommendedReason = worstWind > effectiveWind
        ? `Winds intensifying to dangerous ${worstWind} mph during your run`
        : "Dangerous wind speeds";
      if (worstWind > effectiveWind) demotedByForecast = true;
    } else if (liveWeather.precipitationMm > 10 || worstPrecip > 10) {
      notRecommended = true;
      notRecommendedReason = worstPrecip > liveWeather.precipitationMm
        ? `Heavy precipitation (${worstWeather.conditions}) expected during your run`
        : "Heavy precipitation — poor visibility and slippery surfaces";
      if (worstPrecip > liveWeather.precipitationMm) demotedByForecast = true;
    }

    if (demotedByForecast) {
      warnings.push("⚠️ This route was ranked lower due to worsening conditions during the run");
    }

    const highSeverityAdvisories = routeAdvisories.filter(a => a.severity === "high");
    if (highSeverityAdvisories.length > 0 && !notRecommended) {
      notRecommended = true;
      notRecommendedReason = highSeverityAdvisories.map(a => a.title).join("; ");
    }

    if (overallScore < 35 && !notRecommended) {
      notRecommended = true;
      notRecommendedReason = "Low overall route quality score";
    }

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

    return {
      id: generateId(),
      name: names[r % names.length],
      description: (descriptions[goal] || descriptions.general_fitness)[r % 3],
      distanceMiles: displayDistance,
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
      notRecommended,
      notRecommendedReason,
    };
  });

  const resolvedRoutes = await Promise.all(routePromises);
  resolvedRoutes.sort((a, b) => b.overallScore - a.overallScore);

  const avgDuration = resolvedRoutes.reduce((s, r) => s + r.estimatedDurationMinutes, 0) / resolvedRoutes.length;
  const overallRunWindow = getWeatherForRunWindow(forecast, avgDuration);

  const weatherSummary = getWeatherSummary(
    forecast.current,
    overallRunWindow.conditionsChange,
    overallRunWindow.worst,
  );

  if (advisories.length > 0) {
    const advisorySummary = advisories.map(a => `${a.title} (${a.area})`).join(", ");
    weatherSummary.recommendation += ` Local advisories: ${advisorySummary}.`;
  }

  return {
    routes: resolvedRoutes,
    weatherSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function getScoringFactors() {
  return {
    goals: GOAL_WEIGHTS,
  };
}
