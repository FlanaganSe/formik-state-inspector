(() => {
	// Inject the page script to access React DevTools Hook
	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("src/inject.js");
	script.onload = () => script.remove();
	(document.head || document.documentElement).appendChild(script);

	let currentForms = [];

	// Listen for messages from injected script
	window.addEventListener("message", (event) => {
		if (event.data?.source !== "formik-inspector") return;

		if (event.data.type === "forms-update") {
			currentForms = event.data.forms || [];

			// Update badge
			chrome.runtime.sendMessage({
				type: "update-badge",
				count: currentForms.length,
			});
		}
	});

	// Listen for popup requests
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type === "get-forms") {
			sendResponse({ forms: currentForms });
		} else if (message.type === "refresh") {
			window.postMessage(
				{
					source: "formik-inspector",
					type: "refresh-request",
				},
				"*",
			);
		}
	});

	console.log("[Formik Inspector] Content script loaded");
})();
