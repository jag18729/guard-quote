import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/index";
import { ServiceStatusProvider } from "./context/ServiceStatusContext";
import { AuthProvider } from "./context/AuthContext";

console.log("[GuardQuote] App loading...");

export default function App() {
  console.log("[GuardQuote] App rendering...");

  return (
    <BrowserRouter>
      <AuthProvider>
        <ServiceStatusProvider>
          <AppRouter />
        </ServiceStatusProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
