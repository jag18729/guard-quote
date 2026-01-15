import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import styles from "./IndividualQuote.module.css";

type FormData = {
  deviceCount: string;
  primaryUse: string;
  hasSmartHome: boolean;
  smartHomeDetails?: string;
  technicalComfort: string;
  budget: number;
  securityRequirements: string;
};

export default function IndividualQuote() {
  const navigate = useNavigate();

  const { register, handleSubmit, watch } = useForm<FormData>({
    defaultValues: {
      deviceCount: "1-5",
      hasSmartHome: false,
      technicalComfort: "comfortable",
      budget: 50,
    },
  });

  const hasSmartHome = watch("hasSmartHome");

  const onSubmit = (data: FormData) => {
    navigate("/loading");

    setTimeout(() => {
      navigate("/report");
    }, 3000);
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* Back button */}
      <button className={styles.backBtn} onClick={() => navigate("/")}>
        ← Back
      </button>

      {/* Quote form */}
      <form className={styles.formBox} onSubmit={handleSubmit(onSubmit)}>
        
        <h1 className={styles.title}>
          Get Your Personalized
          <br />
          Security Quote
        </h1>

        <p className={styles.subtitle}>
          Answer a few quick questions — let our AI tailor a solution for you.
        </p>

        {/* Devices */}
        <div className={styles.field}>
          <label>Number of Devices</label>
          <select {...register("deviceCount")}>
            <option value="1-5">1–5 devices</option>
            <option value="6-10">6–10 devices</option>
            <option value="11-20">11–20 devices</option>
            <option value="21+">21+ devices</option>
          </select>
        </div>

        {/* Internet Use */}
        <div className={styles.field}>
          <label>Primary Internet Use</label>
          <select {...register("primaryUse")}>
            <option value="">Select an option</option>
            <option value="general">General browsing</option>
            <option value="streaming">Streaming</option>
            <option value="gaming">Gaming</option>
            <option value="remote">Remote work</option>
            <option value="family">Family / Children</option>
          </select>
        </div>

        {/* Smart Home */}
        <label className={styles.checkboxWrapper}>
          <input type="checkbox" {...register("hasSmartHome")} />
          <span>I have smart home devices</span>
        </label>

        {hasSmartHome && (
          <div className={styles.field}>
            <label>Smart Home Details</label>
            <input
              type="text"
              placeholder="List your devices (Alexa, Nest, etc.)"
              {...register("smartHomeDetails")}
            />
          </div>
        )}

        {/* Tech Comfort */}
        <div className={styles.field}>
          <label>Tech Comfort Level</label>
          <select {...register("technicalComfort")}>
            <option value="beginner">Beginner — Keep it simple</option>
            <option value="comfortable">Comfortable — I can configure things</option>
            <option value="advanced">Advanced — I like full control</option>
          </select>
        </div>

        {/* Budget */}
        <div className={styles.field}>
          <label>Monthly Budget ($)</label>
          <input
            type="number"
            {...register("budget", { valueAsNumber: true })}
          />
        </div>

        {/* Concerns */}
        <div className={styles.field}>
          <label>Any security concerns?</label>
          <textarea
            placeholder="E.g., identity theft prevention, parental controls, ransomware protection..."
            {...register("securityRequirements")}
          />
        </div>

        <button type="submit" className={styles.submitBtn}>
          Get My Quote →
        </button>

      </form>
    </div>
  );
}
