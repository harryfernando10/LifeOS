import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

type HealthResponse = {
  status: string;
  service: string;
};

function FoundationPage() {
  const [health, setHealth] = useState<string>("checking");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();

    async function probe() {
      try {
        const response = await fetch(`${apiBaseUrl}/health`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setHealth("error");
          setDetail(`HTTP ${response.status}`);
          return;
        }
        const body = (await response.json()) as HealthResponse;
        setHealth(body.status === "ok" ? "ok" : "error");
        setDetail(body.service ?? "");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setHealth("error");
        setDetail(error instanceof Error ? error.message : "unreachable");
      }
    }

    void probe();
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="text-sm tracking-wide text-stone-500">LifeOS</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Project foundation
      </h1>
      <p className="mt-3 text-stone-600">
        Phase 0 is running. Product areas will be added in later phases.
      </p>
      <p className="mt-8 text-sm text-stone-500">Backend health</p>
      <p className="mt-1 text-lg">
        {health === "checking" && "Checking…"}
        {health === "ok" && `Connected${detail ? ` (${detail})` : ""}`}
        {health === "error" && `Unavailable${detail ? ` — ${detail}` : ""}`}
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FoundationPage />} />
    </Routes>
  );
}
