/**
 * Demo Mode Service
 * 
 * Provides realistic mock data for SDPS showcase and demos.
 * Enable with DEMO_MODE=true environment variable.
 * 
 * Features:
 * - Mock clients with realistic company names
 * - Pre-computed quote scenarios with impressive ML results
 * - Deterministic responses for predictable demos
 * - No external dependencies (DB, ML engine, etc.)
 */

export const DEMO_MODE = process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";

if (DEMO_MODE) {
  console.log("🎭 DEMO MODE ENABLED — Using mock data for all responses");
}

// =============================================================================
// Demo Companies (realistic security client profiles)
// =============================================================================

export interface DemoClient {
  id: number;
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  email: string;
  phone: string;
  industry: string;
  location: { city: string; state: string; zip: string };
}

export const DEMO_CLIENTS: DemoClient[] = [
  {
    id: 1001,
    company_name: "Stellar Entertainment Group",
    contact_first_name: "Marcus",
    contact_last_name: "Chen",
    email: "m.chen@stellarentertainment.com",
    phone: "(310) 555-0142",
    industry: "Entertainment",
    location: { city: "Los Angeles", state: "CA", zip: "90028" },
  },
  {
    id: 1002,
    company_name: "Apex Technology Solutions",
    contact_first_name: "Sarah",
    contact_last_name: "Rodriguez",
    email: "srodriguez@apextech.io",
    phone: "(415) 555-0198",
    industry: "Technology",
    location: { city: "San Francisco", state: "CA", zip: "94105" },
  },
  {
    id: 1003,
    company_name: "Metropolitan Events Co.",
    contact_first_name: "James",
    contact_last_name: "Williams",
    email: "jwilliams@metroevents.com",
    phone: "(212) 555-0167",
    industry: "Event Management",
    location: { city: "New York", state: "NY", zip: "10001" },
  },
  {
    id: 1004,
    company_name: "Pinnacle Real Estate Group",
    contact_first_name: "Amanda",
    contact_last_name: "Foster",
    email: "afoster@pinnaclereg.com",
    phone: "(305) 555-0134",
    industry: "Real Estate",
    location: { city: "Miami", state: "FL", zip: "33131" },
  },
  {
    id: 1005,
    company_name: "Vector Sports Management",
    contact_first_name: "David",
    contact_last_name: "Park",
    email: "d.park@vectorsports.com",
    phone: "(312) 555-0189",
    industry: "Sports",
    location: { city: "Chicago", state: "IL", zip: "60601" },
  },
  {
    id: 1006,
    company_name: "Horizon Healthcare Systems",
    contact_first_name: "Lisa",
    contact_last_name: "Thompson",
    email: "lthompson@horizonhealth.org",
    phone: "(617) 555-0156",
    industry: "Healthcare",
    location: { city: "Boston", state: "MA", zip: "02108" },
  },
];

// =============================================================================
// Demo Locations (high-value venues)
// =============================================================================

export const DEMO_LOCATIONS = [
  { zip: "90028", city: "Hollywood", state: "CA", risk_zone: "high", multiplier: 1.25 },
  { zip: "90210", city: "Beverly Hills", state: "CA", risk_zone: "premium", multiplier: 1.35 },
  { zip: "94105", city: "San Francisco", state: "CA", risk_zone: "high", multiplier: 1.20 },
  { zip: "10001", city: "Manhattan", state: "NY", risk_zone: "high", multiplier: 1.30 },
  { zip: "33131", city: "Miami", state: "FL", risk_zone: "medium", multiplier: 1.15 },
  { zip: "60601", city: "Chicago", state: "IL", risk_zone: "high", multiplier: 1.20 },
  { zip: "02108", city: "Boston", state: "MA", risk_zone: "medium", multiplier: 1.10 },
  { zip: "98101", city: "Seattle", state: "WA", risk_zone: "medium", multiplier: 1.10 },
  { zip: "30301", city: "Atlanta", state: "GA", risk_zone: "medium", multiplier: 1.12 },
  { zip: "75201", city: "Dallas", state: "TX", risk_zone: "medium", multiplier: 1.08 },
];

// =============================================================================
// Demo Event Types
// =============================================================================

export const DEMO_EVENT_TYPES = [
  { code: "concert", name: "Concert / Festival", base_rate: 45, risk_weight: 0.70 },
  { code: "corporate", name: "Corporate Event", base_rate: 35, risk_weight: 0.20 },
  { code: "sports", name: "Sporting Event", base_rate: 42, risk_weight: 0.60 },
  { code: "vip_protection", name: "VIP Protection", base_rate: 85, risk_weight: 0.45 },
  { code: "tech_summit", name: "Tech Summit", base_rate: 40, risk_weight: 0.25 },
  { code: "music_festival", name: "Music Festival", base_rate: 50, risk_weight: 0.75 },
  { code: "social_wedding", name: "Wedding / Social", base_rate: 32, risk_weight: 0.15 },
  { code: "retail_lp", name: "Retail Loss Prevention", base_rate: 28, risk_weight: 0.35 },
];

// =============================================================================
// Demo Quote Scenarios (pre-computed impressive results)
// =============================================================================

export interface DemoQuoteScenario {
  id: string;
  name: string;
  input: {
    event_type: string;
    location_zip: string;
    num_guards: number;
    hours: number;
    crowd_size: number;
    is_armed: boolean;
    requires_vehicle: boolean;
  };
  result: {
    base_price: number;
    final_price: number;
    risk_level: "low" | "medium" | "high" | "critical";
    risk_score: number;
    confidence_score: number;
    acceptance_probability: number;
  };
}

export const DEMO_SCENARIOS: DemoQuoteScenario[] = [
  {
    id: "demo-concert-la",
    name: "Major Concert - Los Angeles",
    input: {
      event_type: "concert",
      location_zip: "90028",
      num_guards: 12,
      hours: 8,
      crowd_size: 5000,
      is_armed: true,
      requires_vehicle: true,
    },
    result: {
      base_price: 4320,
      final_price: 8547.60,
      risk_level: "high",
      risk_score: 0.72,
      confidence_score: 0.94,
      acceptance_probability: 0.87,
    },
  },
  {
    id: "demo-corporate-sf",
    name: "Tech Company Annual Meeting",
    input: {
      event_type: "corporate",
      location_zip: "94105",
      num_guards: 4,
      hours: 6,
      crowd_size: 500,
      is_armed: false,
      requires_vehicle: false,
    },
    result: {
      base_price: 840,
      final_price: 1108.80,
      risk_level: "low",
      risk_score: 0.18,
      confidence_score: 0.96,
      acceptance_probability: 0.94,
    },
  },
  {
    id: "demo-vip-beverly",
    name: "Celebrity Event - Beverly Hills",
    input: {
      event_type: "vip_protection",
      location_zip: "90210",
      num_guards: 6,
      hours: 5,
      crowd_size: 200,
      is_armed: true,
      requires_vehicle: true,
    },
    result: {
      base_price: 2550,
      final_price: 4207.50,
      risk_level: "medium",
      risk_score: 0.42,
      confidence_score: 0.91,
      acceptance_probability: 0.89,
    },
  },
  {
    id: "demo-festival-miami",
    name: "Beach Music Festival - Miami",
    input: {
      event_type: "music_festival",
      location_zip: "33131",
      num_guards: 20,
      hours: 12,
      crowd_size: 15000,
      is_armed: true,
      requires_vehicle: true,
    },
    result: {
      base_price: 12000,
      final_price: 24840.00,
      risk_level: "critical",
      risk_score: 0.85,
      confidence_score: 0.89,
      acceptance_probability: 0.78,
    },
  },
  {
    id: "demo-sports-chicago",
    name: "Professional Basketball Game",
    input: {
      event_type: "sports",
      location_zip: "60601",
      num_guards: 15,
      hours: 6,
      crowd_size: 20000,
      is_armed: true,
      requires_vehicle: true,
    },
    result: {
      base_price: 3780,
      final_price: 8316.00,
      risk_level: "high",
      risk_score: 0.68,
      confidence_score: 0.93,
      acceptance_probability: 0.82,
    },
  },
];

// =============================================================================
// Demo Quote History (recent activity)
// =============================================================================

export interface DemoQuote {
  id: number;
  quote_number: string;
  client: DemoClient;
  event_type: string;
  event_name: string;
  event_date: string;
  location: string;
  num_guards: number;
  hours: number;
  total_price: number;
  status: "draft" | "pending" | "sent" | "accepted" | "rejected";
  risk_level: "low" | "medium" | "high" | "critical";
  created_at: string;
}

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_QUOTES: DemoQuote[] = [
  {
    id: 5001,
    quote_number: "GQ-2026-0147",
    client: DEMO_CLIENTS[0],
    event_type: "concert",
    event_name: "Summer Music Festival",
    event_date: daysAgo(-14), // 2 weeks from now
    location: "Los Angeles, CA",
    num_guards: 12,
    hours: 8,
    total_price: 8547.60,
    status: "accepted",
    risk_level: "high",
    created_at: daysAgo(3),
  },
  {
    id: 5002,
    quote_number: "GQ-2026-0148",
    client: DEMO_CLIENTS[1],
    event_type: "corporate",
    event_name: "Annual Developer Conference",
    event_date: daysAgo(-7),
    location: "San Francisco, CA",
    num_guards: 6,
    hours: 10,
    total_price: 2520.00,
    status: "sent",
    risk_level: "low",
    created_at: daysAgo(2),
  },
  {
    id: 5003,
    quote_number: "GQ-2026-0149",
    client: DEMO_CLIENTS[2],
    event_type: "vip_protection",
    event_name: "Award Show After-Party",
    event_date: daysAgo(-21),
    location: "New York, NY",
    num_guards: 8,
    hours: 6,
    total_price: 5280.00,
    status: "pending",
    risk_level: "medium",
    created_at: daysAgo(1),
  },
  {
    id: 5004,
    quote_number: "GQ-2026-0150",
    client: DEMO_CLIENTS[3],
    event_type: "social_wedding",
    event_name: "Luxury Beach Wedding",
    event_date: daysAgo(-30),
    location: "Miami, FL",
    num_guards: 4,
    hours: 8,
    total_price: 1344.00,
    status: "accepted",
    risk_level: "low",
    created_at: daysAgo(5),
  },
  {
    id: 5005,
    quote_number: "GQ-2026-0151",
    client: DEMO_CLIENTS[4],
    event_type: "sports",
    event_name: "Championship Basketball Game",
    event_date: daysAgo(-10),
    location: "Chicago, IL",
    num_guards: 15,
    hours: 6,
    total_price: 8316.00,
    status: "accepted",
    risk_level: "high",
    created_at: daysAgo(7),
  },
];

// =============================================================================
// Demo Stats (dashboard metrics)
// =============================================================================

export const DEMO_STATS = {
  totalQuotes: 147,
  totalRevenue: 487250,
  totalClients: 42,
  totalUsers: 8,
  quotesThisMonth: 23,
  revenueThisMonth: 68450,
  acceptanceRate: 0.87,
  avgQuoteValue: 3315,
  topEventTypes: [
    { type: "Corporate Events", count: 45, revenue: 142500 },
    { type: "Concerts & Festivals", count: 28, revenue: 198400 },
    { type: "VIP Protection", count: 19, revenue: 89250 },
    { type: "Sports Events", count: 15, revenue: 57100 },
  ],
};

// =============================================================================
// Demo ML Model Info
// =============================================================================

export const DEMO_ML_MODEL = {
  model_name: "GuardQuote ML v2.1",
  model_type: "hybrid_ensemble",
  version: "2.1.0",
  status: "active",
  accuracy_metrics: {
    r2_score: 0.923,
    mae: 127.45,
    mape: 0.042,
  },
  training_info: {
    last_trained: daysAgo(2),
    training_samples: 12847,
    validation_samples: 3212,
    training_duration_sec: 342,
  },
  feature_importance: [
    { feature: "crowd_size", importance: 0.28 },
    { feature: "event_type", importance: 0.22 },
    { feature: "location_risk", importance: 0.18 },
    { feature: "num_guards", importance: 0.15 },
    { feature: "is_armed", importance: 0.09 },
    { feature: "time_factors", importance: 0.08 },
  ],
  sources: [
    { name: "Trained Model (XGBoost)", weight: 0.60, status: "active" },
    { name: "Crime Statistics API", weight: 0.25, status: "active" },
    { name: "Rule Engine", weight: 0.15, status: "active" },
  ],
};

// =============================================================================
// Demo Quote Calculator (deterministic results)
// =============================================================================

export interface DemoQuoteInput {
  event_type: string;
  location_zip: string;
  num_guards: number;
  hours: number;
  crowd_size?: number;
  is_armed?: boolean;
  requires_vehicle?: boolean;
}

export function calculateDemoQuote(input: DemoQuoteInput) {
  // Find matching scenario or calculate based on inputs
  const scenario = DEMO_SCENARIOS.find(
    (s) => s.input.event_type === input.event_type && s.input.location_zip === input.location_zip
  );

  if (scenario) {
    // Scale based on actual guards/hours vs scenario
    const guardRatio = input.num_guards / scenario.input.num_guards;
    const hourRatio = input.hours / scenario.input.hours;
    const scale = (guardRatio + hourRatio) / 2;

    return {
      ...scenario.result,
      base_price: Math.round(scenario.result.base_price * scale * 100) / 100,
      final_price: Math.round(scenario.result.final_price * scale * 100) / 100,
    };
  }

  // Generate plausible result for unknown scenarios
  const eventType = DEMO_EVENT_TYPES.find((e) => e.code === input.event_type) || DEMO_EVENT_TYPES[1];
  const location = DEMO_LOCATIONS.find((l) => l.zip === input.location_zip) || DEMO_LOCATIONS[0];

  const baseRate = eventType.base_rate;
  const guardHours = input.num_guards * input.hours;
  const basePrice = guardHours * baseRate;

  // Calculate risk
  let riskScore = eventType.risk_weight;
  if (input.crowd_size && input.crowd_size > 1000) riskScore += 0.15;
  if (input.is_armed) riskScore += 0.05;
  if (location.risk_zone === "high" || location.risk_zone === "premium") riskScore += 0.1;
  riskScore = Math.min(0.95, riskScore);

  const riskMultiplier = 1 + riskScore * 0.8;
  const finalPrice = Math.round(basePrice * location.multiplier * riskMultiplier * 100) / 100;

  const riskLevel: "low" | "medium" | "high" | "critical" =
    riskScore >= 0.75 ? "critical" : riskScore >= 0.5 ? "high" : riskScore >= 0.25 ? "medium" : "low";

  return {
    base_price: Math.round(basePrice * 100) / 100,
    final_price: finalPrice,
    risk_level: riskLevel,
    risk_score: Math.round(riskScore * 100) / 100,
    confidence_score: 0.91 + Math.random() * 0.05,
    acceptance_probability: 0.82 + Math.random() * 0.1,
  };
}

// =============================================================================
// Demo User for Admin Access
// =============================================================================

export const DEMO_ADMIN_USER = {
  id: 9999,
  email: "demo@guardquote.com",
  firstName: "Demo",
  lastName: "Admin",
  role: "admin",
};

export const DEMO_USERS = [
  { id: 9999, email: "demo@guardquote.com", firstName: "Demo", lastName: "Admin", role: "admin", is_active: true },
  { id: 9998, email: "manager@guardquote.com", firstName: "Sarah", lastName: "Manager", role: "manager", is_active: true },
  { id: 9997, email: "user@guardquote.com", firstName: "John", lastName: "User", role: "user", is_active: true },
];

// =============================================================================
// Demo Mode Middleware Helper
// =============================================================================

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

export function getDemoResponse<T>(demoData: T, realDataFn: () => Promise<T>): Promise<T> {
  if (DEMO_MODE) {
    return Promise.resolve(demoData);
  }
  return realDataFn();
}
