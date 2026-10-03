import { useState } from "react";
import { ApiRequestError } from "../api/client";
import { confirmInboxDocument, processInboxWithAI, type AIProcessResult } from "../api/ai";
import { createPurchase, upsertWarranty } from "../api/purchases";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "../api/documents";
import { Button } from "./ui/Button";

type Props = { inboxId: string; inboxTitle: string; onSaved: () => void };
const inputClass = "w-full rounded-lg border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] px-3 py-2 text-sm";

export function AIInboxReview({ inboxId, inboxTitle, onSaved }: Props) {
  const [result, setResult] = useState<AIProcessResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("OTHER");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [description, setDescription] = useState("");
  const [purchaseName, setPurchaseName] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [addWarranty, setAddWarranty] = useState(false);
  const [warrantyStartsOn, setWarrantyStartsOn] = useState("");
  const [warrantyEndsOn, setWarrantyEndsOn] = useState("");
  const [warrantyProvider, setWarrantyProvider] = useState("");
  const [warrantyTerms, setWarrantyTerms] = useState("");

  async function process() {
    setProcessing(true); setError(""); setSaved(""); setResult(null);
    try {
      const next = await processInboxWithAI(inboxId);
      setResult(next);
      const suggestion = next.suggestion;
      setTitle(suggestion.title ?? inboxTitle);
      setCategory((suggestion.category && DOCUMENT_CATEGORIES.includes(suggestion.category as DocumentCategory) ? suggestion.category : suggestion.kind === "receipt" ? "RECEIPT" : "OTHER") as DocumentCategory);
      setIssuedOn(suggestion.issuedOn ?? ""); setExpiresOn(suggestion.expiresOn ?? ""); setDescription(suggestion.description ?? "");
      setPurchaseName(suggestion.name ?? suggestion.title ?? inboxTitle);
      setPurchasedOn(suggestion.purchasedOn ?? suggestion.issuedOn ?? ""); setAmount(suggestion.amount ?? "");
      setCurrency(suggestion.currency ?? "INR"); setVendor(suggestion.vendor ?? ""); setNotes(suggestion.notes ?? "");
      setWarrantyStartsOn(suggestion.warrantyStartsOn ?? ""); setWarrantyEndsOn(suggestion.warrantyEndsOn ?? "");
      setWarrantyProvider(suggestion.warrantyProvider ?? ""); setWarrantyTerms(suggestion.warrantyTerms ?? "");
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : e instanceof Error ? e.message : "AI processing failed.");
    } finally { setProcessing(false); }
  }

  async function saveDocument() {
    if (!result) return;
    setSaving(true); setError("");
    try {
      await confirmInboxDocument(inboxId, { title, category, description: description || null, issuedOn: issuedOn || null, expiresOn: expiresOn || null, notes: notes || null });
      setSaved("Document saved to your Vault and linked to this Inbox item."); setResult(null); onSaved();
    } catch (e) { setError(e instanceof ApiRequestError ? e.message : "Unable to save the document."); }
    finally { setSaving(false); }
  }

  async function savePurchase() {
    if (!result) return;
    if (!purchaseName.trim() || !purchasedOn) { setError("A purchase name and purchase date are required before confirmation."); return; }
    if (addWarranty && !warrantyEndsOn) { setError("Enter the warranty end date shown on the document, or turn off warranty creation."); return; }
    setSaving(true); setError("");
    try {
      const document = await confirmInboxDocument(inboxId, { title: title || inboxTitle, category: "RECEIPT", description: description || null, issuedOn: issuedOn || null, expiresOn: expiresOn || null, notes: notes || null });
      const purchase = await createPurchase({ name: purchaseName.trim(), purchasedOn, amount: amount || null, currency, vendor: vendor || null, notes: notes || null, receiptDocumentId: document.id });
      setSaved("Purchase saved through LifeOS."); setResult(null); onSaved();
      if (addWarranty) {
        try {
          await upsertWarranty(purchase.id, { startsOn: warrantyStartsOn || null, endsOn: warrantyEndsOn, provider: warrantyProvider || null, terms: warrantyTerms || null });
          setSaved("Purchase and warranty saved through LifeOS.");
        } catch (e) {
          setError(e instanceof ApiRequestError ? `Purchase was saved, but the warranty was not: ${e.message}` : "Purchase was saved, but the warranty could not be saved. You can add it from Purchases.");
        }
      }
    } catch (e) { setError(e instanceof ApiRequestError ? e.message : "Unable to save the purchase."); }
    finally { setSaving(false); }
  }

  return <section className="space-y-3 rounded-xl border border-[var(--lifeos-border)] bg-[var(--lifeos-surface)] p-4" aria-label="AI document review">
    <div><h3 className="font-semibold">Document intelligence</h3><p className="mt-1 text-xs text-[var(--lifeos-muted)]">Optional processing sends this file to the configured AI service. If an external provider is configured, document text is sent there. Suggestions remain here until you confirm.</p></div>
    {!result ? <Button variant="secondary" disabled={processing || saving} onClick={() => void process()}>{processing ? "Extracting and analyzing…" : "Review with AI"}</Button> : null}
    {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    {saved ? <p role="status" className="text-sm text-emerald-700">{saved}</p> : null}
    {result ? <div className="space-y-4">
      <p className="text-xs text-[var(--lifeos-muted)]">Text extracted using {result.textSource === "pdf-text" ? "direct PDF text extraction" : "OCR"}. {result.externalProviderUsed ? "Analyzed by the configured external AI provider." : "Analyzed locally."}</p>
      <details className="rounded-lg border border-[var(--lifeos-border)] p-3"><summary className="cursor-pointer text-sm font-medium">View extracted text</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{result.extractedText}</pre></details>
      {result.suggestion.kind === "document" ? <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Title<input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={200}/></label>
        <label className="text-xs">Category<select className={inputClass} value={category} onChange={e => setCategory(e.target.value as DocumentCategory)}>{DOCUMENT_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}</select></label>
        <label className="text-xs">Issue date<input type="date" className={inputClass} value={issuedOn} onChange={e => setIssuedOn(e.target.value)}/></label>
        <label className="text-xs">Expiry date<input type="date" className={inputClass} value={expiresOn} onChange={e => setExpiresOn(e.target.value)}/></label>
        <label className="text-xs sm:col-span-2">Description<textarea className={inputClass} value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}/></label>
        <div className="flex gap-2 sm:col-span-2"><Button onClick={() => void saveDocument()} disabled={saving}>{saving ? "Saving…" : "Confirm document"}</Button><Button variant="secondary" onClick={() => setResult(null)} disabled={saving}>Reject suggestions</Button></div>
      </div> : <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Purchase name<input className={inputClass} value={purchaseName} onChange={e => setPurchaseName(e.target.value)} maxLength={200}/></label>
        <label className="text-xs">Purchase date<input type="date" className={inputClass} value={purchasedOn} onChange={e => setPurchasedOn(e.target.value)}/></label>
        <label className="text-xs">Total amount<input inputMode="decimal" className={inputClass} value={amount} onChange={e => setAmount(e.target.value)} placeholder="Optional"/></label>
        <label className="text-xs">Currency<input className={inputClass} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3}/></label>
        <label className="text-xs">Vendor<input className={inputClass} value={vendor} onChange={e => setVendor(e.target.value)} maxLength={200}/></label>
        <label className="text-xs">Receipt title<input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={200}/></label>
        <label className="text-xs sm:col-span-2">Purchase notes<textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} maxLength={4000}/></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={addWarranty} onChange={e => setAddWarranty(e.target.checked)}/>Also create a warranty (only if confirmed on the document)</label>
        {addWarranty ? <><label className="text-xs">Warranty provider<input className={inputClass} value={warrantyProvider} onChange={e => setWarrantyProvider(e.target.value)} maxLength={200}/></label><label className="text-xs">Warranty starts<input type="date" className={inputClass} value={warrantyStartsOn} onChange={e => setWarrantyStartsOn(e.target.value)}/></label><label className="text-xs">Warranty ends<input type="date" className={inputClass} value={warrantyEndsOn} onChange={e => setWarrantyEndsOn(e.target.value)} required/></label><label className="text-xs">Warranty terms<input className={inputClass} value={warrantyTerms} onChange={e => setWarrantyTerms(e.target.value)} maxLength={2000}/></label></> : null}
        <div className="flex gap-2 sm:col-span-2"><Button onClick={() => void savePurchase()} disabled={saving}>{saving ? "Saving…" : addWarranty ? "Confirm purchase and warranty" : "Confirm purchase"}</Button><Button variant="secondary" onClick={() => setResult(null)} disabled={saving}>Reject suggestions</Button></div>
      </div>}
      {result.suggestion.kind === "receipt" && result.suggestion.warrantyEndsOn ? <p className="text-xs text-[var(--lifeos-muted)]">The source explicitly mentions a warranty end date. Review and confirm it above; no warranty will be created unless you opt in.</p> : result.suggestion.kind === "receipt" ? <p className="text-xs text-[var(--lifeos-muted)]">No warranty end date was explicitly extracted. LifeOS will not invent one.</p> : null}
    </div> : null}
  </section>;
}
