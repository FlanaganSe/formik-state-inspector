(() => {
  // Helper to check if extension context is still valid
  const isContextValid = () => chrome?.runtime?.id != null;

  // Inject script into page context to access React DevTools hook
  if (isContextValid()) {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("src/inject.js");
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  let currentForms = [];

  // Forward messages from page to extension
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== window.location.origin) return;
    if (e.data?.source !== "formik-inspector") return;

    if (e.data.type === "update") {
      currentForms = e.data.forms || [];

      if (isContextValid()) {
        chrome.runtime.sendMessage({ type: "badge", count: currentForms.length });
        chrome.runtime.sendMessage({ type: "update", forms: currentForms });
      }
    }
  });

  // Handle messages from extension (popup)
  chrome.runtime?.onMessage?.addListener((msg, _, respond) => {
    if (!isContextValid()) return;

    if (msg.type === "get-forms") {
      respond({ forms: currentForms });
    } else if (msg.type === "refresh") {
      window.postMessage({ source: "formik-inspector", type: "refresh" }, window.location.origin);
    }
  });
})();
