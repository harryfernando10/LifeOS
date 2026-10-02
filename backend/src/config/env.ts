export function getPort(): number {
  const raw = process.env.PORT ?? "3001";
  const port = Number(raw);
  return Number.isFinite(port) && port > 0 ? port : 3001;
}

export function getFrontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
}
