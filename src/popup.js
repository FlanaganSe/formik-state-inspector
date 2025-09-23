const $ = (id) => document.getElementById(id);
const status = $("status");
const emptyState = $("emptyState");
const formsList = $("formsList");
const refreshBtn = $("refreshBtn");
const searchInput = $("searchInput");
const clearSearchBtn = $("clearSearchBtn");

let currentTab;

// Verify DOM elements exist
if (!status || !emptyState || !formsList || !refreshBtn) {
  if (document.body) {
    document.body.innerHTML =
      "<div style='padding: 20px; text-align: center; color: #dc2626;'>Extension UI failed to load</div>";
  }
  throw new Error("Required DOM elements not found");
}

function setStatus(text, className = "") {
  if (status) {
    status.textContent = String(text || "");
    status.className = `status ${className || ""}`;
  }
}

function showEmpty() {
  if (emptyState) emptyState.style.display = "block";
  if (formsList) formsList.style.display = "none";
}

function showForms() {
  if (emptyState) emptyState.style.display = "none";
  if (formsList) formsList.style.display = "block";
}

function createFormSection(title, data, type) {
  const section = document.createElement("div");
  section.className = "form-section";

  const header = document.createElement("div");
  header.className = "section-header";

  const titleElement = document.createElement("strong");
  titleElement.textContent = title;
  header.appendChild(titleElement);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.dataset.copy = type;
  header.appendChild(copyBtn);

  section.appendChild(header);

  const pre = document.createElement("pre");
  pre.className = "json-data";
  pre.textContent = JSON.stringify(data, null, 2);
  section.appendChild(pre);

  return section;
}

function createFormCard(form, index) {
  if (!form || typeof form !== "object") {
    return document.createElement("div");
  }

  const card = document.createElement("div");
  card.className = "form-card";

  const errors = form.errors && typeof form.errors === "object" ? form.errors : {};
  const values = form.values && typeof form.values === "object" ? form.values : {};
  const touched = form.touched && typeof form.touched === "object" ? form.touched : {};

  const errorCount = Object.keys(errors).length;
  const fieldCount = Object.keys(values).length;
  const touchedCount = Object.values(touched).filter(Boolean).length;

  const statusIndicators = [];
  if (form.isSubmitting) statusIndicators.push("⟳ Submitting");
  if (form.isValidating) statusIndicators.push("✓ Validating");
  if (form.dirty) statusIndicators.push("● Modified");

  // Create header
  const header = document.createElement("div");
  header.className = "form-header";

  const title = document.createElement("h3");
  title.textContent = `Form ${index + 1}`;
  header.appendChild(title);

  const stats = document.createElement("div");
  stats.className = "form-stats";
  stats.textContent = `${fieldCount} fields • ${errorCount} errors • ${touchedCount} touched`;
  header.appendChild(stats);

  if (statusIndicators.length) {
    const status = document.createElement("div");
    status.className = "form-status";
    status.textContent = statusIndicators.join(" ");
    header.appendChild(status);
  }

  card.appendChild(header);

  // Values section
  const valuesSection = createFormSection("Values", values, "values");
  card.appendChild(valuesSection);

  // Errors section (only if there are errors)
  if (errorCount > 0) {
    const errorsSection = createFormSection("Errors", errors, "errors");
    errorsSection.classList.add("error-section");
    card.appendChild(errorsSection);
  }

  // Touched section
  const touchedSection = createFormSection("Touched", touched, "touched");
  card.appendChild(touchedSection);

  // Add click listeners for copy buttons
  card.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.copy;
      let data = {};
      if (type === "values") data = values;
      else if (type === "errors") data = errors;
      else if (type === "touched") data = touched;

      try {
        if (navigator?.clipboard?.writeText) {
          navigator.clipboard
            .writeText(JSON.stringify(data, null, 2))
            .then(() => {
              btn.textContent = "Copied!";
              btn.style.background = "#059669";
              setTimeout(() => {
                btn.textContent = "Copy";
                btn.style.background = "";
              }, 1500);
            })
            .catch(() => {
              // Clipboard write failed - show user feedback without console spam
              btn.textContent = "Failed";
              btn.style.background = "#dc2626";
              setTimeout(() => {
                btn.textContent = "Copy";
                btn.style.background = "";
              }, 2000);
            });
        } else {
          // Fallback for environments without clipboard API
          btn.textContent = "Unsupported";
          btn.style.background = "#f59e0b";
          setTimeout(() => {
            btn.textContent = "Copy";
            btn.style.background = "";
          }, 2000);
        }
      } catch {
        // Copy operation failed - show user feedback without console spam
        btn.textContent = "Error";
        btn.style.background = "#dc2626";
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.style.background = "";
        }, 2000);
      }
    });
  });

  return card;
}

let lastFormsCount = 0;
let lastFormsSignature = "";
let lastFormsRaw = [];
let filterQuery = "";

// Content-aware signature to detect updates to values/errors/touched primitives
function hashString(input) {
  let h = 5381 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h >>>= 0;
  }
  return h.toString(36);
}

function primitiveSignature(value) {
  const parts = [];
  function walk(v) {
    const t = typeof v;
    if (v == null) {
      parts.push("null");
      return;
    }
    if (t === "string" || t === "number" || t === "boolean") {
      parts.push(`${t}:${String(v)}`);
      return;
    }
    if (Array.isArray(v)) {
      parts.push("[");
      for (let i = 0; i < v.length; i++) walk(v[i]);
      parts.push("]");
      return;
    }
    if (t === "object") {
      parts.push("{");
      const keys = Object.keys(v).sort();
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        parts.push(k);
        walk(v[k]);
      }
      parts.push("}");
    }
  }
  walk(value);
  return hashString(parts.join("|"));
}

// Fast signature for change detection without full JSON stringify
function createFormsSignature(forms) {
  if (!Array.isArray(forms) || forms.length === 0) return "";

  let signature = forms.length.toString();
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    if (!form || typeof form !== "object") continue;

    const values = form.values && typeof form.values === "object" ? form.values : {};
    const errors = form.errors && typeof form.errors === "object" ? form.errors : {};
    const touched = form.touched && typeof form.touched === "object" ? form.touched : {};

    const valuesKeys = Object.keys(values).length;
    const errorsKeys = Object.keys(errors).length;
    const touchedKeys = Object.keys(touched).length;
    const flags = `${form.isSubmitting}${form.isValidating}${form.dirty}${form.submitCount}`;

    const vSig = primitiveSignature(values);
    const eSig = primitiveSignature(errors);
    const tSig = primitiveSignature(touched);

    signature += `|${valuesKeys}:${vSig}:${errorsKeys}:${eSig}:${touchedKeys}:${tSig}:${flags}`;
  }
  return signature;
}

function renderForms(forms, { force = false } = {}) {
  if (!Array.isArray(forms) || forms.length === 0) {
    if (lastFormsCount !== 0 || force) {
      showEmpty();
      setStatus("No forms found", "inactive");
      lastFormsCount = 0;
      lastFormsSignature = "";
    }
    return;
  }

  // Fast change detection
  const currentSignature = createFormsSignature(forms);
  const formsCountChanged = forms.length !== lastFormsCount;

  if (!force && !formsCountChanged && currentSignature === lastFormsSignature) {
    return; // No changes detected
  }

  // Update tracking
  lastFormsCount = forms.length;
  lastFormsSignature = currentSignature;
  lastFormsRaw = forms;

  // Apply filter if present
  let displayedForms = forms;
  if (filterQuery.trim()) {
    const q = filterQuery.trim().toLowerCase();
    displayedForms = forms
      .map((f) => ({
        ...f,
        values: filterObjectDeep(f.values, q),
        errors: filterObjectDeep(f.errors, q),
        touched: filterObjectDeep(f.touched, q),
      }))
      .filter((f) => !isDeepEmpty(f.values) || !isDeepEmpty(f.errors) || !isDeepEmpty(f.touched));
  }

  if (filterQuery.trim()) {
    if (displayedForms.length === 0) {
      showEmpty();
    } else {
      showForms();
    }
    setStatus(
      `${displayedForms.length} matching form${displayedForms.length === 1 ? "" : "s"} (of ${forms.length})`,
      displayedForms.length ? "active" : "inactive"
    );
  } else {
    showForms();
    setStatus(`Found ${forms.length} form${forms.length === 1 ? "" : "s"}`, "active");
  }

  if (formsList) {
    // Use DocumentFragment for efficient DOM updates
    const fragment = document.createDocumentFragment();
    displayedForms.forEach((form, index) => {
      const card = createFormCard(form, index);
      if (card) fragment.appendChild(card);
    });

    // Single DOM update
    formsList.innerHTML = "";
    formsList.appendChild(fragment);
  }
}

async function getForms() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.[0]?.id) {
      setStatus("No active tab found", "error");
      showEmpty();
      return;
    }

    currentTab = tabs[0];

    const response = await chrome.tabs.sendMessage(currentTab.id, {
      type: "get-forms",
    });
    renderForms(response?.forms || [], { force: true });
  } catch (_error) {
    setStatus("Extension not loaded on this page", "error");
    showEmpty();
    // Removed console logging for normal failure cases
  }
}

// Deep filtering: keep fields where key or primitive value contains query (case-insensitive)
function filterObjectDeep(input, q) {
  if (!input || typeof input !== "object") {
    return matchesPrimitive(input, q) ? input : undefined;
  }

  if (Array.isArray(input)) {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const v = input[i];
      const child = filterObjectDeep(v, q);
      if (child !== undefined) out.push(child);
    }
    return out.length ? out : undefined;
  }

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const keyMatch = key.toLowerCase().includes(q);
    if (keyMatch) {
      out[key] = value;
      continue;
    }

    const child = filterObjectDeep(value, q);
    if (child !== undefined) {
      out[key] = child;
      continue;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function matchesPrimitive(value, q) {
  if (value == null) return false;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return String(value).toLowerCase().includes(q);
  }
  return false;
}

function isDeepEmpty(v) {
  if (v === undefined) return true;
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every(isDeepEmpty);
  if (typeof v === "object") return Object.keys(v).length === 0 || Object.values(v).every(isDeepEmpty);
  return false;
}

let refreshTimeout = null;
let isRefreshing = false;

async function refresh() {
  // Prevent multiple rapid refresh calls
  if (isRefreshing) return;

  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  isRefreshing = true;
  setStatus("Refreshing...", "loading");

  if (!currentTab?.id) {
    setStatus("No tab to refresh", "error");
    isRefreshing = false;
    return;
  }

  try {
    await chrome.tabs.sendMessage(currentTab.id, { type: "refresh" });

    // Poll for results with a short delay
    refreshTimeout = setTimeout(async () => {
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          type: "get-forms",
        });
        renderForms(response?.forms || [], { force: true });
      } catch {
        setStatus("Refresh failed", "error");
        // Removed console logging for normal failure cases
      } finally {
        isRefreshing = false;
        refreshTimeout = null;
      }
    }, 200);
  } catch {
    setStatus("Refresh failed", "error");
    // Removed console logging for normal failure cases
    isRefreshing = false;
  }
}

// Initialize
if (refreshBtn) {
  refreshBtn.addEventListener("click", refresh);
}

// Search handlers
let searchDebounce;
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const next = searchInput.value || "";
    if (next === filterQuery) return;
    filterQuery = next;

    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      renderForms(lastFormsRaw || [], { force: true });
    }, 180);
  });
}

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener("click", () => {
      if (!filterQuery) return;
      filterQuery = "";
      searchInput.value = "";
      renderForms(lastFormsRaw || [], { force: true });
    });
  }

document.addEventListener("DOMContentLoaded", getForms);

// Live updates: receive forwarded forms from content script
try {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "forms-update" && Array.isArray(message.forms)) {
      lastFormsRaw = message.forms;
      // Force re-render on inbound live updates to avoid any gating mishaps
      renderForms(message.forms, { force: true });
    }
  });
} catch {
  // Ignore if runtime messaging is unavailable in this context
}
