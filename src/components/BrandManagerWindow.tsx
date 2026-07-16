import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { brandActionName } from "../utils/brandActions";
import type { BrandDocMeta } from "../types";

// ============================================================================
// Brand Library manager (Track D) — its own resizable window (brand-manager.html).
// Create/edit/delete brand docs; ingest via native file picker (P1-ingest) or
// paste-into-textarea; trigger a paste (P1-paste0 click path). Voice + hotkey
// triggering is wired in App.tsx from the synthesized brand_paste actions.
//
// GUARDRAIL: doc bodies are only ever held transiently in the editor textarea and
// sent to the backend; they are never logged.
// ============================================================================

type Status = { text: string; kind: "info" | "success" | "error" } | null;

const MAX_HOTKEY_HINT = "e.g. Control+Shift+1 — optional; leave blank for voice/click only";

export default function BrandManagerWindow() {
  const [docs, setDocs] = useState<BrandDocMeta[]>([]);
  const [status, setStatus] = useState<Status>(null);

  // Editor state (new or existing doc being edited)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [hotkey, setHotkey] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((text: string, kind: "info" | "success" | "error") => {
    setStatus({ text, kind });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<BrandDocMeta[]>("list_brands");
      setDocs(list);
    } catch (e) {
      setStatus({ text: `Could not load brand docs: ${e}`, kind: "error" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetEditor = useCallback(() => {
    setEditingId(null);
    setName("");
    setBrand("");
    setHotkey("");
    setText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // --- P1-ingest: native file picker + FileReader.readAsText -----------------
  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      // Error Visibility rule: never fail silently.
      setStatus({ text: `Could not read "${file.name}"`, kind: "error" });
    };
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setText(content);
      // Default the doc name to the file's base name if the name field is empty.
      if (!name.trim()) {
        setName(file.name.replace(/\.(txt|md)$/i, ""));
      }
      // Spike instrumentation (safe: length only, never the body).
      setStatus({
        text: `Loaded "${file.name}" — ${content.length.toLocaleString()} characters`,
        kind: "success",
      });
    };
    reader.readAsText(file);
  }, [name]);

  // --- Save / edit / delete --------------------------------------------------
  const onSave = useCallback(async () => {
    if (!name.trim()) {
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
        name: name.trim(),
        brand: brand.trim(),
        hotkey: hotkey.trim(),
        text,
      });
      // The backend save command emits "brands-changed" so the main window
      // re-hydrates its voice/hotkey list — no JS emit (blocked by event ACL).
      await refresh();
      flash(`Saved "${name.trim()}" — stored on your machine`, "success");
      resetEditor();
    } catch (e) {
      flash(`Save failed: ${e}`, "error");
    } finally {
      setBusy(false);
    }
  }, [name, brand, hotkey, text, editingId, refresh, resetEditor, flash]);

  const onEdit = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      setEditingId(doc.id);
      setName(doc.name);
      setBrand(doc.brand);
      setHotkey(doc.hotkey);
      setText(body);
      setStatus({ text: `Editing "${doc.name}"`, kind: "info" });
    } catch (e) {
      setStatus({ text: `Could not open "${doc.name}": ${e}`, kind: "error" });
    }
  }, []);

  const onDelete = useCallback(async (doc: BrandDocMeta) => {
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

  // --- P1-paste0 click path --------------------------------------------------
  // Copy is always safe. Paste hides this window first so the OS restores the
  // previously-focused app, then pastes there. (The robust zero-key path is the
  // per-doc global hotkey; this click path is the onboarding affordance.)
  const onCopy = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      await invoke("copy_to_clipboard", { text: body });
      flash(`Copied "${doc.name}" to clipboard — Ctrl+V anywhere`, "success");
    } catch (e) {
      flash(`Copy failed: ${e}`, "error");
    }
  }, [flash]);

  const onPasteToPrevious = useCallback(async (doc: BrandDocMeta) => {
    try {
      const body = await invoke<string>("load_brand_doc", { id: doc.id });
      await invoke("copy_to_clipboard", { text: body });
      // Hide this window so focus returns to the prior foreground app, then paste.
      await getCurrentWebviewWindow().hide();
      await new Promise((r) => setTimeout(r, 250));
      await invoke("paste_text");
    } catch (e) {
      // Re-show so the user isn't stranded with a hidden window on failure.
      try { await getCurrentWebviewWindow().show(); } catch { /* noop */ }
      flash(`Paste failed: ${e}`, "error");
    }
  }, [flash]);

  // Group docs by brand label for display.
  const grouped = useMemo(() => {
    const map = new Map<string, BrandDocMeta[]>();
    for (const d of docs) {
      const key = d.brand?.trim() || "Ungrouped";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [docs]);

  return (
    <div className="bm-root">
      <style>{BM_STYLES}</style>

      <header className="bm-header">
        <div>
          <h1>Brand Library</h1>
          <p className="bm-sub">
            Store brand docs once, then paste them anywhere by voice, hotkey, or click. Set a
            <strong> Brand</strong> so the spoken phrase includes it (e.g. &ldquo;paste Acme
            Testimonials&rdquo;) — that keeps same-named docs across brands from colliding. No API
            key needed to paste.
          </p>
        </div>
      </header>

      {status && <div className={`bm-status bm-status-${status.kind}`}>{status.text}</div>}

      <section className="bm-editor">
        <h2>{editingId ? "Edit document" : "New document"}</h2>
        <div className="bm-row">
          <label className="bm-field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Testimonials" />
          </label>
          <label className="bm-field">
            <span>Brand (optional)</span>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Acme" />
          </label>
          <label className="bm-field">
            <span>Hotkey (optional)</span>
            <input value={hotkey} onChange={(e) => setHotkey(e.target.value)} placeholder={MAX_HOTKEY_HINT} />
          </label>
        </div>

        <div className="bm-ingest">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={onPickFile}
          />
          <span className="bm-hint">Pick a .txt or .md file — or paste text below.</span>
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
            <button className="bm-btn" onClick={resetEditor} disabled={busy}>
              Cancel
            </button>
          )}
          <button className="bm-btn bm-btn-primary" onClick={onSave} disabled={busy}>
            {editingId ? "Save changes" : "Add document"}
          </button>
        </div>
      </section>

      <section className="bm-list">
        <h2>Documents ({docs.length})</h2>
        {docs.length === 0 && (
          <p className="bm-empty">No documents yet. Add your first one above.</p>
        )}
        {grouped.map(([groupName, groupDocs]) => (
          <div key={groupName} className="bm-group">
            <h3>{groupName}</h3>
            {groupDocs.map((doc) => (
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
                  <button className="bm-btn" onClick={() => onCopy(doc)}>Copy</button>
                  <button className="bm-btn" onClick={() => onPasteToPrevious(doc)}>Paste</button>
                  <button className="bm-btn" onClick={() => onEdit(doc)}>Edit</button>
                  <button className="bm-btn bm-btn-danger" onClick={() => onDelete(doc)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

const BM_STYLES = `
html, body { margin: 0; background: #f4f5fb; }
.bm-root { max-width: 860px; margin: 0 auto; padding: 20px 24px 48px; min-height: 100vh; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a1a2e; }
.bm-header h1 { font-size: 22px; margin: 0 0 4px; color: #111827; }
.bm-sub { margin: 0; color: #4b5563; font-size: 13px; max-width: 640px; }
.bm-status { margin: 14px 0; padding: 9px 12px; border-radius: 8px; font-size: 13px; }
.bm-status-info { background: #eef2ff; color: #3730a3; }
.bm-status-success { background: #ecfdf5; color: #065f46; }
.bm-status-error { background: #fef2f2; color: #991b1b; }
.bm-editor, .bm-list { margin-top: 18px; }
.bm-editor h2, .bm-list h2 { font-size: 15px; margin: 0 0 10px; }
.bm-row { display: flex; gap: 12px; flex-wrap: wrap; }
.bm-field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 180px; font-size: 12px; color: #444; }
.bm-field input { padding: 7px 9px; border: 1px solid #d0d0e0; border-radius: 7px; font-size: 13px; color: #1a1a2e; }
.bm-ingest { display: flex; align-items: center; gap: 10px; margin: 12px 0 8px; flex-wrap: wrap; }
.bm-hint { color: #4b5563; font-size: 12px; }
.bm-body { width: 100%; min-height: 180px; resize: vertical; padding: 10px; border: 1px solid #d0d0e0; border-radius: 8px; font-family: ui-monospace, "Cascadia Code", monospace; font-size: 12.5px; line-height: 1.5; color: #1a1a2e; }
.bm-editor-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.bm-spacer { flex: 1; }
.bm-btn { padding: 7px 13px; border: 1px solid #d0d0e0; background: #fff; border-radius: 7px; font-size: 13px; cursor: pointer; color: #1a1a2e; }
.bm-btn:hover { background: #f5f5fb; }
.bm-btn:disabled { opacity: 0.5; cursor: default; }
.bm-btn-primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.bm-btn-primary:hover { background: #4338ca; }
.bm-btn-danger { color: #b91c1c; border-color: #f0c0c0; }
.bm-btn-danger:hover { background: #fef2f2; }
.bm-empty { color: #4b5563; font-size: 13px; }
.bm-group { margin-bottom: 14px; }
.bm-group h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; font-weight: 700; margin: 0 0 6px; }
.bm-doc { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border: 1px solid #d7d9e6; border-radius: 8px; margin-bottom: 6px; background: #fff; }
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
  .bm-header h1 { color: #f3f4f8; }
  .bm-sub, .bm-field, .bm-hint, .bm-doc-sub, .bm-group h3, .bm-empty { color: #b4b6cc; }
  .bm-doc-how { color: #c7c9de; }
  .bm-doc-how strong { color: #eceeff; }
  .bm-kbd { background: #2a2a44; border-color: #3d3d5c; color: #e8e8f0; }
  .bm-field input, .bm-body { background: #1a1a2e; border-color: #33334d; color: #e8e8f0; }
  .bm-btn { background: #26263d; border-color: #33334d; color: #e8e8f0; }
  .bm-btn:hover { background: #2f2f4a; }
  .bm-doc { border-color: #2a2a40; background: #1c1c30; }
  .bm-status-info { background: #1e1b4b; color: #c7d2fe; }
  .bm-status-success { background: #064e3b; color: #a7f3d0; }
  .bm-status-error { background: #4c1d1d; color: #fca5a5; }
}
`;
