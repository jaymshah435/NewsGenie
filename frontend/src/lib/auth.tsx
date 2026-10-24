import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, setToken } from "./api";

export type Organization = { id: string; name: string; role: "admin" | "standard" };
export type User = { email: string; name: string; organizations: Organization[]; data_until: string };

type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // When the app opens: if a token is saved, ask the backend who it belongs to
  useEffect(() => {
    async function loadUser() {
      if (getToken()) {
        try {
          setUser(await apiFetch<User>("/api/auth/me"));
        } catch {
          clearToken(); // token expired or invalid
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  // Log in: get a token, save it, then load the user
  async function login(email: string, password: string) {
    const { token } = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
    setUser(await apiFetch<User>("/api/auth/me"));
  }

  // Log out: forget the token and the user
  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);