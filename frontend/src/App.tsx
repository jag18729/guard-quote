import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/index";       // this auto-loads index.tsx
import BackgroundWrapper from "./components/BackgroundWrapper";

export default function App() {
  return (
    <BrowserRouter>
      <BackgroundWrapper>
        <AppRouter />
      </BackgroundWrapper>
    </BrowserRouter>
  );
}
