import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import styles from "./IndividualQuote.module.css";

type FormData = {
  // Step 1: About You
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  homeType: string;
  householdSize: string;

  // Step 2: Your Setup
  deviceCount: string;
  primaryUse: string;
  hasSmartHome: boolean;
  smartHomeDetails: string;
  worksFromHome: string;

  // Step 3: Your Security
  currentProtection: string[];
  pastIncidents: boolean;
  incidentDetails: string;
  onlineActivity: string;
  technicalComfort: string;

  // Step 4: Your Needs
  budget: number;
  securityConcerns: string;
  urgency: string;
  preferredContact: string;
};

const STEPS = [
  { id: 1, title: "About You", icon: "👤" },
  { id: 2, title: "Your Setup", icon: "🏠" },
  { id: 3, title: "Security", icon: "🔒" },
  { id: 4, title: "Your Needs", icon: "🎯" },
];

export default function IndividualQuote() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const { register, handleSubmit, watch, trigger } = useForm<FormData>({
    defaultValues: {
      homeType: "",
      householdSize: "",
      deviceCount: "1-5",
      primaryUse: "",
      hasSmartHome: false,
      worksFromHome: "",
      currentProtection: [],
      pastIncidents: false,
      onlineActivity: "",
      technicalComfort: "comfortable",
      budget: 50,
      urgency: "",
      preferredContact: "email",
    },
  });

  const hasSmartHome = watch("hasSmartHome");
  const pastIncidents = watch("pastIncidents");
  const budget = watch("budget");

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate as any);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName", "email"];
      case 2:
        return ["deviceCount", "primaryUse"];
      case 3:
        return ["technicalComfort"];
      case 4:
        return ["budget", "urgency"];
      default:
        return [];
    }
  };

  const onSubmit = (data: FormData) => {
    console.log("Form data:", data);
    navigate("/loading");
    setTimeout(() => {
      navigate("/report");
    }, 3000);
  };

  const getBudgetLabel = (value: number) => {
    if (value <= 25) return "Basic";
    if (value <= 75) return "Standard";
    if (value <= 150) return "Premium";
    return "Enterprise";
  };

  return (
    <div className={styles.pageWrapper}>
      <button className={styles.backBtn} onClick={() => navigate("/")}>
        ← Back
      </button>

      <form className={styles.formBox} onSubmit={handleSubmit(onSubmit)}>
        {/* Header */}
        <h1 className={styles.title}>
          Get Your Personalized
          <br />
          Security Quote
        </h1>
        <p className={styles.subtitle}>
          Answer a few questions — our AI will tailor a solution for you.
        </p>

        {/* Progress Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.step} ${currentStep >= step.id ? styles.active : ""} ${currentStep === step.id ? styles.current : ""}`}
            >
              <div className={styles.stepIcon}>{step.icon}</div>
              <span className={styles.stepTitle}>{step.title}</span>
              {index < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className={styles.stepContent}>
          {/* STEP 1: About You */}
          {currentStep === 1 && (
            <div className={styles.stepPanel}>
              <h2 className={styles.sectionTitle}>👤 Tell us about yourself</h2>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>First Name *</label>
                  <input
                    type="text"
                    placeholder="John"
                    {...register("firstName", { required: true })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    {...register("lastName", { required: true })}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Email *</label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    {...register("email", { required: true })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Phone</label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...register("phone")}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Home Type</label>
                  <select {...register("homeType")}>
                    <option value="">Select...</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="house">House</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Household Size</label>
                  <select {...register("householdSize")}>
                    <option value="">Select...</option>
                    <option value="1">Just me</option>
                    <option value="2">2 people</option>
                    <option value="3-4">3-4 people</option>
                    <option value="5+">5+ people</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Your Setup */}
          {currentStep === 2 && (
            <div className={styles.stepPanel}>
              <h2 className={styles.sectionTitle}>🏠 Your digital setup</h2>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Number of Devices *</label>
                  <select {...register("deviceCount", { required: true })}>
                    <option value="1-5">1–5 devices</option>
                    <option value="6-10">6–10 devices</option>
                    <option value="11-20">11–20 devices</option>
                    <option value="21+">21+ devices</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Primary Internet Use *</label>
                  <select {...register("primaryUse", { required: true })}>
                    <option value="">Select...</option>
                    <option value="general">General browsing</option>
                    <option value="streaming">Streaming</option>
                    <option value="gaming">Gaming</option>
                    <option value="remote">Remote work</option>
                    <option value="family">Family / Children</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label>Do you work from home?</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input type="radio" value="no" {...register("worksFromHome")} />
                    <span>No</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input type="radio" value="sometimes" {...register("worksFromHome")} />
                    <span>Sometimes</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input type="radio" value="fulltime" {...register("worksFromHome")} />
                    <span>Full-time</span>
                  </label>
                </div>
              </div>

              <label className={styles.checkboxWrapper}>
                <input type="checkbox" {...register("hasSmartHome")} />
                <span>I have smart home devices (Alexa, Nest, Ring, etc.)</span>
              </label>

              {hasSmartHome && (
                <div className={styles.field}>
                  <label>Which smart devices do you have?</label>
                  <input
                    type="text"
                    placeholder="e.g., Ring doorbell, Nest thermostat, smart lights..."
                    {...register("smartHomeDetails")}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Security */}
          {currentStep === 3 && (
            <div className={styles.stepPanel}>
              <h2 className={styles.sectionTitle}>🔒 Current security posture</h2>

              <div className={styles.field}>
                <label>What protection do you currently have?</label>
                <div className={styles.checkboxGrid}>
                  {[
                    { value: "antivirus", label: "Antivirus software" },
                    { value: "firewall", label: "Firewall" },
                    { value: "vpn", label: "VPN" },
                    { value: "passwordManager", label: "Password manager" },
                    { value: "2fa", label: "Two-factor auth" },
                    { value: "none", label: "None of these" },
                  ].map((item) => (
                    <label key={item.value} className={styles.checkboxCard}>
                      <input
                        type="checkbox"
                        value={item.value}
                        {...register("currentProtection")}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label>Online banking & shopping frequency</label>
                <select {...register("onlineActivity")}>
                  <option value="">Select...</option>
                  <option value="rarely">Rarely</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <label className={styles.checkboxWrapper}>
                <input type="checkbox" {...register("pastIncidents")} />
                <span>I've experienced a security incident before</span>
              </label>

              {pastIncidents && (
                <div className={styles.field}>
                  <label>What happened?</label>
                  <input
                    type="text"
                    placeholder="e.g., phishing, malware, data breach..."
                    {...register("incidentDetails")}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label>Your technical comfort level *</label>
                <select {...register("technicalComfort", { required: true })}>
                  <option value="beginner">Beginner — Keep it simple</option>
                  <option value="comfortable">Comfortable — I can configure things</option>
                  <option value="advanced">Advanced — I want full control</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Your Needs */}
          {currentStep === 4 && (
            <div className={styles.stepPanel}>
              <h2 className={styles.sectionTitle}>🎯 Your security needs</h2>

              <div className={styles.field}>
                <label>Monthly Budget: ${budget} <span className={styles.budgetTier}>({getBudgetLabel(budget)})</span></label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  className={styles.slider}
                  {...register("budget", { valueAsNumber: true })}
                />
                <div className={styles.sliderLabels}>
                  <span>$10</span>
                  <span>$50</span>
                  <span>$100</span>
                  <span>$200+</span>
                </div>
              </div>

              <div className={styles.field}>
                <label>Main security concerns</label>
                <textarea
                  placeholder="e.g., identity theft, ransomware, parental controls, privacy..."
                  rows={3}
                  {...register("securityConcerns")}
                />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>How urgent is this? *</label>
                  <select {...register("urgency", { required: true })}>
                    <option value="">Select...</option>
                    <option value="browsing">Just browsing</option>
                    <option value="soon">Need in a few weeks</option>
                    <option value="urgent">Need ASAP</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Preferred contact method</label>
                  <select {...register("preferredContact")}>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text message</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          {currentStep > 1 && (
            <button type="button" className={styles.prevBtn} onClick={prevStep}>
              ← Previous
            </button>
          )}
          {currentStep < 4 ? (
            <button type="button" className={styles.nextBtn} onClick={nextStep}>
              Next →
            </button>
          ) : (
            <button type="submit" className={styles.submitBtn}>
              Get My Quote →
            </button>
          )}
        </div>

        {/* Step indicator text */}
        <p className={styles.stepIndicator}>Step {currentStep} of 4</p>
      </form>
    </div>
  );
}
