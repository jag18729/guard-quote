import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuoteWebSocket } from "../hooks/useQuoteWebSocket";
import { useServiceStatus } from "../context/ServiceStatusContext";
import { mlApi, api, MLQuoteResponse, RiskAssessmentResponse } from "../services/api";
import styles from "./SecurityQuote.module.css";

const DRAFT_KEY = "guardquote_draft";

const EVENT_TYPES = [
  { value: "corporate", label: "Corporate Event", baseRate: 35 },
  { value: "concert", label: "Concert / Festival", baseRate: 45 },
  { value: "sports", label: "Sporting Event", baseRate: 42 },
  { value: "private", label: "Private Event", baseRate: 30 },
  { value: "construction", label: "Construction Site", baseRate: 32 },
  { value: "retail", label: "Retail Security", baseRate: 28 },
  { value: "residential", label: "Residential", baseRate: 25 },
];

const WIZARD_STEPS = [
  { id: 1, label: "Event Details" },
  { id: 2, label: "Location" },
  { id: 3, label: "Security" },
  { id: 4, label: "Review" },
];

type FormData = {
  eventType: string;
  eventDate: string;
  eventTime: string;
  locationZip: string;
  crowdSize: number;
  numGuards: number;
  hours: number;
  isArmed: boolean;
  requiresVehicle: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

function generateDemoQuote(data: FormData): { quote: MLQuoteResponse; risk: RiskAssessmentResponse } {
  const eventType = EVENT_TYPES.find((e) => e.value === data.eventType) || EVENT_TYPES[0];
  const baseRate = eventType.baseRate;
  let subtotal = baseRate * data.hours * data.numGuards;
  if (data.isArmed) subtotal += 15 * data.hours * data.numGuards;
  if (data.requiresVehicle) subtotal += 50 * data.numGuards;
  const riskScore =
    data.crowdSize > 1000 ? 0.75 : data.crowdSize > 500 ? 0.5 : ["concert", "sports"].includes(data.eventType) ? 0.45 : 0.3;
  const riskLevel = riskScore >= 0.75 ? "critical" : riskScore >= 0.5 ? "high" : riskScore >= 0.25 ? "medium" : "low";
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
    risk: { risk_level: riskLevel as "low" | "medium" | "high" | "critical", risk_score: riskScore, factors, recommendations },
  };
}

export default function SecurityQuote() {
  const { status } = useServiceStatus();
  const { isConnected, isCalculating, quote: wsQuote, calculateQuote } = useQuoteWebSocket();
  const [currentStep, setCurrentStep] = useState(1);
  const [quote, setQuote] = useState<MLQuoteResponse | null>(null);
  const [risk, setRisk] = useState<RiskAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<FormData>({
    defaultValues: {
      eventType: "corporate",
      eventDate: tomorrow.toISOString().split("T")[0],
      eventTime: "14:00",
      locationZip: "90001",
      crowdSize: 100,
      numGuards: 2,
      hours: 4,
      isArmed: false,
      requiresVehicle: false,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const formValues = watch();

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        Object.entries(parsed).forEach(([key, value]) => {
          setValue(key as keyof FormData, value as any);
        });
        setHasDraft(true);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [setValue]);

  // Save draft to localStorage on changes
  useEffect(() => {
    const values = getValues();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  }, [formValues, getValues]);

  // Real-time price calculation via WebSocket
  useEffect(() => {
    if (isConnected && currentStep >= 2) {
      calculateQuote({
        eventType: formValues.eventType,
        locationZip: formValues.locationZip,
        numGuards: formValues.numGuards,
        hours: formValues.hours,
        eventDate: `${formValues.eventDate}T${formValues.eventTime}:00`,
        crowdSize: formValues.crowdSize,
        isArmed: formValues.isArmed,
        requiresVehicle: formValues.requiresVehicle,
      });
    }
  }, [
    isConnected,
    currentStep,
    formValues.eventType,
    formValues.locationZip,
    formValues.numGuards,
    formValues.hours,
    formValues.eventDate,
    formValues.eventTime,
    formValues.crowdSize,
    formValues.isArmed,
    formValues.requiresVehicle,
    calculateQuote,
  ]);

  // Update quote from WebSocket
  useEffect(() => {
    if (wsQuote) {
      setQuote(wsQuote);
      if (wsQuote.risk_assessment) {
        setRisk(wsQuote.risk_assessment);
      }
      setIsDemo(false);
    }
  }, [wsQuote]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formValues.eventType && !!formValues.eventDate && !!formValues.eventTime;
      case 2:
        return !!formValues.locationZip && formValues.locationZip.length === 5;
      case 3:
        return formValues.numGuards >= 1 && formValues.hours >= 1;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setIsDemo(false);

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
        if (quoteResult?.final_price !== undefined && riskResult?.risk_level) {
          setQuote(quoteResult);
          setRisk(riskResult);
          clearDraft();
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("ML engine error, falling back to demo:", err);
      }
    }

    const demo = generateDemoQuote(data);
    setQuote(demo.quote);
    setRisk(demo.risk);
    setIsDemo(true);
    clearDraft();
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "#4caf50";
      case "medium":
        return "#ff9800";
      case "high":
        return "#f44336";
      case "critical":
        return "#9c27b0";
      default:
        return "#666";
    }
  };

  const eventTypeLabel = EVENT_TYPES.find((e) => e.value === formValues.eventType)?.label || formValues.eventType;
  const livePrice = wsQuote?.final_price ?? quote?.final_price;

  return (
    <div className={styles.container}>
      <div className={`${styles.formSection} ${styles.wizard}`}>
        <h1 className={styles.title}>
          Get Your Quote
          {hasDraft && <span className={styles.draftBadge}>Draft Saved</span>}
        </h1>
        <p className={styles.subtitle}>
          {status.mlEngine === "online" ? "ML-powered instant pricing" : "Demo Mode - estimates are approximate"}
        </p>

        {/* Wizard Progress */}
        <div className={styles.wizardProgress}>
          {WIZARD_STEPS.map((step) => (
            <div
              key={step.id}
              className={`${styles.wizardStep} ${currentStep === step.id ? styles.stepActive : ""} ${
                currentStep > step.id ? styles.stepComplete : ""
              }`}
              onClick={() => goToStep(step.id)}
            >
              <div className={styles.stepNumber}>{currentStep > step.id ? "" : step.id}</div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.wizardContent}>
            {/* Step 1: Event Details */}
            {currentStep === 1 && (
              <>
                <div className={styles.field}>
                  <label>Event Type</label>
                  <select {...register("eventType", { required: "Event type is required" })}>
                    {EVENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.eventType && <span className={styles.fieldError}>{errors.eventType.message}</span>}
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Event Date</label>
                    <input type="date" {...register("eventDate", { required: "Date is required" })} />
                    {errors.eventDate && <span className={styles.fieldError}>{errors.eventDate.message}</span>}
                  </div>
                  <div className={styles.field}>
                    <label>Start Time</label>
                    <input type="time" {...register("eventTime", { required: "Time is required" })} />
                    {errors.eventTime && <span className={styles.fieldError}>{errors.eventTime.message}</span>}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Location & Crowd */}
            {currentStep === 2 && (
              <>
                <div className={styles.field}>
                  <label>Location (ZIP Code)</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g., 90001"
                    className={errors.locationZip ? styles.inputError : ""}
                    {...register("locationZip", {
                      required: "ZIP code is required",
                      pattern: { value: /^\d{5}$/, message: "Enter a valid 5-digit ZIP" },
                    })}
                  />
                  {errors.locationZip && <span className={styles.fieldError}>{errors.locationZip.message}</span>}
                </div>
                <div className={styles.field}>
                  <label>Expected Attendance</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Number of attendees"
                    {...register("crowdSize", { valueAsNumber: true, min: { value: 0, message: "Must be 0 or more" } })}
                  />
                  {errors.crowdSize && <span className={styles.fieldError}>{errors.crowdSize.message}</span>}
                </div>
              </>
            )}

            {/* Step 3: Security Requirements */}
            {currentStep === 3 && (
              <>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Number of Guards</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      {...register("numGuards", {
                        valueAsNumber: true,
                        required: "Required",
                        min: { value: 1, message: "At least 1 guard" },
                        max: { value: 50, message: "Max 50 guards" },
                      })}
                    />
                    {errors.numGuards && <span className={styles.fieldError}>{errors.numGuards.message}</span>}
                  </div>
                  <div className={styles.field}>
                    <label>Hours Needed</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      step={0.5}
                      {...register("hours", {
                        valueAsNumber: true,
                        required: "Required",
                        min: { value: 1, message: "At least 1 hour" },
                        max: { value: 24, message: "Max 24 hours" },
                      })}
                    />
                    {errors.hours && <span className={styles.fieldError}>{errors.hours.message}</span>}
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
              </>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <>
                <h3 style={{ marginBottom: "1rem" }}>Review Your Quote Request</h3>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <label>Event Type</label>
                    <span>{eventTypeLabel}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <label>Date & Time</label>
                    <span>
                      {formValues.eventDate} @ {formValues.eventTime}
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <label>Location</label>
                    <span>ZIP {formValues.locationZip}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <label>Attendance</label>
                    <span>{formValues.crowdSize.toLocaleString()} people</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <label>Guards</label>
                    <span>
                      {formValues.numGuards} x {formValues.hours}hrs
                    </span>
                  </div>
                  <div className={styles.summaryItem}>
                    <label>Options</label>
                    <span>
                      {formValues.isArmed ? "Armed" : "Unarmed"}
                      {formValues.requiresVehicle ? " + Vehicle" : ""}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Price Preview (shows from step 2 onwards) */}
          {currentStep >= 2 && (
            <div className={styles.livePrice}>
              <div className={styles.livePriceLabel}>Estimated Total</div>
              <div className={`${styles.livePriceValue} ${isCalculating ? styles.livePriceCalculating : ""}`}>
                {isCalculating ? "Calculating..." : livePrice ? `$${livePrice.toLocaleString()}` : "---"}
              </div>
              <div className={styles.wsStatus}>
                <span className={`${styles.wsStatusDot} ${isConnected ? styles.connected : ""}`}></span>
                {isConnected ? "Live pricing" : "Connecting..."}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className={styles.wizardNav}>
            {currentStep > 1 && (
              <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={prevStep}>
                Back
              </button>
            )}
            {currentStep < 4 ? (
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Continue
              </button>
            ) : (
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? "Submitting..." : "Submit Quote Request"}
              </button>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>

      {/* Results Section */}
      {quote?.final_price !== undefined && currentStep === 4 && (
        <div className={styles.resultSection}>
          <div className={styles.quoteCard}>
            <h2>Price Estimate</h2>
            <div className={styles.priceMain}>${quote.final_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
              <div className={styles.riskLevel} style={{ backgroundColor: getRiskColor(risk.risk_level ?? "medium") }}>
                {(risk.risk_level ?? "MEDIUM").toUpperCase()}
              </div>
              <div className={styles.riskScore}>Risk Score: {((risk.risk_score ?? 0) * 100).toFixed(0)}%</div>
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
