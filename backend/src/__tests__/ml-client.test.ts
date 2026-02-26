/**
 * ML Client Integration Tests
 * Tests gRPC client functionality against ML engine
 */
import { describe, test, expect } from "bun:test";
import { checkMLHealth, generateQuoteML, getMLClientStatus } from "../services/ml-client";

describe("ML Client", () => {
  test("getMLClientStatus returns connection info", () => {
    const status = getMLClientStatus();
    expect(status).toHaveProperty("connected");
    expect(status).toHaveProperty("host");
    expect(status).toHaveProperty("port");
    expect(typeof status.host).toBe("string");
    expect(typeof status.port).toBe("string");
  });

  test("checkMLHealth returns health status", async () => {
    const health = await checkMLHealth();
    expect(health).toHaveProperty("healthy");
    expect(typeof health.healthy).toBe("boolean");
    // Note: healthy may be false if ML engine not running
  });

  test("generateQuoteML handles disconnected state gracefully", async () => {
    // If ML engine not running, should gracefully return null
    const result = await generateQuoteML({
      event_type: "corporate",
      location_zip: "90210",
      num_guards: 2,
      hours: 8,
      event_date: new Date(),
      is_armed: false,
      requires_vehicle: false,
      crowd_size: 100,
    });

    // Result is null if ML engine unavailable, or a valid response if running
    if (result !== null) {
      expect(typeof result.final_price).toBe("number");
      expect(typeof result.risk_level).toBe("string");
      expect(["low", "medium", "high", "critical"]).toContain(result.risk_level);
      expect(result.breakdown).toHaveProperty("model_used");
    }
    // null is acceptable when ML engine not running
  });

  test("generateQuoteML validates response structure when connected", async () => {
    const result = await generateQuoteML({
      event_type: "concert",
      location_zip: "10001",
      num_guards: 5,
      hours: 6,
      event_date: new Date(),
      is_armed: true,
      requires_vehicle: true,
      crowd_size: 1000,
    });

    if (result !== null) {
      // Validate full response structure
      expect(result.base_price).toBeGreaterThanOrEqual(0);
      expect(result.risk_multiplier).toBeGreaterThanOrEqual(1);
      expect(result.final_price).toBeGreaterThan(0);
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.breakdown.risk_factors)).toBe(true);
    }
  });
});
