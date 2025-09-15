const $ = (id) => document.getElementById(id);
const status = $('status');
const emptyState = $('emptyState');
const formsList = $('formsList');
const refreshBtn = $('refreshBtn');

let currentTab;

function setStatus(text, className = '') {
  status.textContent = text;
  status.className = `status ${className}`;
}

function showEmpty() {
  emptyState.style.display = 'block';
  formsList.style.display = 'none';
}

function showForms() {
  emptyState.style.display = 'none';
  formsList.style.display = 'block';
}

function createFormCard(form, index) {
  const card = document.createElement('div');
  card.className = 'form-card';

  const errorCount = Object.keys(form.errors || {}).length;
  const fieldCount = Object.keys(form.values || {}).length;
  const touchedCount = Object.values(form.touched || {}).filter(Boolean).length;

  const statusIndicators = [];
  if (form.isSubmitting) statusIndicators.push('⟳ Submitting');
  if (form.isValidating) statusIndicators.push('✓ Validating');
  if (form.dirty) statusIndicators.push('● Modified');

  card.innerHTML = `
    <div class="form-header">
      <h3>Form ${index + 1}</h3>
      <div class="form-stats">
        ${fieldCount} fields • ${errorCount} errors • ${touchedCount} touched
      </div>
      ${statusIndicators.length ? `<div class="form-status">${statusIndicators.join(' ')}</div>` : ''}
    </div>

    <div class="form-section">
      <div class="section-header">
        <strong>Values</strong>
        <button class="copy-btn" data-copy="values">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(form.values, null, 2)}</pre>
    </div>

    ${errorCount > 0 ? `
    <div class="form-section error-section">
      <div class="section-header">
        <strong>Errors</strong>
        <button class="copy-btn" data-copy="errors">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(form.errors, null, 2)}</pre>
    </div>` : ''}

    <div class="form-section">
      <div class="section-header">
        <strong>Touched</strong>
        <button class="copy-btn" data-copy="touched">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(form.touched, null, 2)}</pre>
    </div>
  `;

  // Add click listeners for copy buttons
  card.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.copy;
      const data = form[type] || {};
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    });
  });

  return card;
}

function renderForms(forms) {
  if (!forms || forms.length === 0) {
    showEmpty();
    setStatus('No forms found', 'inactive');
    return;
  }

  showForms();
  setStatus(`Found ${forms.length} form${forms.length === 1 ? '' : 's'}`, 'active');

  formsList.innerHTML = '';
  forms.forEach((form, index) => {
    formsList.appendChild(createFormCard(form, index));
  });
}


function getForms() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0];
    chrome.tabs.sendMessage(currentTab.id, { type: 'get-forms' }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus('Extension not loaded on this page', 'error');
        showEmpty();
        return;
      }
      renderForms(response?.forms || []);
    });
  });
}

function refresh() {
  setStatus('Refreshing...', 'loading');
  if (currentTab) {
    chrome.tabs.sendMessage(currentTab.id, { type: 'refresh' });
    setTimeout(getForms, 500);
  }
}

// Initialize
refreshBtn.addEventListener('click', refresh);
document.addEventListener('DOMContentLoaded', getForms);