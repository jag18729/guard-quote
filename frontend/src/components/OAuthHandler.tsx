import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function OAuthHandler() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Store token in localStorage
      localStorage.setItem("token", token);
      // Redirect to admin (full page reload to reinit AuthContext)
      window.location.replace("/admin");
    }
  }, [searchParams]);

  return null;
}
