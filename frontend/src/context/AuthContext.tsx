import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  loginWithToken: (accessToken: string, refreshToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/(?:^|; )gq_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper for authenticated fetch with credentials and CSRF
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount (using cookie or localStorage token)
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Only check if we have a token (avoids unnecessary 401s)
        // lgtm[js/user-controlled-bypass] - Client-side optimization only; server validates all tokens
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
          setIsLoading(false);
          return;
        }

        // Try cookie-based auth first
        const res = await authFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
          setIsLoading(false);
          return;
        }
        
        // Fall back to localStorage token if cookie fails
        const tokenRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          setUser(data.user || data);
          setIsLoading(false);
          return;
        }
        
        // Token invalid - clean up silently
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem("token");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<boolean> => {
    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      // Server sets httpOnly session cookie and csrf cookie
      setToken(data.accessToken || data.token);
      setUser(data.user);
      localStorage.setItem("token", data.accessToken || data.token);
      if (data.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }
      if (rememberMe) {
        localStorage.setItem("rememberMe", "1");
      } else {
        localStorage.removeItem("rememberMe");
      }
      return true;
    } catch { return false; }
  };

  // Login with OAuth tokens (from callback)
  const loginWithToken = async (accessToken: string, refreshToken: string): Promise<boolean> => {
    try {
      // Store tokens
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      setToken(accessToken);

      // Fetch user info
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        return true;
      }
      
      // Token invalid
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setToken(null);
      return false;
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      setToken(null);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const refreshUser = async () => {
    try {
      const res = await authFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
      }
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Legacy helper - still works via Authorization header
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const csrfToken = getCSRFToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  return headers;
}

// Preferred way to make authenticated API calls
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  const csrfToken = getCSRFToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  // Add CSRF token for state-changing requests
  const method = options.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}
