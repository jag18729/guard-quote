import { useEffect } from "react";

export default function OAuthHandler() {
  useEffect(() => {
    // Use native URL API to get token (more reliable than React Router)
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (token) {
      console.log("[OAuth] Token found, storing...");
      // Store token in localStorage
      localStorage.setItem("token", token);
      // Redirect to admin without token in URL
      window.location.replace("/admin");
    }
  }, []);

  return null;
}
