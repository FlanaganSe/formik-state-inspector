// DOM + utils
const $ = (id) => document.getElementById(id);
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const isPrimitive = (v) => !isObj(v) && !Array.isArray(v);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Cache DOM refs (script is loaded after body)
const els = {
  forms: $("forms"),
  empty: $("empty"),
  status: $("status"),
  search: $("search"),
  clear: $("clear"),
};

// Count values with optional filter
const count = (obj, fn = () => 1) => {
  if (isPrimitive(obj)) return fn(obj);
  let total = 0;
  for (const v of Object.values(obj)) {
    total += isPrimitive(v) ? fn(v) : count(v, fn);
  }
  return total;
};

// Check if key/value matches search query
const matches = (key, val, q) => {
  if (!q) return true;
  const lq = q.toLowerCase();
  if (key?.toLowerCase().includes(lq)) return true;
  if (isPrimitive(val)) return String(val).toLowerCase().includes(lq);
  for (const [k, v] of Object.entries(val)) {
    if (matches(k, v, q)) return true;
  }
  return false;
};

// Generate value markup based on type
const getValueMarkup = (val) => {
  if (val === null) return '<span class="tree-value tree-null">null</span>';
  const type = typeof val;
  if (type === "string") return `<span class="tree-value tree-string">"${esc(val)}"</span>`;
  return `<span class="tree-value tree-${type}">${esc(String(val))}</span>`;
};

// Track collapsed nodes (persists across renders)
const collapsed = new Set();

// Build tree node recursively
// showAll: when true, render full subtree regardless of query matches
const buildNode = (key, val, isLast, q, path, showAll = false) => {
  if (!showAll && !matches(key, val, q)) return "";

  const nodeId = path ? `${path}.${key}` : String(key);
  const comma = isLast ? "" : ",";

  // Primitive value
  if (isPrimitive(val)) {
    return `<div class="tree-line"><span class="tree-key">${esc(key)}</span><span class="tree-punctuation">: </span>${getValueMarkup(val)}<span class="tree-comma">${comma}</span></div>`;
  }

  // Object/Array
  const isArray = Array.isArray(val);
  const keyHit = q && String(key).toLowerCase().includes(q.toLowerCase());
  const entries = (showAll || keyHit)
    ? Object.entries(val)
    : Object.entries(val).filter(([k, v]) => matches(k, v, q));
  const [open, close] = isArray ? ["[", "]"] : ["{", "}"];

  // Empty object/array
  if (!entries.length) {
    return `<div class="tree-line"><span class="tree-key">${esc(key)}</span><span class="tree-punctuation">: ${open}${close}</span><span class="tree-comma">${comma}</span></div>`;
  }

  const isCollapsed = collapsed.has(nodeId);
  // While searching, force expanded to show context and matches
  const hideStyle = isCollapsed && !q ? ' style="display:none"' : "";
  const toggleIcon = isCollapsed ? "▶" : "▼";
  const punctText = isCollapsed ? (isArray ? "[...]" : "{...}") : open;

  // Build children HTML
  const children =
    isCollapsed && !q
      ? ""
      : entries.map(([k, v], i) => buildNode(k, v, i === entries.length - 1, q, nodeId, showAll || keyHit)).join("");

  return `<div><div class="tree-line"><span class="tree-toggle" role="button" tabindex="0" aria-expanded="${String(!isCollapsed)}" data-node="${esc(nodeId)}">${toggleIcon} </span><span class="tree-key">${esc(key)}</span><span class="tree-punctuation">: ${punctText}</span></div><div class="tree-children"${hideStyle}>${children}</div><div class="tree-line"${hideStyle}><span class="tree-punctuation">${close}</span><span class="tree-comma">${comma}</span></div></div>`;
};

// Build JSON tree from data
const buildTree = (data, q = "", basePath = "") => {
  const entries = Object.entries(data).filter(([k, v]) => matches(k, v, q));
  const html = entries.map(([k, v], i) => buildNode(k, v, i === entries.length - 1, q, basePath, false)).join("");
  const tree = document.createElement("div");
  tree.className = "json-tree";
  tree.innerHTML = html;
  return tree;
};

// Build section with copy button
const buildSection = (title, data, query, isError, basePath) => {
  const section = document.createElement("div");
  section.className = isError ? "form-section error-section" : "form-section";
  section.innerHTML = `<div class="section-header"><strong>${title}</strong><button class="copy-btn" aria-label="Copy ${title}">Copy</button></div>`;
  section.appendChild(buildTree(data, query, basePath));

  const btn = section.querySelector("button");
  btn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      btn.textContent = "Copied!";
      btn.className = "copy-btn success";
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.className = "copy-btn";
      }, 1500);
    } catch {
      btn.textContent = "Failed";
      btn.className = "copy-btn error";
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.className = "copy-btn";
      }, 2000);
    }
  };

  return section;
};

// Build form card with stats and sections
const buildCard = (form, idx, query) => {
  const values = form.values || {};
  const errors = form.errors || {};
  const touched = form.touched || {};

  const fields = count(values);
  const errorCount = count(errors);
  const touchedCount = count(touched, (v) => (v === true ? 1 : 0));

  const flags = [
    form.isSubmitting && "Submitting...",
    form.isValidating && "Validating...",
    form.dirty && "Modified!",
  ].filter(Boolean);

  const card = document.createElement("div");
  card.className = "form-card";
  card.innerHTML = `<div class="form-header"><h3>Form ${idx + 1}</h3><div class="form-stats">${fields} fields • ${errorCount} errors • ${touchedCount} touched</div>${flags.length ? `<div class="form-flags">${flags.join(" ")}</div>` : ""}</div>`;

  const base = `form-${idx}`;
  if (Object.keys(values).length) card.appendChild(buildSection("Values", values, query, false, `${base}.values`));
  if (errorCount) card.appendChild(buildSection("Errors", errors, query, true, `${base}.errors`));
  if (Object.keys(touched).length) card.appendChild(buildSection("Touched", touched, query, false, `${base}.touched`));

  return card;
};

// State
let tab;
let forms = [];

// Update status bar
const setStatus = (text, type = "") => {
  els.status.textContent = text;
  els.status.className = type ? `status ${type}` : "status";
};

// Render forms with optional search filter
const render = (formList = [], searchQuery = "") => {
  forms = formList;

  // Filter forms that match search
  const filtered = searchQuery
    ? forms.filter((f) => ["values", "errors", "touched"].some((k) => matches(k, f[k], searchQuery)))
    : forms;

  const hasMatches = filtered.length > 0;

  // Toggle empty/forms display
  els.empty.classList.toggle("hidden", hasMatches);
  els.forms.classList.toggle("hidden", !hasMatches);

  if (hasMatches) {
    const frag = document.createDocumentFragment();
    filtered.forEach((f, i) => {
      frag.appendChild(buildCard(f, i, searchQuery));
    });
    els.forms.innerHTML = "";
    els.forms.appendChild(frag);
    const countMsg = searchQuery
      ? `${filtered.length} of ${forms.length} match`
      : `${forms.length} form${forms.length !== 1 ? "s" : ""}`;
    setStatus(countMsg, "active");
  } else {
    setStatus(forms.length ? "No matches found" : "No forms found", "inactive");
  }
};

// Load forms from active tab
const load = async () => {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!t?.id) return setStatus("No active tab", "error");

    tab = t;
    const res = await chrome.tabs.sendMessage(t.id, { type: "get-forms" });
    render(res?.forms || []);
  } catch {
    setStatus("Not loaded on this page", "error");
  }
};

// Event listeners
let searchTimeout;
els.search.addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => render(forms, e.target.value.trim()), 150);
});

els.clear.addEventListener("click", () => {
  els.search.value = "";
  els.search.focus();
  render(forms);
});

// Listen for form updates from content script
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "update" && sender?.tab?.id === tab?.id) {
    render(msg.forms || [], els.search.value.trim());
  }
});

// Toggle collapse on tree nodes
const toggleNode = (target) => {
  const id = target.getAttribute("data-node");
  if (!id) return;
  collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
  render(forms, els.search.value.trim());
};

els.forms.addEventListener("click", (e) => {
  if (e.target?.classList?.contains("tree-toggle")) toggleNode(e.target);
});

els.forms.addEventListener("keydown", (e) => {
  if (!e.target?.classList?.contains("tree-toggle")) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  toggleNode(e.target);
});

// Initialize on load
document.addEventListener("DOMContentLoaded", load);
