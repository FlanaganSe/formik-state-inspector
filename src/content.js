(() => {
  if (!chrome?.runtime?.id) return;

  // Inject script into page context
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  let forms = [];

  // Listen for Formik updates from injected script
  window.addEventListener("message", ({ source, data }) => {
    if (!chrome?.runtime?.id) return;
    if (source === window && data?.source === "formik-inspector" && data?.type === "update") {
      forms = data.forms || [];
      try {
        chrome.runtime.sendMessage({ type: "update", count: forms.length, forms });
      } catch {}
    }
  });

  // Respond to popup requests for current forms
  try {
    chrome.runtime.onMessage.addListener((msg, _, respond) => {
      try {
        if (msg.type === "get-forms") respond({ forms });
      } catch {}
    });
  } catch {}
})();
