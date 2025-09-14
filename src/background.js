chrome.runtime.onInstalled.addListener(() => {
  console.log('[Formik Inspector] Extension installed');
});

// Store current forms data per tab
const tabForms = new Map();
const tabPorts = new Map();
const popupPorts = new Map();

// Handle connections from content scripts and popups
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'formik-inspector') {
    // Content script connection
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      tabPorts.set(tabId, port);
      
      port.onMessage.addListener((message) => {
        switch (message.type) {
          case 'forms-update':
            handleFormsUpdate(tabId, message.forms);
            break;
          case 'badge-update':
            handleBadgeUpdate(tabId, message.count);
            break;
          case 'current-forms': {
            // Forward current forms to popup if connected
            const popupPort = popupPorts.get(tabId);
            if (popupPort) {
              try {
                popupPort.postMessage({
                  type: 'forms-data',
                  forms: message.forms,
                  timestamp: message.timestamp
                });
              } catch (error) {
                console.warn('[Formik Inspector] Error forwarding to popup:', error);
              }
            }
            break;
          }
        }
      });

      port.onDisconnect.addListener(() => {
        tabPorts.delete(tabId);
        tabForms.delete(tabId);
        updateBadge(tabId, 0);
      });
    }
  } else if (port.name === 'popup') {
    // Popup connection
    getCurrentTab().then(tab => {
      if (tab?.id) {
        popupPorts.set(tab.id, port);
        
        port.onMessage.addListener((message) => {
          switch (message.type) {
            case 'get-forms':
              handlePopupGetForms(tab.id, port);
              break;
            case 'refresh':
              handlePopupRefresh(tab.id);
              break;
          }
        });

        port.onDisconnect.addListener(() => {
          popupPorts.delete(tab.id);
        });

        // Send initial data
        handlePopupGetForms(tab.id, port);
      }
    });
  }
});

function handleFormsUpdate(tabId, forms) {
  tabForms.set(tabId, forms);
  
  // Forward to popup if connected
  const popupPort = popupPorts.get(tabId);
  if (popupPort) {
    try {
      popupPort.postMessage({
        type: 'forms-data',
        forms: forms,
        timestamp: Date.now()
      });
    } catch (error) {
      console.warn('[Formik Inspector] Error forwarding to popup:', error);
      popupPorts.delete(tabId);
    }
  }
}

function handleBadgeUpdate(tabId, count) {
  updateBadge(tabId, count);
}

function handlePopupGetForms(tabId, port) {
  const forms = tabForms.get(tabId) || [];
  
  try {
    port.postMessage({
      type: 'forms-data',
      forms: forms,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('[Formik Inspector] Error sending forms to popup:', error);
  }

  // Also request fresh data from content script
  const contentPort = tabPorts.get(tabId);
  if (contentPort) {
    try {
      contentPort.postMessage({ type: 'get-current-forms' });
    } catch (error) {
      console.warn('[Formik Inspector] Error requesting forms from content:', error);
    }
  }
}

function handlePopupRefresh(tabId) {
  const contentPort = tabPorts.get(tabId);
  if (contentPort) {
    try {
      contentPort.postMessage({ type: 'refresh-request' });
    } catch (error) {
      console.warn('[Formik Inspector] Error sending refresh request:', error);
    }
  }
}

function updateBadge(tabId, count) {
  const text = count > 0 ? count.toString() : '';
  const color = count > 0 ? '#007bff' : '#6c757d';
  
  chrome.action.setBadgeText({
    text: text,
    tabId: tabId
  });

  chrome.action.setBadgeBackgroundColor({
    color: color,
    tabId: tabId
  });
}

async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.warn('[Formik Inspector] Error getting current tab:', error);
    return null;
  }
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabForms.delete(tabId);
  tabPorts.delete(tabId);
  popupPorts.delete(tabId);
});