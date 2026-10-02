import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function RegisterPage() {
  const { isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/app/home" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Phase 1: UI-only session. Phase 3 wires real registration to the API.
    signIn(email || "you@example.com");
    void navigate("/app/home", { replace: true });
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
          Account creation will be secured by the backend in a later phase.
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
        />
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        <Input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="••••••••"
          hint="UI placeholder — passwords are not stored yet."
        />
        <Button type="submit" className="mt-2 w-full">
          Create account
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
