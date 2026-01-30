/**
 * Seed Training Data for ML Model
 * Based on industry research:
 * - Security guard rates: $25-$100/hr depending on type
 * - Staffing ratios: 1:50-100 standard, 1:25-50 high-risk events
 * - Premium factors: armed (+$15/hr), vehicle (+$50), night shift (+20%), weekend (+15%)
 *
 * Sources:
 * - PayScale Security Guard Hourly Pay
 * - CALSAGA Security Staffing Guidelines
 * - BO Security Guard Costs 2025
 */

import postgres from "postgres";

const sql = postgres("postgres://guardquote:WPU8bj3nbwFyZFEtHZQz@192.168.2.70/guardquote", {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Industry-based pricing data
const BASE_RATES: Record<string, { min: number; max: number; riskMultiplier: number }> = {
  CONCERT: { min: 35, max: 55, riskMultiplier: 1.3 },
  SPORT: { min: 32, max: 50, riskMultiplier: 1.2 },
  CORPORATE: { min: 28, max: 42, riskMultiplier: 1.0 },
  WEDDING: { min: 30, max: 45, riskMultiplier: 0.9 },
  FESTIVAL: { min: 38, max: 55, riskMultiplier: 1.4 },
  NIGHTCLUB: { min: 40, max: 65, riskMultiplier: 1.5 },
  RETAIL: { min: 25, max: 38, riskMultiplier: 1.1 },
  EXECUTIVE: { min: 55, max: 100, riskMultiplier: 1.6 },
};

// California locations with risk data
const LOCATIONS = [
  { zip: "90001", city: "Los Angeles", state: "CA", riskZone: "high", modifier: 1.3 },
  { zip: "90210", city: "Beverly Hills", state: "CA", riskZone: "premium", modifier: 1.5 },
  { zip: "91001", city: "Pasadena", state: "CA", riskZone: "standard", modifier: 1.0 },
  { zip: "91301", city: "Westlake Village", state: "CA", riskZone: "low", modifier: 0.9 },
  { zip: "91324", city: "Northridge", state: "CA", riskZone: "standard", modifier: 1.0 },
  { zip: "90401", city: "Santa Monica", state: "CA", riskZone: "premium", modifier: 1.4 },
  { zip: "91101", city: "Pasadena Downtown", state: "CA", riskZone: "standard", modifier: 1.05 },
  { zip: "90028", city: "Hollywood", state: "CA", riskZone: "high", modifier: 1.35 },
  { zip: "90802", city: "Long Beach", state: "CA", riskZone: "standard", modifier: 1.1 },
  { zip: "92101", city: "San Diego Downtown", state: "CA", riskZone: "standard", modifier: 1.15 },
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate realistic quote based on industry data
function generateRealisticQuote() {
  const eventTypeCode = randomChoice(Object.keys(BASE_RATES));
  const location = randomChoice(LOCATIONS);
  const rateData = BASE_RATES[eventTypeCode];

  // Crowd size varies by event type (industry standard ratios)
  let crowdSize: number;
  switch (eventTypeCode) {
    case "CONCERT":
      crowdSize = randomInt(500, 10000);
      break;
    case "FESTIVAL":
      crowdSize = randomInt(1000, 25000);
      break;
    case "SPORT":
      crowdSize = randomInt(1000, 50000);
      break;
    case "NIGHTCLUB":
      crowdSize = randomInt(100, 800);
      break;
    case "CORPORATE":
      crowdSize = randomInt(50, 500);
      break;
    case "WEDDING":
      crowdSize = randomInt(50, 300);
      break;
    case "RETAIL":
      crowdSize = randomInt(0, 200);
      break;
    case "EXECUTIVE":
      crowdSize = randomInt(1, 10);
      break;
    default:
      crowdSize = randomInt(50, 500);
  }

  // Calculate guards needed based on industry ratios
  // Standard: 1:100, High-risk: 1:50, Very high-risk: 1:25
  let guardsPerAttendee: number;
  if (["CONCERT", "FESTIVAL", "NIGHTCLUB"].includes(eventTypeCode)) {
    guardsPerAttendee = randomFloat(25, 75); // High-risk events
  } else if (["SPORT"].includes(eventTypeCode)) {
    guardsPerAttendee = randomFloat(50, 100);
  } else {
    guardsPerAttendee = randomFloat(75, 150); // Standard events
  }

  const numGuards = Math.max(1, Math.ceil(crowdSize / guardsPerAttendee));
  const hoursPerGuard = randomChoice([4, 6, 8, 10, 12]);
  const totalGuardHours = numGuards * hoursPerGuard;

  // Time factors
  const dayOfWeek = randomInt(0, 6);
  const hourOfDay = randomInt(0, 23);
  const month = randomInt(1, 12);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isNightShift = hourOfDay >= 18 || hourOfDay < 6;

  // Armed guards more likely for high-risk events
  const armedProbability = ["CONCERT", "NIGHTCLUB", "EXECUTIVE", "FESTIVAL"].includes(eventTypeCode)
    ? 0.6
    : 0.2;
  const isArmed = randomBool(armedProbability);

  // Vehicle patrol more likely for larger venues
  const vehicleProbability = crowdSize > 1000 ? 0.5 : crowdSize > 500 ? 0.3 : 0.1;
  const hasVehicle = randomBool(vehicleProbability);

  // Calculate price based on industry research
  const baseRate = randomFloat(rateData.min, rateData.max);
  let laborCost = totalGuardHours * baseRate;

  // Apply premiums (industry standard)
  if (isArmed) laborCost += 15 * totalGuardHours; // +$15/hr for armed
  if (hasVehicle) laborCost += 50 * numGuards; // +$50 per guard with vehicle

  // Apply multipliers
  const weekendMultiplier = isWeekend ? 1.15 : 1.0;
  const nightMultiplier = isNightShift ? 1.2 : 1.0;
  const locationMultiplier = location.modifier;
  const eventMultiplier = rateData.riskMultiplier;

  const finalPrice =
    Math.round(
      laborCost * weekendMultiplier * nightMultiplier * locationMultiplier * eventMultiplier * 100
    ) / 100;

  // Risk score based on all factors
  let riskScore = 30;
  riskScore += (eventMultiplier - 1) * 40;
  riskScore += (locationMultiplier - 1) * 20;
  riskScore += isNightShift ? 10 : 0;
  riskScore += isWeekend ? 5 : 0;
  riskScore += crowdSize > 5000 ? 15 : crowdSize > 1000 ? 10 : crowdSize > 500 ? 5 : 0;
  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

  // Acceptance probability based on price reasonableness
  // Higher prices relative to market have lower acceptance
  const marketAverage = totalGuardHours * 40; // $40/hr industry average
  const priceRatio = finalPrice / marketAverage;
  const acceptanceProbability = priceRatio > 1.5 ? 0.4 : priceRatio > 1.2 ? 0.65 : 0.85;
  const wasAccepted = randomBool(acceptanceProbability);

  return {
    eventTypeCode,
    zipCode: location.zip,
    state: location.state,
    riskZone: location.riskZone,
    numGuards,
    hoursPerGuard,
    totalGuardHours,
    crowdSize,
    dayOfWeek,
    hourOfDay,
    month,
    isWeekend,
    isNightShift,
    isArmed,
    hasVehicle,
    finalPrice,
    riskScore,
    wasAccepted,
  };
}

async function seedData(count: number) {
  console.log(`Generating ${count} training data samples...`);

  // First, add more locations if needed
  for (const loc of LOCATIONS) {
    await sql`
      INSERT INTO locations (zip_code, city, state, risk_zone, rate_modifier)
      VALUES (${loc.zip}, ${loc.city}, ${loc.state}, ${loc.riskZone}, ${loc.modifier})
      ON CONFLICT (zip_code) DO NOTHING
    `;
  }
  console.log("Locations updated.");

  // Generate and insert training data
  let inserted = 0;
  for (let i = 0; i < count; i++) {
    const data = generateRealisticQuote();

    try {
      await sql`
        INSERT INTO ml_training_data (
          event_type_code, zip_code, state, risk_zone,
          num_guards, hours_per_guard, total_guard_hours, crowd_size,
          day_of_week, hour_of_day, month, is_weekend, is_night_shift,
          is_armed, has_vehicle, final_price, risk_score, was_accepted
        ) VALUES (
          ${data.eventTypeCode}, ${data.zipCode}, ${data.state}, ${data.riskZone},
          ${data.numGuards}, ${data.hoursPerGuard}, ${data.totalGuardHours}, ${data.crowdSize},
          ${data.dayOfWeek}, ${data.hourOfDay}, ${data.month}, ${data.isWeekend}, ${data.isNightShift},
          ${data.isArmed}, ${data.hasVehicle}, ${data.finalPrice}, ${data.riskScore}, ${data.wasAccepted}
        )
      `;
      inserted++;

      if (inserted % 50 === 0) {
        console.log(`Inserted ${inserted}/${count} records...`);
      }
    } catch (error: any) {
      console.error(`Error inserting record ${i}:`, error.message);
    }
  }

  console.log(`\nCompleted! Inserted ${inserted} training data records.`);

  // Show summary stats
  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT event_type_code) as event_types,
      COUNT(DISTINCT zip_code) as locations,
      AVG(final_price)::numeric(10,2) as avg_price,
      MIN(final_price)::numeric(10,2) as min_price,
      MAX(final_price)::numeric(10,2) as max_price,
      AVG(risk_score)::numeric(5,2) as avg_risk,
      (SUM(CASE WHEN was_accepted THEN 1 ELSE 0 END)::float / COUNT(*) * 100)::numeric(5,2) as acceptance_rate
    FROM ml_training_data
  `;

  console.log("\n=== Training Data Summary ===");
  console.log(`Total samples: ${stats[0].total}`);
  console.log(`Event types covered: ${stats[0].event_types}`);
  console.log(`Locations covered: ${stats[0].locations}`);
  console.log(`Price range: $${stats[0].min_price} - $${stats[0].max_price}`);
  console.log(`Average price: $${stats[0].avg_price}`);
  console.log(`Average risk score: ${stats[0].avg_risk}`);
  console.log(`Acceptance rate: ${stats[0].acceptance_rate}%`);

  await sql.end();
}

// Run seeding
const count = parseInt(process.argv[2], 10) || 500;
seedData(count).catch(console.error);
