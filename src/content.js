(() => {
	const isContextValid = () => chrome.runtime?.id;

	if (isContextValid()) {
		const script = document.createElement("script");
		script.src = chrome.runtime.getURL("src/inject.js");
		script.onload = () => script.remove();
		(document.head || document.documentElement).appendChild(script);
	}

	let currentForms = [];

	const safeSendMessage = (message) => {
		if (!isContextValid()) return;
		chrome.runtime.sendMessage(message);
	};

	window.addEventListener("message", (event) => {
		if (event?.data?.source !== "formik-inspector") return;

		if (event.data.type === "forms-update") {
			const forms = event.data?.forms;
			currentForms = Array.isArray(forms) ? forms : [];
			safeSendMessage({ type: "update-badge", count: currentForms.length });
		}
	});

	// Only add listener if context is valid
	if (!isContextValid()) return;
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (!message?.type) return;

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
})();
