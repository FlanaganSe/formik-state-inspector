(() => {
  const isContextValid = () => chrome?.runtime?.id;

  if (isContextValid()) {
    try {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("src/inject.js");
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch {
      // Intentionally silent: some pages may block injection
    }
  }

  let currentForms = [];

  const safeSendMessage = (message) => {
    if (!isContextValid()) return;
    try {
      if (message && typeof message === "object") {
        chrome.runtime.sendMessage(message);
      }
    } catch {
      // Silent fail - extension context may be invalid
    }
  };

  window.addEventListener("message", (event) => {
    // Only accept messages from this window and same-origin
    if (event.source !== window) return;
    if (event.origin && event.origin !== window.location.origin) return;
    if (event?.data?.source !== "formik-inspector") return;

    if (event.data.type === "forms-update") {
      const forms = event.data?.forms;
      currentForms = Array.isArray(forms) ? forms : [];
      safeSendMessage({ type: "update-badge", count: currentForms.length });
      // Forward forms to extension pages (e.g., popup) for live updates
      safeSendMessage({ type: "forms-update", forms: currentForms });
    }
  });

  // Only add listener if context is valid
  if (isContextValid()) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message?.type) return;

      if (message.type === "get-forms") {
        sendResponse({ forms: currentForms });
        return; // explicit end
      }

      if (message.type === "refresh") {
        window.postMessage(
          {
            source: "formik-inspector",
            type: "refresh-request",
          },
          window.location.origin
        );
      }
    });
  }
})();
