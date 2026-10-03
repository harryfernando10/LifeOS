import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchLife, type SearchResult } from "../../api/searchInbox";

type Command = { label: string; keywords: string; href: string };
const commands: Command[] = [
  { label: "Go to Home", keywords: "home action center attention", href: "/app/home" },
  { label: "Show overdue items", keywords: "overdue attention action center", href: "/app/home?urgency=overdue" },
  { label: "Show upcoming deadlines", keywords: "upcoming deadlines", href: "/app/home?source=deadline&urgency=upcoming" },
  { label: "Show upcoming renewals", keywords: "upcoming renewals", href: "/app/home?source=renewal&urgency=upcoming" },
  { label: "Show expiring documents", keywords: "expiring documents expiry", href: "/app/home?source=document" },
  { label: "Show upcoming payments", keywords: "upcoming payment subscription recurring", href: "/app/financial" },
  { label: "Go to Vault", keywords: "vault documents", href: "/app/vault" },
  { label: "Add document · open Vault", keywords: "add document upload", href: "/app/vault?action=add" },
  { label: "Go to Commitments", keywords: "commitments subscriptions payments purchases", href: "/app/commitments" },
  { label: "Add subscription", keywords: "add subscription", href: "/app/commitments?action=subscription" },
  { label: "Add recurring payment", keywords: "add recurring payment", href: "/app/commitments?action=payment" },
  { label: "Add purchase", keywords: "add purchase", href: "/app/commitments?action=purchase" },
  { label: "Open Purchases to add warranty", keywords: "add warranty", href: "/app/commitments?action=purchase" },
  { label: "Go to Financial Commitments", keywords: "financial payments upcoming", href: "/app/financial" },
  { label: "Go to Renewals", keywords: "renewal", href: "/app/renewals" },
  { label: "Add renewal · open Renewals", keywords: "add renewal", href: "/app/renewals?action=renewal" },
  { label: "Add deadline · open Deadlines", keywords: "add deadline", href: "/app/renewals?action=deadline" },
  { label: "Go to Timeline", keywords: "timeline events", href: "/app/timeline" },
  { label: "Go to Life Inbox", keywords: "inbox", href: "/app/inbox" },
  { label: "Add inbox item", keywords: "add inbox item capture", href: "/app/inbox?action=add" },
  { label: "Open Inbox to process an item with AI", keywords: "process inbox item ai", href: "/app/inbox" },
  { label: "Search LifeOS", keywords: "search documents commitments inbox", href: "/app/search" },
];

export function CommandCenter({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [matches, setMatches] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const filtered = useMemo(() => commands.filter(c => `${c.label} ${c.keywords}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const options = query.trim().length >= 2 ? [...filtered, { label: `Search LifeOS for “${query.trim()}”`, href: `/app/search?q=${encodeURIComponent(query.trim())}` }, ...matches.map((m) => ({ label: `${m.title} · ${m.type.replaceAll("_", " ")}`, href: m.href }))] : filtered;
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setMatches([]); setLoading(false); return; }
    let active = true;
    const timer = window.setTimeout(() => { setLoading(true); void searchLife(query.trim()).then(v => { if (active) setMatches(v); }).catch(() => { if (active) setMatches([]); }).finally(() => { if (active) setLoading(false); }); }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  useEffect(() => setSelected(0), [query, options.length]);
  function activate(index: number) { const item = options[index]; if (item) { onClose(); navigate(item.href); } }
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 pt-[12vh]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-label="Command Center" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--lifeos-border)] bg-white shadow-2xl" onKeyDown={event => {
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>('input, button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <input ref={input} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); onClose(); } else if (e.key === "ArrowDown") { e.preventDefault(); setSelected(i => Math.min(i + 1, options.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(i => Math.max(0, i - 1)); } else if (e.key === "Enter") { e.preventDefault(); activate(selected); } }} placeholder="Search LifeOS or run a command…" aria-label="Search commands and LifeOS" className="w-full border-0 border-b border-[var(--lifeos-border)] px-5 py-4 text-base outline-none" />
      <ul className="max-h-[min(60vh,28rem)] overflow-y-auto p-2" role="listbox" aria-label="Commands and search results">
        {options.map((item, i) => <li key={`${item.href}:${item.label}`}><button type="button" role="option" aria-selected={selected === i} onMouseEnter={() => setSelected(i)} onClick={() => activate(i)} className={`w-full rounded-lg px-4 py-3 text-left text-sm ${selected === i ? "bg-[var(--lifeos-accent-soft)] text-[var(--lifeos-accent)]" : "hover:bg-slate-50"}`}>{item.label}</button></li>)}
        {loading ? <li className="px-4 py-3 text-sm text-[var(--lifeos-muted)]">Searching…</li> : null}
        {!options.length && !loading ? <li className="px-4 py-6 text-center text-sm text-[var(--lifeos-muted)]">No commands or results. Try another search.</li> : null}
      </ul>
      <footer className="border-t border-[var(--lifeos-border)] px-4 py-2 text-xs text-[var(--lifeos-muted)]">↑↓ Navigate · Enter Open · Esc Close</footer>
    </section>
  </div>;
}
