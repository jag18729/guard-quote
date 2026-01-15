import { useState } from "react";
import { useForm } from "react-hook-form";
import { mlApi, MLQuoteResponse, RiskAssessmentResponse } from "../services/api";
import { useServiceStatus } from "../context/ServiceStatusContext";
import styles from "./SecurityQuote.module.css";

const EVENT_TYPES = [
  { value: "corporate", label: "Corporate Event", baseRate: 35 },
  { value: "concert", label: "Concert / Festival", baseRate: 45 },
  { value: "sports", label: "Sporting Event", baseRate: 42 },
  { value: "private", label: "Private Event", baseRate: 30 },
  { value: "construction", label: "Construction Site", baseRate: 32 },
  { value: "retail", label: "Retail Security", baseRate: 28 },
  { value: "residential", label: "Residential", baseRate: 25 },
];

type FormData = {
  eventType: string;
  locationZip: string;
  numGuards: number;
  hours: number;
  eventDate: string;
  eventTime: string;
  crowdSize: number;
  isArmed: boolean;
  requiresVehicle: boolean;
};

// Demo mode mock prediction
function generateDemoQuote(data: FormData): { quote: MLQuoteResponse; risk: RiskAssessmentResponse } {
  const eventType = EVENT_TYPES.find(e => e.value === data.eventType) || EVENT_TYPES[0];
  const baseRate = eventType.baseRate;

  let subtotal = baseRate * data.hours * data.numGuards;
  if (data.isArmed) subtotal += 15 * data.hours * data.numGuards;
  if (data.requiresVehicle) subtotal += 50 * data.numGuards;

  const riskScore = data.crowdSize > 1000 ? 0.75 :
                    data.crowdSize > 500 ? 0.5 :
                    ["concert", "sports"].includes(data.eventType) ? 0.45 : 0.3;

  const riskLevel = riskScore >= 0.75 ? "critical" :
                    riskScore >= 0.5 ? "high" :
                    riskScore >= 0.25 ? "medium" : "low";

  const factors: string[] = [];
  if (["concert", "sports"].includes(data.eventType)) factors.push(`High-activity event: ${data.eventType}`);
  if (data.crowdSize > 500) factors.push(`Large crowd: ${data.crowdSize.toLocaleString()} people`);
  if (data.isArmed) factors.push("Armed security requested");
  if (!factors.length) factors.push("Standard risk profile");

  const recommendations: string[] = [];
  if (riskScore >= 0.5) recommendations.push("Consider additional guards");
  if (data.crowdSize > 500 && !data.isArmed) recommendations.push("Armed security recommended for large crowds");
  if (!recommendations.length) recommendations.push("Standard protocols apply");

  return {
    quote: {
      base_price: subtotal / 1.0875,
      risk_multiplier: 1 + riskScore * 0.5,
      final_price: Math.round(subtotal * (1 + riskScore * 0.3) * 100) / 100,
      risk_level: riskLevel as "low" | "medium" | "high" | "critical",
      confidence_score: 0.75,
      breakdown: {
        model_used: "Demo Mode (Offline)",
        risk_factors: factors,
        num_guards: data.numGuards,
        hours: data.hours,
        is_armed: data.isArmed,
        has_vehicle: data.requiresVehicle,
      },
    },
    risk: {
      risk_level: riskLevel as "low" | "medium" | "high" | "critical",
      risk_score: riskScore,
      factors,
      recommendations,
    },
  };
}

export default function SecurityQuote() {
  const { status } = useServiceStatus();
  const [quote, setQuote] = useState<MLQuoteResponse | null>(null);
  const [risk, setRisk] = useState<RiskAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Get default date (tomorrow) and time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];
  const defaultTime = "14:00";

  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      eventType: "corporate",
      locationZip: "90001",
      numGuards: 2,
      hours: 4,
      eventDate: defaultDate,
      eventTime: defaultTime,
      crowdSize: 100,
      isArmed: false,
      requiresVehicle: false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setIsDemo(false);

    // Try ML engine first, fall back to demo mode
    if (status.mlEngine === "online") {
      try {
        const eventDateTime = `${data.eventDate}T${data.eventTime}:00`;

        const [quoteResult, riskResult] = await Promise.all([
          mlApi.getQuotePrediction({
            eventType: data.eventType,
            locationZip: data.locationZip,
            numGuards: data.numGuards,
            hours: data.hours,
            eventDate: eventDateTime,
            crowdSize: data.crowdSize,
            isArmed: data.isArmed,
            requiresVehicle: data.requiresVehicle,
          }),
          mlApi.getRiskAssessment({
            eventType: data.eventType,
            locationZip: data.locationZip,
            numGuards: data.numGuards,
            hours: data.hours,
            eventDate: eventDateTime,
            crowdSize: data.crowdSize,
            isArmed: data.isArmed,
            requiresVehicle: data.requiresVehicle,
          }),
        ]);

        // Validate response has required fields
        if (quoteResult?.final_price !== undefined && riskResult?.risk_level) {
          setQuote(quoteResult);
          setRisk(riskResult);
          setLoading(false);
          return;
        }
        console.error("Invalid ML response, falling back to demo");
      } catch (err) {
        console.error("ML engine error, falling back to demo:", err);
      }
    }

    // Demo mode fallback
    const demo = generateDemoQuote(data);
    setQuote(demo.quote);
    setRisk(demo.risk);
    setIsDemo(true);
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "#4caf50";
      case "medium": return "#ff9800";
      case "high": return "#f44336";
      case "critical": return "#9c27b0";
      default: return "#666";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formSection}>
        <h1 className={styles.title}>Security Guard Quote</h1>
        <p className={styles.subtitle}>
          {status.mlEngine === "online"
            ? "Get an ML-powered price estimate for your security needs"
            : "Demo Mode — estimates are rule-based approximations"}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.field}>
            <label>Event Type</label>
            <select {...register("eventType")}>
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Location (ZIP)</label>
              <input
                type="text"
                maxLength={5}
                {...register("locationZip")}
              />
            </div>
            <div className={styles.field}>
              <label>Expected Crowd</label>
              <input
                type="number"
                min={0}
                {...register("crowdSize", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Number of Guards</label>
              <input
                type="number"
                min={1}
                max={50}
                {...register("numGuards", { valueAsNumber: true })}
              />
            </div>
            <div className={styles.field}>
              <label>Hours Needed</label>
              <input
                type="number"
                min={1}
                max={24}
                step={0.5}
                {...register("hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Event Date</label>
              <input type="date" {...register("eventDate")} />
            </div>
            <div className={styles.field}>
              <label>Start Time</label>
              <input type="time" {...register("eventTime")} />
            </div>
          </div>

          <div className={styles.checkboxRow}>
            <label className={styles.checkbox}>
              <input type="checkbox" {...register("isArmed")} />
              <span>Armed Guards (+$15/hr per guard)</span>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" {...register("requiresVehicle")} />
              <span>Vehicle Patrol (+$50/guard)</span>
            </label>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Calculating..." : "Get ML Quote"}
          </button>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>

      {quote?.final_price !== undefined && (
        <div className={styles.resultSection}>
          <div className={styles.quoteCard}>
            <h2>Price Estimate</h2>
            <div className={styles.priceMain}>
              ${quote.final_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={styles.priceDetails}>
              <div>
                <span>Base Price</span>
                <span>${(quote.base_price ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span>Risk Multiplier</span>
                <span>{(quote.risk_multiplier ?? 1).toFixed(2)}x</span>
              </div>
              <div>
                <span>Confidence</span>
                <span>{((quote.confidence_score ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className={`${styles.modelBadge} ${isDemo ? styles.demoBadge : ""}`}>
              {isDemo ? "Demo Mode" : `Powered by ${quote.breakdown?.model_used ?? "ML Engine"}`}
            </div>
          </div>

          {risk && (
            <div className={styles.riskCard}>
              <h2>Risk Assessment</h2>
              <div
                className={styles.riskLevel}
                style={{ backgroundColor: getRiskColor(risk.risk_level ?? "medium") }}
              >
                {(risk.risk_level ?? "MEDIUM").toUpperCase()}
              </div>
              <div className={styles.riskScore}>
                Risk Score: {((risk.risk_score ?? 0) * 100).toFixed(0)}%
              </div>

              <div className={styles.factorsList}>
                <h3>Risk Factors</h3>
                <ul>
                  {(risk.factors ?? []).map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.recommendationsList}>
                <h3>Recommendations</h3>
                <ul>
                  {(risk.recommendations ?? []).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
