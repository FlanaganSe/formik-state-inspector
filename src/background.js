// Minimal background script for badge management only
chrome.runtime.onMessage.addListener((message, sender) => {
	if (message?.type === "update-badge" && sender?.tab?.id) {
		const count = typeof message.count === "number" ? message.count : 0;

		if (chrome.runtime.id) {
			chrome.action.setBadgeText({
				tabId: sender.tab.id,
				text: count > 0 ? String(count) : "",
			});

			chrome.action.setBadgeBackgroundColor({
				tabId: sender.tab.id,
				color: count > 0 ? "#007bff" : "#6c757d",
			});
		}
	}
});
