import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ServiceStatus {
  mlEngine: "online" | "offline" | "checking";
  database: "online" | "offline" | "checking";
  demoMode: boolean;
}

interface ServiceStatusContextType {
  status: ServiceStatus;
  checkServices: () => void;
}

const ServiceStatusContext = createContext<ServiceStatusContextType | null>(null);

export function ServiceStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServiceStatus>({
    mlEngine: "checking",
    database: "checking",
    demoMode: false,
  });

  const checkServices = async () => {
    // Check ML Engine
    try {
      const mlRes = await fetch("/ml/health", {
        signal: AbortSignal.timeout(3000)
      });
      if (mlRes.ok) {
        const data = await mlRes.json() as { status?: string };
        setStatus(prev => ({
          ...prev,
          mlEngine: data?.status === "healthy" ? "online" : "offline"
        }));
      } else {
        setStatus(prev => ({ ...prev, mlEngine: "offline" }));
      }
    } catch {
      setStatus(prev => ({ ...prev, mlEngine: "offline" }));
    }

    // Check Backend/Database
    try {
      const dbRes = await fetch("/api/health", {
        signal: AbortSignal.timeout(3000)
      });
      if (dbRes.ok) {
        setStatus(prev => ({ ...prev, database: "online", demoMode: false }));
      } else {
        setStatus(prev => ({ ...prev, database: "offline", demoMode: true }));
      }
    } catch {
      setStatus(prev => ({ ...prev, database: "offline", demoMode: true }));
    }
  };

  useEffect(() => {
    checkServices();

    // Re-check every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ServiceStatusContext.Provider value={{ status, checkServices }}>
      {children}
    </ServiceStatusContext.Provider>
  );
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext);
  if (!context) {
    throw new Error("useServiceStatus must be used within ServiceStatusProvider");
  }
  return context;
}
