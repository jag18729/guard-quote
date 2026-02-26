import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function OAuthHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Store token and clear URL
      localStorage.setItem("token", token);
      
      // Clear token from URL
      searchParams.delete("token");
      setSearchParams(searchParams, { replace: true });

      // Verify token and get user info
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.ok) {
            // Token valid, reload to pick up auth state
            window.location.href = "/dashboard";
          } else {
            // Token invalid
            localStorage.removeItem("token");
            navigate("/login?error=invalid_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          navigate("/login?error=auth_failed");
        });
    }
  }, [searchParams, setSearchParams, navigate]);

  return null;
}
