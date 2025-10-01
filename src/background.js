// Update badge count for detected forms
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'badge' && sender?.tab?.id && chrome.runtime?.id) {
    const count = msg.count || 0;
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count > 0 ? String(count) : '',
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: count > 0 ? '#2563eb' : '#6c757d',
    });
  }
});
