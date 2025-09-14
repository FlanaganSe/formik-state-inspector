// Minimal Formik Inspector background (flat style, MV3-safe)

const tabs = new Map(); // Map<tabId, { forms: any[], content?: Port, popup?: Port }>

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Formik Inspector] Installed");
});

/* ------------------------------ tiny helpers ------------------------------ */

const S = (tabId) => tabs.get(tabId) ?? (tabs.set(tabId, { forms: [], content: undefined, popup: undefined }), tabs.get(tabId));

const post = (port, msg, onFail) => {
  if (!port) return;
  try { port.postMessage(msg); } catch { onFail && onFail(); }
};

const badge = (tabId, n) => {
  chrome.action.setBadgeText({ tabId, text: n > 0 ? String(n) : "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: n > 0 ? "#007bff" : "#6c757d" });
};

const activeTabId = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id ?? null;
  } catch { return null; }
};

const cleanup = (tabId) => {
  const s = tabs.get(tabId);
  if (!s) return;
  try { s.content?.disconnect?.(); } catch {}
  try { s.popup?.disconnect?.(); } catch {}
  tabs.delete(tabId);
  badge(tabId, 0);
};

/* ------------------------------- content side ------------------------------ */

const onContentMessage = (tabId, s) => (m) => {
  const handlers = {
    "forms-update": () => {
      s.forms = Array.isArray(m.forms) ? m.forms : [];
      post(s.popup, { type: "forms-data", forms: s.forms, timestamp: Date.now() }, () => { s.popup = undefined; });
    },
    "badge-update": () => badge(tabId, Number(m.count) || 0),
    "current-forms": () => {
      const forms = Array.isArray(m.forms) ? m.forms : [];
      s.forms = forms;
      post(s.popup, { type: "forms-data", forms, timestamp: m.timestamp ?? Date.now() }, () => { s.popup = undefined; });
    },
  };
  (handlers[m?.type] ?? (() => {}))();
};

const connectContent = (port) => {
  const tabId = port.sender?.tab?.id;
  if (!tabId) return;
  const s = S(tabId);
  s.content = port;
  port.onMessage.addListener(onContentMessage(tabId, s));
  port.onDisconnect.addListener(() => {
    if (S(tabId).content === port) S(tabId).content = undefined;
    S(tabId).forms = [];
    badge(tabId, 0);
  });
};

/* -------------------------------- popup side ------------------------------- */

const onPopupMessage = (tabId, s, port) => (m) => {
  const handlers = {
    "get-forms": () => {
      post(port, { type: "forms-data", forms: s.forms, timestamp: Date.now() });
      post(s.content, { type: "get-current-forms" }, () => { s.content = undefined; });
    },
    "refresh": () => {
      post(s.content, { type: "refresh-request" }, () => { s.content = undefined; });
    },
  };
  (handlers[m?.type] ?? (() => {}))();
};

const connectPopup = async (port) => {
  const tabId = await activeTabId();
  if (!tabId) return;
  const s = S(tabId);
  s.popup = port;

  // send cache immediately, then ask content for fresh snapshot
  post(port, { type: "forms-data", forms: s.forms, timestamp: Date.now() });
  post(s.content, { type: "get-current-forms" }, () => { s.content = undefined; });

  port.onMessage.addListener(onPopupMessage(tabId, s, port));
  port.onDisconnect.addListener(() => {
    if (S(tabId).popup === port) S(tabId).popup = undefined;
  });
};

/* --------------------------- connections & cleanup -------------------------- */

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "formik-inspector") return connectContent(port);
  if (port.name === "popup") return void connectPopup(port);
  // unknown ports ignored (forward-compat)
});

chrome.tabs.onRemoved.addListener(cleanup);
