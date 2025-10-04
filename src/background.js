// Update extension badge when forms are detected
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'update' && sender?.tab?.id) {
    const { count = 0 } = msg;
    const { id: tabId } = sender.tab;
    chrome.action.setBadgeText({ tabId, text: count ? String(count) : '' });
    if (count) chrome.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
  }
});
