(() => {
	// Inject the page script to access React DevTools Hook
	const script = document.createElement("script");
	script.src = chrome.runtime.getURL("src/inject.js");
	script.onload = function () {
		this.remove();
	};
	(document.head || document.documentElement).appendChild(script);

	let currentForms = [];
	let port = null;

	// Connect to background script
	const connectToBackground = () => {
		// Check if extension context is still valid
		if (!chrome.runtime?.id) {
			console.log("[Formik Inspector] Extension context invalidated, stopping");
			return;
		}

		try {
			port = chrome.runtime.connect({ name: "formik-inspector" });

			port.onMessage.addListener((message) => {
				if (message.type === "get-current-forms") {
					port.postMessage({
						type: "current-forms",
						forms: currentForms,
						timestamp: Date.now(),
					});
				} else if (message.type === "refresh-request") {
					// Forward refresh request to injected script
					window.postMessage(
						{
							source: "formik-inspector",
							type: "refresh-request",
						},
						"*",
					);
				}
			});

			port.onDisconnect.addListener(() => {
				port = null;
				// Only try to reconnect if extension context is still valid
				if (chrome.runtime?.id && !chrome.runtime.lastError) {
					setTimeout(connectToBackground, 1000);
				} else {
					console.log(
						"[Formik Inspector] Extension context lost, not reconnecting",
					);
				}
			});
		} catch (error) {
			console.warn(
				"[Formik Inspector] Failed to connect to background:",
				error,
			);
			// Only retry if the error isn't about invalid context
			if (
				chrome.runtime?.id &&
				!error.message.includes("Extension context invalidated")
			) {
				setTimeout(connectToBackground, 1000);
			}
		}
	};

	// Listen for messages from injected script
	window.addEventListener("message", (event) => {
		if (event.data?.source !== "formik-inspector") return;

		const { type, forms, count } = event.data;

		if (type === "forms-update") {
			currentForms = forms || [];

			// Forward to background script if connected
			if (port) {
				try {
					port.postMessage({
						type: "forms-update",
						forms: currentForms,
						timestamp: Date.now(),
					});
				} catch (error) {
					console.warn("[Formik Inspector] Error sending forms update:", error);
					port = null;
				}
			}
		} else if (type === "badge-update") {
			// Forward badge update to background
			if (port) {
				try {
					port.postMessage({
						type: "badge-update",
						count: count || 0,
					});
				} catch (error) {
					console.warn("[Formik Inspector] Error sending badge update:", error);
					port = null;
				}
			}
		}
	});

	// Connect to background when content script loads
	connectToBackground();

	// Clean up on page unload
	window.addEventListener("beforeunload", () => {
		if (port) {
			port.disconnect();
			port = null;
		}
	});

	console.log("[Formik Inspector] Content script loaded");
})();
