import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/primitives/Card";
import { Field } from "@/components/primitives/Field";
import { Input } from "@/components/primitives/Input";
import { Button } from "@/components/primitives/Button";
import styles from "./SignupPage.module.css";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3001";

interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const MIN_PASSWORD_LENGTH = 8;

export function SignupPage() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Signup failed. Please try again."
        );
      }

      const session = body as AuthSession;

      localStorage.setItem("pm-auth", JSON.stringify(session));

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <Card
        title="Sign up"
        subtitle="Create an account to get started."
        footer={{
          message: "Already have an account?",
          linkLabel: "Log in",
          onLinkClick: () => navigate("/login"),
        }}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={styles.form}
        >
          <Field label="Name" htmlFor="signup-name" required>
            <Input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Email" htmlFor="signup-email" required>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="signup-password"
            required
            errorMessage={
              password.length > 0 &&
              password.length < MIN_PASSWORD_LENGTH
                ? `At least ${MIN_PASSWORD_LENGTH} characters`
                : undefined
            }
          >
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
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
            Sign up
          </Button>
        </form>
      </Card>
    </div>
  );
}