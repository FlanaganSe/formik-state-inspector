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
    if (source === window && data?.source === "formik-inspector" && data?.type === "update") {
      forms = data.forms || [];
      chrome.runtime.sendMessage({ type: "update", count: forms.length, forms });
    }
  });

  // Respond to popup requests for current forms
  chrome.runtime.onMessage.addListener((msg, _, respond) => {
    if (msg.type === "get-forms") respond({ forms });
  });
})();
