import { useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { email: "alice@dailyplanet.com", access: "The Daily Planet, admin" },
  { email: "bob@dailyplanet.com", access: "The Daily Planet, standard user" },
  { email: "carol@metrotimes.com", access: "Metro Times, admin" },
  { email: "dan@metrotimes.com", access: "Metro Times, standard user" },
  { email: "erin@newsgroup.com", access: "Both organizations, standard user" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">NewsGenie</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your publisher portal</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-200 pt-4 text-sm">
          <p className="font-medium">Demo accounts (password: Demo1234!)</p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword("Demo1234!");
                  }}
                  className="text-left hover:underline"
                >
                  <span className="font-medium">{a.email}</span> <span className="text-slate-500">({a.access})</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
