import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ScrollToTop from "./components/ScrollToTop";
import "./index.css";

// Handle OAuth token from URL before React renders
const params = new URLSearchParams(window.location.search);
const token = params.get("token");
console.log("[OAuth] URL token:", token ? "present" : "none");
console.log("[OAuth] localStorage token before:", localStorage.getItem("token") ? "present" : "none");
if (token) {
  localStorage.setItem("token", token);
  console.log("[OAuth] Stored token, removing from URL");
  // Remove token from URL
  window.history.replaceState({}, "", window.location.pathname);
}
console.log("[OAuth] localStorage token after:", localStorage.getItem("token") ? "present" : "none");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
