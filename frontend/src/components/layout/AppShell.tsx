import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../ui/Button";
import { CommandCenter } from "./CommandCenter";
import { NotificationsButton } from "./NotificationsButton";

const navItems = [
  { to: "/app/home", label: "Home" },
  { to: "/app/search", label: "Search" },
  { to: "/app/vault", label: "Vault" },
  { to: "/app/commitments", label: "Commitments" },
  { to: "/app/financial", label: "Financial" },
  { to: "/app/renewals", label: "Renewals" },
  { to: "/app/timeline", label: "Timeline" },
  { to: "/app/inbox", label: "Inbox" },
] as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const commandReturnFocus = useRef<HTMLElement | null>(null);

  function openCommandCenter() {
    commandReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setCommandOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.altKey && !typing) {
        event.preventDefault();
        if (commandOpen) setCommandOpen(false); else openCommandCenter();
      }
      if (event.key === "Escape" && commandOpen) setCommandOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    if (!commandOpen && commandReturnFocus.current) {
      commandReturnFocus.current.focus();
      commandReturnFocus.current = null;
    }
  }, [commandOpen]);

  async function handleSignOut() {
    await logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--lifeos-surface)] focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <header className="flex flex-col gap-4 border-b border-[var(--lifeos-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p
            className="text-2xl font-bold tracking-tight text-[var(--lifeos-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LifeOS
          </p>
          <span className="hidden text-sm text-[var(--lifeos-muted)] sm:inline">
            What needs attention
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" className="shrink-0 px-3 py-2" onClick={openCommandCenter} aria-label="Open Command Center">⌕ <span className="hidden sm:inline">Search / Commands</span><span className="ml-2 hidden text-xs text-[var(--lifeos-muted)] sm:inline">Ctrl K</span></Button>
          <NotificationsButton />
          <p className="truncate text-sm text-[var(--lifeos-muted)]">
            {user?.email}
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              void handleSignOut();
            }}
            className="shrink-0 px-3 py-2"
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-1 flex-col gap-8 lg:flex-row">
        <nav aria-label="Primary" className="lg:w-48 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-[var(--lifeos-accent-soft)] text-[var(--lifeos-accent)]"
                        : "text-[var(--lifeos-ink-soft)] hover:bg-white/70 hover:text-[var(--lifeos-ink)]",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main-content" className="min-w-0 flex-1 pb-10">
          <Outlet />
        </main>
      </div>
      {commandOpen ? <CommandCenter onClose={() => setCommandOpen(false)} /> : null}
    </div>
  );
}
