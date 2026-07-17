//! Brand Asset Library storage (Track D / P1-store).
//!
//! Brand documents live as plain-text files under `<config_dir>/SpeakEasy/brands/`,
//! one `.txt` per doc, with a lightweight `brands.json` index holding metadata only
//! (id/name/brand/hotkey/byte-count/timestamps — **never the body**). This store is
//! deliberately kept SEPARATE from `config.json` (MASTER-PLAN §5b): a settings save
//! must never clobber brand docs, and the browser localStorage ~5 MB cap never
//! applies (these are real files on disk, drive-limited).
//!
//! GUARDRAIL (MASTER-PLAN §9 / P0-logscrub): never log a document body. Log lines
//! carry only the doc name/id and a byte count.
//!
//! Ids are generated JS-side via `crypto.randomUUID()` (mirrors action ids). They
//! are sanitized here before touching the filesystem so a hostile/malformed id can
//! never traverse out of the brands dir.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Metadata for one brand document. Every field is `#[serde(default)]` so a single
/// malformed entry can never fail the whole-index parse (mirrors the config.rs
/// discipline — the index is read with `unwrap_or_default`, so a parse failure
/// would otherwise silently wipe every doc's metadata).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BrandDocMeta {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    /// Optional grouping label ("" = ungrouped).
    #[serde(default)]
    pub brand: String,
    /// Optional global hotkey ("" = voice/click only, no global registration).
    #[serde(default)]
    pub hotkey: String,
    /// Body size in bytes — for display + safe logging (NEVER the body itself).
    #[serde(default)]
    pub bytes: u64,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// A brand = a named container ("folder") for documents. Modeled by NAME (unique);
/// a brand persists even with zero docs (owner creates the brand first, then fills
/// it). Docs reference their brand by the same name string (denormalized so the
/// voice path needs no join).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BrandMeta {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// The `brands.json` index: the brand containers + doc metadata. Bodies are NOT
/// stored here — one `<id>.txt` per doc.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BrandsIndex {
    #[serde(default)]
    pub brands: Vec<BrandMeta>,
    #[serde(default)]
    pub docs: Vec<BrandDocMeta>,
}

/// The full library payload returned to the frontend (brands + docs).
pub type BrandLibrary = BrandsIndex;

/// `<config_dir>/SpeakEasy/brands/` — created if missing (clone of config.rs).
fn get_brands_dir() -> Result<PathBuf> {
    let config_dir =
        dirs::config_dir().ok_or_else(|| anyhow!("Could not find config directory"))?;
    let dir = config_dir.join("SpeakEasy").join("brands");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn index_path_in(dir: &Path) -> PathBuf {
    dir.join("brands.json")
}

fn load_index_in(dir: &Path) -> BrandsIndex {
    let path = index_path_in(dir);
    let mut index: BrandsIndex = if path.exists() {
        match fs::read_to_string(&path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => BrandsIndex::default(),
        }
    } else {
        BrandsIndex::default()
    };
    // Persist a one-time migration (docs-only → docs + brands) so derived brand
    // containers are durable — otherwise an empty derived brand could vanish before
    // the first write. After the first save this is a no-op (nothing to backfill).
    if backfill_brands(&mut index) {
        let _ = save_index_in(dir, &index);
    }
    index
}

/// Migration: an old `brands.json` (round 1) had only `docs`, each carrying a free-text
/// `brand` name and no `brands` list. Ensure every distinct non-empty `doc.brand` has a
/// `BrandMeta`, so the owner's existing docs appear as brand containers on first load.
/// Idempotent — a no-op once the brands list is in sync.
fn backfill_brands(index: &mut BrandsIndex) -> bool {
    let mut changed = false;
    for doc in &index.docs {
        let name = doc.brand.trim();
        if !name.is_empty() && !brand_exists(&index.brands, name) {
            index.brands.push(BrandMeta {
                name: name.to_string(),
                created_at: now_iso(),
                updated_at: now_iso(),
            });
            changed = true;
        }
    }
    changed
}

/// Case-insensitive brand-name lookup (brand names are unique folder names).
fn brand_exists(brands: &[BrandMeta], name: &str) -> bool {
    brands.iter().any(|b| b.name.eq_ignore_ascii_case(name.trim()))
}

fn save_index_in(dir: &Path, index: &BrandsIndex) -> Result<()> {
    let contents = serde_json::to_string_pretty(index)?;
    fs::write(index_path_in(dir), contents)?;
    Ok(())
}

/// Reject any id that isn't the safe `crypto.randomUUID()` charset so a doc file
/// path can never escape the brands dir (defense against path traversal).
fn sanitize_id(id: &str) -> Result<String> {
    if !id.is_empty()
        && id.len() <= 64
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        Ok(id.to_string())
    } else {
        Err(anyhow!("Invalid brand doc id"))
    }
}

fn doc_path_in(dir: &Path, id: &str) -> Result<PathBuf> {
    let safe = sanitize_id(id)?;
    Ok(dir.join(format!("{}.txt", safe)))
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

// ---------------------------------------------------------------------------
// Directory-injectable core (unit-testable against a temp dir) + thin public
// wrappers that bind to the real <config_dir>/SpeakEasy/brands/.
// ---------------------------------------------------------------------------

fn list_brands_in(dir: &Path) -> BrandsIndex {
    load_index_in(dir)
}

fn create_brand_in(dir: &Path, name: &str) -> Result<()> {
    let name = name.trim();
    if name.is_empty() {
        return Err(anyhow!("Brand name is required"));
    }
    let mut index = load_index_in(dir);
    if !brand_exists(&index.brands, name) {
        let now = now_iso();
        index.brands.push(BrandMeta {
            name: name.to_string(),
            created_at: now.clone(),
            updated_at: now,
        });
        save_index_in(dir, &index)?;
    }
    Ok(())
}

fn rename_brand_in(dir: &Path, old_name: &str, new_name: &str) -> Result<()> {
    let old_name = old_name.trim();
    let new_name = new_name.trim();
    if new_name.is_empty() {
        return Err(anyhow!("New brand name is required"));
    }
    let mut index = load_index_in(dir);
    // Reject a rename that would collide with a different existing brand.
    if !old_name.eq_ignore_ascii_case(new_name) && brand_exists(&index.brands, new_name) {
        return Err(anyhow!("A brand named '{}' already exists", new_name));
    }
    let now = now_iso();
    for b in index.brands.iter_mut() {
        if b.name.eq_ignore_ascii_case(old_name) {
            b.name = new_name.to_string();
            b.updated_at = now.clone();
        }
    }
    // Cascade: every doc in the old brand now points at the new name.
    for d in index.docs.iter_mut() {
        if d.brand.eq_ignore_ascii_case(old_name) {
            d.brand = new_name.to_string();
            d.updated_at = now.clone();
        }
    }
    save_index_in(dir, &index)?;
    Ok(())
}

fn delete_brand_in(dir: &Path, name: &str) -> Result<()> {
    let name = name.trim();
    let mut index = load_index_in(dir);
    // Delete every doc body in this brand, then drop the docs + the brand entry.
    let doomed: Vec<String> = index
        .docs
        .iter()
        .filter(|d| d.brand.eq_ignore_ascii_case(name))
        .map(|d| d.id.clone())
        .collect();
    for id in &doomed {
        if let Ok(path) = doc_path_in(dir, id) {
            if path.exists() {
                fs::remove_file(path)?;
            }
        }
    }
    index.docs.retain(|d| !d.brand.eq_ignore_ascii_case(name));
    index.brands.retain(|b| !b.name.eq_ignore_ascii_case(name));
    save_index_in(dir, &index)?;
    Ok(())
}

fn save_brand_doc_in(
    dir: &Path,
    id: &str,
    name: &str,
    brand: &str,
    hotkey: &str,
    text: &str,
) -> Result<BrandDocMeta> {
    let safe = sanitize_id(id)?;
    // Body first, so an index entry never references a missing file.
    fs::write(doc_path_in(dir, &safe)?, text)?;

    let bytes = text.len() as u64;
    let now = now_iso();
    let mut index = load_index_in(dir);
    // Ensure the brand container exists (create-if-missing) so a doc's brand is
    // always a real folder in the list.
    if !brand.trim().is_empty() && !brand_exists(&index.brands, brand) {
        index.brands.push(BrandMeta {
            name: brand.trim().to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        });
    }
    if let Some(existing) = index.docs.iter_mut().find(|d| d.id == safe) {
        existing.name = name.to_string();
        existing.brand = brand.to_string();
        existing.hotkey = hotkey.to_string();
        existing.bytes = bytes;
        existing.updated_at = now;
    } else {
        index.docs.push(BrandDocMeta {
            id: safe.clone(),
            name: name.to_string(),
            brand: brand.to_string(),
            hotkey: hotkey.to_string(),
            bytes,
            created_at: now.clone(),
            updated_at: now,
        });
    }
    save_index_in(dir, &index)?;

    index
        .docs
        .into_iter()
        .find(|d| d.id == safe)
        .ok_or_else(|| anyhow!("Saved doc missing from index"))
}

fn load_brand_doc_in(dir: &Path, id: &str) -> Result<String> {
    let path = doc_path_in(dir, id)?;
    fs::read_to_string(&path).map_err(|e| anyhow!("Could not read brand doc: {}", e))
}

fn delete_brand_doc_in(dir: &Path, id: &str) -> Result<()> {
    let safe = sanitize_id(id)?;
    let path = doc_path_in(dir, &safe)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    let mut index = load_index_in(dir);
    index.docs.retain(|d| d.id != safe);
    save_index_in(dir, &index)?;
    Ok(())
}

/// Return the full library: brand containers + doc metadata (no bodies).
pub fn list_brands() -> BrandLibrary {
    match get_brands_dir() {
        Ok(dir) => list_brands_in(&dir),
        Err(_) => BrandsIndex::default(),
    }
}

/// Create an (initially empty) brand container. No-op if it already exists.
pub fn create_brand(name: &str) -> Result<()> {
    let dir = get_brands_dir()?;
    create_brand_in(&dir, name)?;
    log::info!("Created brand '{}'", name.trim());
    Ok(())
}

/// Rename a brand and cascade the new name onto all of its docs.
pub fn rename_brand(old_name: &str, new_name: &str) -> Result<()> {
    let dir = get_brands_dir()?;
    rename_brand_in(&dir, old_name, new_name)?;
    log::info!("Renamed brand '{}' -> '{}'", old_name.trim(), new_name.trim());
    Ok(())
}

/// Delete a brand AND every document inside it (bodies + index entries).
pub fn delete_brand(name: &str) -> Result<()> {
    let dir = get_brands_dir()?;
    delete_brand_in(&dir, name)?;
    log::info!("Deleted brand '{}' (and its docs)", name.trim());
    Ok(())
}

/// Create or update a brand doc: write `<id>.txt`, upsert the index entry.
/// `id` is caller-generated (JS `crypto.randomUUID()`); it is sanitized here.
pub fn save_brand_doc(
    id: &str,
    name: &str,
    brand: &str,
    hotkey: &str,
    text: &str,
) -> Result<BrandDocMeta> {
    let dir = get_brands_dir()?;
    let meta = save_brand_doc_in(&dir, id, name, brand, hotkey, text)?;
    // SAFE LOG: name + byte count only — never the body (§9 / P0-logscrub).
    log::info!("Saved brand doc '{}' ({} bytes)", name, meta.bytes);
    Ok(meta)
}

/// Read a doc body. The ONLY path that returns a body — bodies are lazy-loaded
/// at paste time, never held in the index or logged.
pub fn load_brand_doc(id: &str) -> Result<String> {
    let dir = get_brands_dir()?;
    load_brand_doc_in(&dir, id)
}

/// Delete a doc's body file and its index entry.
pub fn delete_brand_doc(id: &str) -> Result<()> {
    let dir = get_brands_dir()?;
    delete_brand_doc_in(&dir, id)?;
    log::info!("Deleted brand doc id '{}'", sanitize_id(id).unwrap_or_default());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Unique temp dir per test run (no external tempfile/uuid crate needed).
    fn temp_brands_dir(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("speakeasy-brands-test-{}-{}", tag, nanos));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn sanitize_id_accepts_uuid_and_rejects_traversal() {
        assert!(sanitize_id("2f1c9a3e-7b4d-4c2a-9f10-abc123def456").is_ok());
        assert!(sanitize_id("simple123").is_ok());
        assert!(sanitize_id("").is_err());
        assert!(sanitize_id("../etc/passwd").is_err());
        assert!(sanitize_id("a/b").is_err());
        assert!(sanitize_id("a.txt").is_err());
        assert!(sanitize_id("a b").is_err());
    }

    #[test]
    fn save_list_load_delete_roundtrip_persists() {
        let dir = temp_brands_dir("roundtrip");
        let id = "2f1c9a3e-7b4d-4c2a-9f10-abc123def456";
        let body = "Testimonial one.\nTestimonial two.";

        // Save
        let meta = save_brand_doc_in(&dir, id, "Testimonials", "Acme", "Control+Shift+1", body).unwrap();
        assert_eq!(meta.id, id);
        assert_eq!(meta.name, "Testimonials");
        assert_eq!(meta.brand, "Acme");
        assert_eq!(meta.hotkey, "Control+Shift+1");
        assert_eq!(meta.bytes, body.len() as u64);

        // The body file + index exist on disk (survives a "restart" = a fresh read).
        assert!(dir.join(format!("{}.txt", id)).exists());
        assert!(index_path_in(&dir).exists());

        // List (metadata only, no body). Saving a doc also registers its brand.
        let lib = list_brands_in(&dir);
        assert_eq!(lib.docs.len(), 1);
        assert_eq!(lib.docs[0].name, "Testimonials");
        assert!(brand_exists(&lib.brands, "Acme"), "doc's brand auto-registered");

        // Load returns the exact body
        assert_eq!(load_brand_doc_in(&dir, id).unwrap(), body);

        // Update in place (same id) doesn't duplicate the entry
        let body2 = "Rewritten.";
        save_brand_doc_in(&dir, id, "Testimonials v2", "Acme", "", body2).unwrap();
        let lib = list_brands_in(&dir);
        assert_eq!(lib.docs.len(), 1);
        assert_eq!(lib.docs[0].name, "Testimonials v2");
        assert_eq!(load_brand_doc_in(&dir, id).unwrap(), body2);

        // Delete removes both the body file and the index entry
        delete_brand_doc_in(&dir, id).unwrap();
        assert!(!dir.join(format!("{}.txt", id)).exists());
        assert!(list_brands_in(&dir).docs.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn create_empty_brand_persists() {
        let dir = temp_brands_dir("create-empty");
        create_brand_in(&dir, "Athletes Acceleration").unwrap();
        let lib = list_brands_in(&dir);
        assert_eq!(lib.brands.len(), 1);
        assert_eq!(lib.brands[0].name, "Athletes Acceleration");
        assert!(lib.docs.is_empty(), "brand exists with zero docs");
        // Idempotent + case-insensitive: no duplicate.
        create_brand_in(&dir, "athletes acceleration").unwrap();
        assert_eq!(list_brands_in(&dir).brands.len(), 1);
        assert!(create_brand_in(&dir, "   ").is_err(), "blank name rejected");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn backfill_creates_brands_from_legacy_docs_only_index() {
        // Simulate a round-1 brands.json: docs only, no `brands` array — exactly the
        // owner's on-disk shape (brand "Athletes Acceleration", name "Testimonials").
        let dir = temp_brands_dir("backfill");
        let legacy = r#"{"docs":[{"id":"d1","name":"Testimonials","brand":"Athletes Acceleration","hotkey":"","bytes":10,"created_at":"t","updated_at":"t"}]}"#;
        fs::write(index_path_in(&dir), legacy).unwrap();

        let lib = list_brands_in(&dir);
        assert_eq!(lib.docs.len(), 1, "existing doc preserved (not lost)");
        assert!(
            brand_exists(&lib.brands, "Athletes Acceleration"),
            "legacy doc's brand backfilled as a container"
        );
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rename_brand_cascades_to_docs() {
        let dir = temp_brands_dir("rename");
        save_brand_doc_in(&dir, "d1", "Testimonials", "Acme", "", "x").unwrap();
        rename_brand_in(&dir, "Acme", "Acme Corp").unwrap();
        let lib = list_brands_in(&dir);
        assert!(brand_exists(&lib.brands, "Acme Corp"));
        assert!(!brand_exists(&lib.brands, "Acme"));
        assert_eq!(lib.docs[0].brand, "Acme Corp", "doc followed the rename");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn delete_brand_cascades_and_removes_bodies() {
        let dir = temp_brands_dir("delete-cascade");
        save_brand_doc_in(&dir, "d1", "Testimonials", "Acme", "", "body1").unwrap();
        save_brand_doc_in(&dir, "d2", "Case Studies", "Acme", "", "body2").unwrap();
        save_brand_doc_in(&dir, "d3", "Testimonials", "Other", "", "body3").unwrap();

        delete_brand_in(&dir, "Acme").unwrap();

        let lib = list_brands_in(&dir);
        assert!(!brand_exists(&lib.brands, "Acme"), "brand removed");
        assert!(brand_exists(&lib.brands, "Other"), "other brand untouched");
        assert_eq!(lib.docs.len(), 1, "only Other's doc survives");
        assert_eq!(lib.docs[0].id, "d3");
        // Acme's doc bodies are gone; Other's remains.
        assert!(!dir.join("d1.txt").exists());
        assert!(!dir.join("d2.txt").exists());
        assert!(dir.join("d3.txt").exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn body_is_never_stored_in_the_index() {
        let dir = temp_brands_dir("no-body-in-index");
        let secret = "SECRET-BRAND-BODY-CONTENT";
        save_brand_doc_in(&dir, "abc123", "Doc", "", "", secret).unwrap();
        // The index file must NOT contain the doc body — only metadata.
        let index_json = fs::read_to_string(index_path_in(&dir)).unwrap();
        assert!(!index_json.contains(secret), "brands.json leaked the doc body");
        let _ = fs::remove_dir_all(&dir);
    }
}
