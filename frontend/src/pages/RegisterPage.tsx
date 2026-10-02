import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function RegisterPage() {
  const { isAuthenticated, isLoading, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-[var(--lifeos-muted)]">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), password);
      void navigate("/app/home", { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("Unable to create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-10">
        <p
          className="text-3xl font-bold tracking-tight text-[var(--lifeos-ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          LifeOS
        </p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--lifeos-ink)]">
          Create account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--lifeos-muted)]">
          Set up your private space for documents, commitments, and deadlines.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)]/90 p-6 shadow-sm backdrop-blur"
      >
        <Input
          name="email"
          type="email"
          autoComplete="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          hint="At least 8 characters."
        />
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
        />
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--lifeos-muted)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[var(--lifeos-accent)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
