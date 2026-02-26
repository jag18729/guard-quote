import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, AlertCircle, Loader2, Github } from "lucide-react";

// Google icon component (lucide doesn't have it)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// Microsoft icon component
const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#f25022" d="M1 1h10v10H1z" />
    <path fill="#00a4ef" d="M1 13h10v10H1z" />
    <path fill="#7fba00" d="M13 1h10v10H13z" />
    <path fill="#ffb900" d="M13 13h10v10H13z" />
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Fetch available OAuth providers
  useEffect(() => {
    const providerNames: Record<string, string> = {
      github: "GitHub",
      google: "Google", 
      microsoft: "Microsoft",
    };
    fetch(`${API_URL}/api/auth/providers`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.providers || [];
        // Handle both string[] and {id, name}[] formats
        const mapped = list.map((p: string | { id: string; name: string }) =>
          typeof p === "string" ? { id: p, name: providerNames[p] || p } : p
        );
        setProviders(mapped);
      })
      .catch(() => setProviders([]));
  }, []);

  // Handle OAuth callback (tokens in URL hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get("accessToken");
      const refreshToken = params.get("refreshToken");

      if (accessToken && refreshToken) {
        // Clear the hash
        window.history.replaceState(null, "", window.location.pathname);
        
        // Login with tokens
        loginWithToken(accessToken, refreshToken).then((success) => {
          if (success) {
            navigate("/admin");
          } else {
            setError("OAuth login failed. Please try again.");
          }
        });
      }
    }

    // Handle error from OAuth callback
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams, loginWithToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(email, password, rememberMe);
    setLoading(false);

    if (success) {
      navigate("/admin");
    } else {
      setError("Invalid email or password");
    }
  };

  const handleOAuth = (provider: string) => {
    setOauthLoading(provider);
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_URL}/api/auth/login/${provider}?returnUrl=/dashboard`;
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case "github":
        return <Github className="w-5 h-5" />;
      case "google":
        return <GoogleIcon />;
      case "microsoft":
        return <MicrosoftIcon />;
      default:
        return null;
    }
  };

  const getProviderColor = (id: string) => {
    switch (id) {
      case "github":
        return "bg-[#24292e] hover:bg-[#1b1f23] text-white";
      case "google":
        return "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300";
      case "microsoft":
        return "bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white";
      default:
        return "bg-surface hover:bg-elevated text-text-primary border border-border";
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-4">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-text-secondary text-sm mt-1">Sign in to access the dashboard</p>
        </div>

        {/* OAuth Buttons */}
        {providers.length > 0 && (
          <>
            <div className="space-y-3 mb-6">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleOAuth(provider.id)}
                  disabled={!!oauthLoading}
                  className={`w-full py-2.5 px-4 rounded font-medium transition flex items-center justify-center gap-3 ${getProviderColor(provider.id)} disabled:opacity-50`}
                >
                  {oauthLoading === provider.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    getProviderIcon(provider.id)
                  )}
                  Continue with {provider.name}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-void px-3 text-text-muted">or continue with email</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-critical/10 border border-critical/30 rounded text-critical text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded text-text-primary placeholder:text-text-muted focus:border-accent transition"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded text-text-primary placeholder:text-text-muted focus:border-accent transition"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent focus:ring-offset-0"
            />
            <label htmlFor="rememberMe" className="text-sm text-text-secondary cursor-pointer">
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !!oauthLoading}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-void font-semibold rounded transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-text-muted text-xs mt-6">
          Protected by GuardQuote Security
        </p>
      </div>
    </div>
  );
}
