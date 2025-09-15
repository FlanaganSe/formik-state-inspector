// Minimal background script for badge management only
const formCounts = new Map(); // tabId -> count

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'update-badge' && sender.tab) {
    const count = message.count || 0;
    formCounts.set(sender.tab.id, count);

    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count > 0 ? String(count) : ''
    });

    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: count > 0 ? '#007bff' : '#6c757d'
    });
  }
});

// Clean up on tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  formCounts.delete(tabId);
});