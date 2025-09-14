// --- UTILITY FUNCTIONS ---

/** Safely stringifies data and displays it in a <pre> tag. */
const renderJson = (container, data) => {
  container.innerHTML = ''; // Clear previous content
  if (data === undefined || data === null || Object.keys(data).length === 0) {
    container.innerHTML = `<div class="empty-object">No data</div>`;
    return;
  }
  
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = JSON.stringify(data, null, 2); // The '2' formats it with indentation
  pre.appendChild(code);
  container.appendChild(pre);
};

/** Updates the status bar text and dot color. */
const setStatus = (text, state) => {
  document.getElementById('statusText').textContent = text;
  document.getElementById('statusDot').className = `status-dot ${state}`;
};

/** Provides visual feedback on a button after an action (e.g., copy). */
const showButtonFeedback = (button, success) => {
  const originalContent = button.innerHTML;
  if (success) {
    button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    button.classList.add('success');
  } else {
    button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    button.classList.add('error');
  }

  setTimeout(() => {
    button.innerHTML = originalContent;
    button.classList.remove('success', 'error');
  }, 1500);
};

// --- CORE LOGIC ---

/**
 * Creates and returns a DOM element for a single Formik form.
 * @param {object} form - The form state data.
 * @param {number} index - The index of the form.
 * @returns {Node} A DOM node representing the form card.
 */
const createFormCard = (form, index) => {
  const template = document.getElementById('formTemplate').content.cloneNode(true);
  const card = template.querySelector('.form-card');

  // Set form title and summary counts
  template.querySelector('.form-number').textContent = index + 1;
  template.querySelector('.field-count').textContent = Object.keys(form.values ?? {}).length;
  template.querySelector('.error-count').textContent = Object.keys(form.errors ?? {}).length;
  template.querySelector('.touched-count').textContent = Object.keys(form.touched ?? {}).length;
  template.querySelector('.submit-count').textContent = form.submitCount ?? 0;

  // Toggle status indicators
  template.querySelector('.status-indicator.submitting').style.display = form.isSubmitting ? 'flex' : 'none';
  template.querySelector('.status-indicator.validating').style.display = form.isValidating ? 'flex' : 'none';
  template.querySelector('.status-indicator.dirty').style.display = form.dirty ? 'flex' : 'none';

  // Render collapsible sections
  renderJson(template.querySelector('.values-content'), form.values);
  renderJson(template.querySelector('.errors-content'), form.errors);
  renderJson(template.querySelector('.touched-content'), form.touched);

  // Add copy button listeners
  card.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const type = btn.dataset.copy;
      const dataToCopy = JSON.stringify(form[type] ?? {}, null, 2);
      try {
        await navigator.clipboard.writeText(dataToCopy);
        showButtonFeedback(btn, true);
      } catch (err) {
        console.error('Failed to copy:', err);
        showButtonFeedback(btn, false);
      }
    });
  });

  return card;
};

/** Updates the entire UI based on the forms received. */
const updateUI = (forms = []) => {
  const formsList = document.getElementById('formsList');
  const emptyState = document.getElementById('emptyState');

  if (forms.length === 0) {
    setStatus('No forms found', 'inactive');
    formsList.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    setStatus(`Found ${forms.length} form${forms.length > 1 ? 's' : ''}`, 'active');
    emptyState.style.display = 'none';
    formsList.innerHTML = ''; // Clear existing forms
    forms.forEach((form, index) => {
      formsList.appendChild(createFormCard(form, index));
    });
    formsList.style.display = 'block';
  }
};

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
  setStatus('Connecting...', 'scanning');
  
  // Connect to the background script
  const port = chrome.runtime.connect({ name: 'popup' });

  // Listen for messages
  port.onMessage.addListener((message) => {
    if (message.type === 'forms-data') {
      updateUI(message.forms);
    }
  });

  // Handle disconnection
  port.onDisconnect.addListener(() => {
    setStatus('Disconnected', 'inactive');
    document.getElementById('emptyTitle').textContent = 'Connection Lost';
    document.getElementById('emptyDescription').textContent = 'Try refreshing the page or reopening the extension.';
    updateUI([]); // Show empty state
  });

  // Setup refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    setStatus('Refreshing...', 'scanning');
    port.postMessage({ type: 'refresh' });
  });

  // Initial request for form data
  port.postMessage({ type: 'get-forms' });
});