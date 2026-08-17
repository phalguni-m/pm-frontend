import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/primitives/Card";
import { Field } from "@/components/primitives/Field";
import { Input } from "@/components/primitives/Input";
import { Button } from "@/components/primitives/Button";

// Owned by Namana (auth). Backing endpoint: POST /api/auth/login (public —
// see docs/API_CONTRACT.md).
//
// No shared API client and no session store exist anywhere in this repo yet
// (INTEGRATION_AUDIT.md §6 — no GET /api/auth/me, no refresh route, nothing
// reads a stored token today). This page therefore calls the backend
// directly and stashes the returned session in localStorage under
// "pm-auth" as a stopgap so it at least survives a refresh. Wiring that
// into real app-wide session state / route guarding touches AppShell and
// router.tsx, which is explicitly out of scope here — flagging it rather
// than reaching into those files.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function LoginPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Login failed. Please try again."
        );
      }

      const session = body as AuthSession;
      localStorage.setItem("pm-auth", JSON.stringify(session));

      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: 380, maxWidth: "90vw" }}>
      <Card
        title="Log in"
        subtitle="Welcome back — enter your details to continue."
        footer={{
          message: "Don't have an account?",
          linkLabel: "Sign up",
          onLinkClick: () => navigate("/signup"),
        }}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Field label="Email" htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <span role="alert" style={{ fontSize: "var(--text-xs)", color: "var(--signal-critical-text)" }}>
              {error}
            </span>
          )}

          <Button
            variant="primary"
            loading={loading}
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => formRef.current?.requestSubmit()}
          >
            Log in
          </Button>
        </form>
      </Card>
    </div>
  );
}
