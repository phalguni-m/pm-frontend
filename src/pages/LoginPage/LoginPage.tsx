import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/primitives/Card";
import { Field } from "@/components/primitives/Field";
import { Input } from "@/components/primitives/Input";
import { Button } from "@/components/primitives/Button";
import styles from "./LoginPage.module.css";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3001";

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
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Login failed. Please try again."
        );
      }

      const session = body as AuthSession;

      localStorage.setItem("pm-auth", JSON.stringify(session));

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
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
          className={styles.form}
        >
          <Field label="Email" htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="login-password" required>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          {error && (
            <span className={styles.error} role="alert">
              {error}
            </span>
          )}

          <Button
            variant="primary"
            loading={loading}
            className={styles.submitButton}
            onClick={() => formRef.current?.requestSubmit()}
          >
            Log in
          </Button>
        </form>
      </Card>
    </div>
  );
}