import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { brandActionName } from "../utils/brandActions";
import type { BrandLibrary, BrandDocMeta } from "../types";

// ============================================================================
// Brand Library manager (Track D round 2) — brand-CONTAINER model.
// Two views in one window: (1) brands list — create/open/rename/delete brands;
// (2) brand detail — the docs inside a brand + the upload form scoped to it.
// A brand is a folder; docs live inside it. Voice trigger = "paste {brand} {name}".
//
// GUARDRAIL: doc bodies are only ever held transiently in the editor textarea and
// sent to the backend; they are never logged.
// ============================================================================

type Status = { text: string; kind: "info" | "success" | "error" } | null;
type View = { kind: "list" } | { kind: "brand"; name: string };

const HOTKEY_HINT = "e.g. Control+Shift+1 — optional; leave blank for voice/click only";

export default function BrandManagerWindow() {
  const [library, setLibrary] = useState<BrandLibrary>({ brands: [], docs: [] });
  const [view, setView] = useState<View>({ kind: "list" });
  const [status, setStatus] = useState<Status>(null);

  // New-brand input (list view)
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // Doc editor (brand detail view)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [hotkey, setHotkey] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((text: string, kind: "info" | "success" | "error") => {
    setStatus({ text, kind });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const lib = await invoke<BrandLibrary>("list_brands");
      setLibrary({ brands: lib.brands ?? [], docs: lib.docs ?? [] });
    } catch (e) {
      setStatus({ text: `Could not load the brand library: ${e}`, kind: "error" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetEditor = useCallback(() => {
    setEditingId(null);
    setDocName("");
    setHotkey("");
    setText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // --- Brand (folder) operations --------------------------------------------
  const openBrand = useCallback((name: string) => {
    resetEditor();
    setStatus(null);
    setView({ kind: "brand", name });
  }, [resetEditor]);

  const onCreateBrand = useCallback(async () => {
    const name = newBrandName.trim();
    if (!name) {
      flash("Give the brand a name first", "error");
      return;
    }
    setBusy(true);
    try {
      await invoke("create_brand", { name });
      await refresh();
      setNewBrandName("");
      setNewBrandOpen(false);
      openBrand(name); // drop straight into the new brand so you can add docs
    } catch (e) {
      flash(`Could not create brand: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [newBrandName, refresh, openBrand, flash]);

  const onRenameBrand = useCallback(async (oldName: string) => {
    const next = window.prompt(`Rename brand "${oldName}" to:`, oldName);
    if (next == null) return;
    const newName = next.trim();
    if (!newName || newName === oldName) return;
    setBusy(true);
    try {
      await invoke("rename_brand", { oldName, newName });
      await refresh();
      setView((v) => (v.kind === "brand" && v.name === oldName ? { kind: "brand", name: newName } : v));
      flash(`Renamed to "${newName}"`, "success");
    } catch (e) {
      flash(`Rename failed: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [refresh, flash]);

  const onDeleteBrand = useCallback(async (name: string, docCount: number) => {
    const msg =
      docCount > 0
        ? `Delete brand "${name}" and its ${docCount} document${docCount === 1 ? "" : "s"}? This cannot be undone.`
        : `Delete brand "${name}"?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await invoke("delete_brand", { name });
      await refresh();
      setView({ kind: "list" });
      flash(`Deleted "${name}"`, "success");
    } catch (e) {
      flash(`Delete failed: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [refresh, flash]);

  // --- Ingestion (P1-ingest): native picker + FileReader --------------------
  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setStatus({ text: `Could not read "${file.name}"`, kind: "error" });
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText(content);
      if (!docName.trim()) setDocName(file.name.replace(/\.(txt|md|csv)$/i, ""));
      setStatus({
        text: `Loaded "${file.name}" — ${content.length.toLocaleString()} characters`,
        kind: "success",
      });
    };
    reader.readAsText(file);
  }, [docName]);

  // --- Doc operations (scoped to the open brand) ----------------------------
  const currentBrand = view.kind === "brand" ? view.name : "";

  const onSaveDoc = useCallback(async () => {
    if (!docName.trim()) {
      flash("Give the document a name first", "error");
      return;
    }
    if (!text) {
      flash("The document is empty — pick a file or paste some text", "error");
      return;
    }
    setBusy(true);
    try {
      const id = editingId ?? crypto.randomUUID();
      await invoke<BrandDocMeta>("save_brand_doc", {
        id,
        name: docName.trim(),
        brand: currentBrand,
        hotkey: hotkey.trim(),
        text,
      });
      // Backend emits "brands-changed" so the main window re-hydrates.
      await refresh();
      flash(`Saved "${docName.trim()}" to ${currentBrand}`, "success");
      resetEditor();
    } catch (e) {
      flash(`Save failed: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [docName, text, hotkey, editingId, currentBrand, refresh, resetEditor, flash]);

  const onEditDoc = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      setEditingId(doc.id);
      setDocName(doc.name);
      setHotkey(doc.hotkey);
      setText(body);
      setStatus({ text: `Editing "${doc.name}"`, kind: "info" });
    } catch (e) {
      setStatus({ text: `Could not open "${doc.name}": ${e}`, kind: "error" });
    }
  }, []);

  const onDeleteDoc = useCallback(async (doc: BrandDocMeta) => {
    if (!window.confirm(`Delete document "${doc.name}"?`)) return;
    setBusy(true);
    try {
      await invoke("delete_brand_doc", { id: doc.id });
      await refresh();
      if (editingId === doc.id) resetEditor();
      flash(`Deleted "${doc.name}"`, "success");
    } catch (e) {
      flash(`Delete failed: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [refresh, editingId, resetEditor, flash]);

  // --- Paste triggers (P1-paste0 click path) --------------------------------
  const onCopy = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      await invoke("copy_to_clipboard", { text: body });
      flash(`Copied "${doc.name}" — Ctrl+V anywhere`, "success");
    } catch (e) {
      flash(`Copy failed: ${e}`, "error");
    }
  }, [flash]);

  const onPasteToPrevious = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      await invoke("copy_to_clipboard", { text: body });
      await getCurrentWebviewWindow().hide();
      await new Promise((r) => setTimeout(r, 250));
      await invoke("paste_text");
    } catch (e) {
      try { await getCurrentWebviewWindow().show(); } catch { /* noop */ }
      flash(`Paste failed: ${e}`, "error");
    }
  }, [flash]);

  // Doc count per brand (for the list cards).
  const docCountByBrand = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of library.docs) {
      const k = d.brand.trim().toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [library.docs]);

  const docsInCurrentBrand = useMemo(
    () =>
      view.kind === "brand"
        ? library.docs.filter((d) => d.brand.trim().toLowerCase() === view.name.trim().toLowerCase())
        : [],
    [library.docs, view]
  );

  const sortedBrands = useMemo(
    () => [...library.brands].sort((a, b) => a.name.localeCompare(b.name)),
    [library.brands]
  );

  return (
    <div className="bm-root">
      <style>{BM_STYLES}</style>

      {status && <div className={`bm-status bm-status-${status.kind}`}>{status.text}</div>}

      {view.kind === "list" ? (
        // ================= BRANDS LIST =================
        <>
          <header className="bm-header">
            <h1>Brand Library</h1>
            <p className="bm-sub">
              Organize documents into brands (folders). Open a brand to add docs, then paste any doc
              anywhere by saying <em>&ldquo;paste {"{brand}"} {"{name}"}&rdquo;</em>, a hotkey, or a click.
            </p>
          </header>

          {sortedBrands.length === 0 && !newBrandOpen ? (
            <div className="bm-empty-cta">
              <p>No brands yet. Create your first one to get started.</p>
              <button className="bm-btn bm-btn-primary bm-btn-lg" onClick={() => setNewBrandOpen(true)}>
                + Start a new brand
              </button>
            </div>
          ) : (
            <>
              {newBrandOpen ? (
                <div className="bm-newbrand">
                  <input
                    autoFocus
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void onCreateBrand();
                      if (e.key === "Escape") { setNewBrandOpen(false); setNewBrandName(""); }
                    }}
                    placeholder="Brand name (e.g. Athletes Acceleration) — Enter to create"
                  />
                  <button className="bm-btn bm-btn-primary" onClick={onCreateBrand} disabled={busy}>
                    Create
                  </button>
                  <button className="bm-btn" onClick={() => { setNewBrandOpen(false); setNewBrandName(""); }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="bm-btn bm-btn-primary" onClick={() => setNewBrandOpen(true)}>
                  + New brand
                </button>
              )}

              <div className="bm-brand-grid">
                {sortedBrands.map((b) => {
                  const count = docCountByBrand.get(b.name.trim().toLowerCase()) ?? 0;
                  return (
                    <div key={b.name} className="bm-brand-card" onClick={() => openBrand(b.name)}>
                      <div className="bm-brand-card-main">
                        <span className="bm-brand-name">{b.name}</span>
                        <span className="bm-brand-count">
                          {count} document{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="bm-brand-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="bm-btn bm-btn-sm" onClick={() => openBrand(b.name)}>Open</button>
                        <button className="bm-btn bm-btn-sm" onClick={() => onRenameBrand(b.name)}>Rename</button>
                        <button
                          className="bm-btn bm-btn-sm bm-btn-danger"
                          onClick={() => onDeleteBrand(b.name, count)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        // ================= BRAND DETAIL =================
        <>
          <div className="bm-detail-head">
            <button className="bm-back" onClick={() => { setView({ kind: "list" }); resetEditor(); }}>
              ← All brands
            </button>
            <h1>{view.name}</h1>
            <div className="bm-spacer" />
            <button className="bm-btn bm-btn-sm" onClick={() => onRenameBrand(view.name)}>Rename</button>
            <button
              className="bm-btn bm-btn-sm bm-btn-danger"
              onClick={() => onDeleteBrand(view.name, docsInCurrentBrand.length)}
              disabled={busy}
            >
              Delete brand
            </button>
          </div>

          <section className="bm-editor">
            <h2>{editingId ? "Edit document" : "Add a document"}</h2>
            <div className="bm-row">
              <label className="bm-field bm-field-grow">
                <span>Name</span>
                <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Testimonials" />
              </label>
              <label className="bm-field">
                <span>Hotkey (optional)</span>
                <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} placeholder={HOTKEY_HINT} />
              </label>
            </div>

            <div className="bm-ingest">
              <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,text/plain" onChange={onPickFile} />
              <span className="bm-hint">Pick a .txt / .md / .csv — or paste text below.</span>
            </div>

            <textarea
              className="bm-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the document text here, or load a file above…"
              spellCheck={false}
            />
            <div className="bm-editor-actions">
              <span className="bm-hint">{text.length.toLocaleString()} characters</span>
              <div className="bm-spacer" />
              {editingId && (
                <button className="bm-btn" onClick={resetEditor} disabled={busy}>Cancel</button>
              )}
              <button className="bm-btn bm-btn-primary" onClick={onSaveDoc} disabled={busy}>
                {editingId ? "Save changes" : "Add document"}
              </button>
            </div>
          </section>

          <section className="bm-list">
            <h2>Documents ({docsInCurrentBrand.length})</h2>
            {docsInCurrentBrand.length === 0 && (
              <p className="bm-empty">No documents in this brand yet. Add one above.</p>
            )}
            {docsInCurrentBrand.map((doc) => (
              <div key={doc.id} className="bm-doc">
                <div className="bm-doc-meta">
                  <span className="bm-doc-name">{doc.name}</span>
                  <span className="bm-doc-sub">{(doc.bytes / 1024).toFixed(1)} KB stored</span>
                  <span className="bm-doc-how">
                    <strong>How to use:</strong> put your cursor in any text box, then say
                    {" "}<span className="bm-kbd">&ldquo;{brandActionName(doc)}&rdquo;</span>
                    {doc.hotkey
                      ? <> or press <span className="bm-kbd">{doc.hotkey}</span></>
                      : <> — or set a hotkey via <em>Edit</em> for a one-key paste</>}.
                  </span>
                </div>
                <div className="bm-doc-actions">
                  <button className="bm-btn bm-btn-sm" onClick={() => onCopy(doc)}>Copy</button>
                  <button className="bm-btn bm-btn-sm" onClick={() => onPasteToPrevious(doc)}>Paste</button>
                  <button className="bm-btn bm-btn-sm" onClick={() => onEditDoc(doc)}>Edit</button>
                  <button className="bm-btn bm-btn-sm bm-btn-danger" onClick={() => onDeleteDoc(doc)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

const BM_STYLES = `
html, body { margin: 0; background: #f4f5fb; }
.bm-root { max-width: 880px; margin: 0 auto; padding: 20px 24px 48px; min-height: 100vh; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a1a2e; }
.bm-header h1 { font-size: 22px; margin: 0 0 4px; color: #111827; }
.bm-sub { margin: 0 0 16px; color: #4b5563; font-size: 13px; max-width: 660px; }
.bm-status { margin: 0 0 14px; padding: 9px 12px; border-radius: 8px; font-size: 13px; }
.bm-status-info { background: #eef2ff; color: #3730a3; }
.bm-status-success { background: #ecfdf5; color: #065f46; }
.bm-status-error { background: #fef2f2; color: #991b1b; }
.bm-empty-cta { text-align: center; padding: 48px 16px; }
.bm-empty-cta p { color: #4b5563; font-size: 14px; margin: 0 0 16px; }
.bm-newbrand { display: flex; gap: 8px; margin-bottom: 14px; }
.bm-newbrand input { flex: 1; padding: 9px 11px; border: 1px solid #d0d0e0; border-radius: 8px; font-size: 14px; color: #1a1a2e; }
.bm-brand-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-top: 14px; }
.bm-brand-card { border: 1px solid #d7d9e6; border-radius: 10px; background: #fff; padding: 14px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.bm-brand-card:hover { border-color: #4f46e5; box-shadow: 0 2px 8px rgba(79,70,229,.08); }
.bm-brand-card-main { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
.bm-brand-name { font-size: 16px; font-weight: 700; color: #111827; }
.bm-brand-count { font-size: 12px; color: #6b7280; }
.bm-brand-card-actions { display: flex; gap: 6px; }
.bm-detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.bm-detail-head h1 { font-size: 20px; margin: 0; color: #111827; }
.bm-back { background: none; border: none; color: #4f46e5; font-size: 13px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.bm-back:hover { background: #eef0f7; }
.bm-editor, .bm-list { margin-top: 6px; }
.bm-editor h2, .bm-list h2 { font-size: 15px; margin: 0 0 10px; color: #1f2937; }
.bm-row { display: flex; gap: 12px; flex-wrap: wrap; }
.bm-field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 200px; font-size: 12px; color: #374151; }
.bm-field-grow { flex: 2 1 260px; }
.bm-field input { padding: 8px 10px; border: 1px solid #d0d0e0; border-radius: 7px; font-size: 13px; color: #1a1a2e; }
.bm-ingest { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; flex-wrap: wrap; }
.bm-hint { color: #4b5563; font-size: 12px; }
.bm-body { width: 100%; min-height: 170px; resize: vertical; padding: 10px; border: 1px solid #d0d0e0; border-radius: 8px; font-family: ui-monospace, "Cascadia Code", monospace; font-size: 12.5px; line-height: 1.5; color: #1a1a2e; box-sizing: border-box; }
.bm-editor-actions { display: flex; align-items: center; gap: 8px; margin: 10px 0 24px; }
.bm-spacer { flex: 1; }
.bm-btn { padding: 7px 13px; border: 1px solid #d0d0e0; background: #fff; border-radius: 7px; font-size: 13px; cursor: pointer; color: #1a1a2e; }
.bm-btn:hover { background: #f5f5fb; }
.bm-btn:disabled { opacity: 0.5; cursor: default; }
.bm-btn-sm { padding: 5px 10px; font-size: 12px; }
.bm-btn-lg { padding: 11px 20px; font-size: 15px; }
.bm-btn-primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.bm-btn-primary:hover { background: #4338ca; }
.bm-btn-danger { color: #b91c1c; border-color: #f0c0c0; }
.bm-btn-danger:hover { background: #fef2f2; }
.bm-empty { color: #4b5563; font-size: 13px; }
.bm-doc { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #d7d9e6; border-radius: 8px; margin-bottom: 6px; background: #fff; }
.bm-doc-meta { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.bm-doc-name { font-size: 14px; font-weight: 600; }
.bm-doc-sub { font-size: 11px; color: #6b7280; }
.bm-doc-how { font-size: 12px; color: #374151; line-height: 1.5; margin-top: 2px; }
.bm-doc-how strong { color: #1f2937; }
.bm-kbd { display: inline-block; padding: 1px 6px; background: #eef0f7; border: 1px solid #d0d3e2; border-radius: 5px; font-size: 11px; font-family: ui-monospace, "Cascadia Code", monospace; color: #1f2937; white-space: nowrap; }
.bm-doc-actions { display: flex; gap: 6px; flex-shrink: 0; }
@media (prefers-color-scheme: dark) {
  html, body { background: #14142a; }
  .bm-root { color: #e8e8f0; }
  .bm-header h1, .bm-brand-name, .bm-detail-head h1 { color: #f3f4f8; }
  .bm-sub, .bm-field, .bm-hint, .bm-doc-sub, .bm-empty, .bm-brand-count, .bm-empty-cta p { color: #b4b6cc; }
  .bm-editor h2, .bm-list h2, .bm-doc-how, .bm-doc-how strong { color: #dfe0ee; }
  .bm-field input, .bm-body, .bm-newbrand input { background: #1a1a2e; border-color: #33334d; color: #e8e8f0; }
  .bm-btn { background: #26263d; border-color: #33334d; color: #e8e8f0; }
  .bm-btn:hover { background: #2f2f4a; }
  .bm-brand-card, .bm-doc { border-color: #2a2a40; background: #1c1c30; }
  .bm-brand-card:hover { border-color: #6d64f5; }
  .bm-back:hover { background: #26263d; }
  .bm-kbd { background: #2a2a44; border-color: #3d3d5c; color: #e8e8f0; }
  .bm-status-info { background: #1e1b4b; color: #c7d2fe; }
  .bm-status-success { background: #064e3b; color: #a7f3d0; }
  .bm-status-error { background: #4c1d1d; color: #fca5a5; }
}
`;
