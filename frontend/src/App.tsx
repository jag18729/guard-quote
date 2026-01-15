import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/index";
import { ServiceStatusProvider } from "./context/ServiceStatusContext";

console.log("[GuardQuote] App loading...");

export default function App() {
  console.log("[GuardQuote] App rendering...");

  return (
    <BrowserRouter>
      <ServiceStatusProvider>
        <AppRouter />
      </ServiceStatusProvider>
    </BrowserRouter>
  );
}
