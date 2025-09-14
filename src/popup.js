class FormikInspectorPopup {
  constructor() {
    this.port = null;
    this.forms = [];
    this.elements = {
      statusBar: document.getElementById('statusBar'),
      statusText: document.getElementById('statusText'),
      statusDot: document.getElementById('statusDot'),
      content: document.getElementById('content'),
      emptyState: document.getElementById('emptyState'),
      emptyTitle: document.getElementById('emptyTitle'),
      emptyDescription: document.getElementById('emptyDescription'),
      formsList: document.getElementById('formsList'),
      refreshBtn: document.getElementById('refreshBtn'),
      formTemplate: document.getElementById('formTemplate')
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.connectToBackground();
    this.setStatus('Connecting...', 'scanning');
  }

  setupEventListeners() {
    this.elements.refreshBtn.addEventListener('click', () => this.refresh());
  }

  connectToBackground() {
    try {
      this.port = chrome.runtime.connect({ name: 'popup' });
      
      this.port.onMessage.addListener((message) => {
        this.handleMessage(message);
      });

      this.port.onDisconnect.addListener(() => {
        this.port = null;
        this.setStatus('Disconnected', 'inactive');
        this.showError('Connection lost', 'Try refreshing the page or reopening the extension.');
      });

      // Request initial data
      this.requestForms();
    } catch (error) {
      console.error('[Formik Inspector] Connection error:', error);
      this.setStatus('Connection failed', 'inactive');
      this.showError('Connection failed', 'Could not connect to the extension background script.');
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'forms-data':
        this.updateForms(message.forms || []);
        break;
      default:
        console.warn('[Formik Inspector] Unknown message:', message);
    }
  }

  requestForms() {
    if (this.port) {
      try {
        this.port.postMessage({ type: 'get-forms' });
      } catch (error) {
        console.error('[Formik Inspector] Error requesting forms:', error);
      }
    }
  }

  refresh() {
    this.setStatus('Refreshing...', 'scanning');
    if (this.port) {
      try {
        this.port.postMessage({ type: 'refresh' });
      } catch (error) {
        console.error('[Formik Inspector] Error refreshing:', error);
      }
    }
    
    // Also request current data
    setTimeout(() => this.requestForms(), 500);
  }

  updateForms(forms) {
    this.forms = forms;
    
    if (forms.length === 0) {
      this.showEmpty();
      this.setStatus('No forms found', 'inactive');
    } else {
      this.renderForms(forms);
      this.setStatus(`Found ${forms.length} form${forms.length === 1 ? '' : 's'}`, 'active');
    }
  }

  setStatus(text, state) {
    this.elements.statusText.textContent = text;
    this.elements.statusDot.className = 'status-dot';
    if (state) {
      this.elements.statusDot.classList.add(state);
    }
  }

  showEmpty() {
    this.elements.emptyState.style.display = 'flex';
    this.elements.formsList.style.display = 'none';
    this.elements.emptyState.classList.add('fade-in');
  }

  showError(title, description) {
    this.elements.emptyTitle.textContent = title;
    this.elements.emptyDescription.textContent = description;
    this.showEmpty();
  }

  renderForms(forms) {
    this.elements.emptyState.style.display = 'none';
    this.elements.formsList.style.display = 'block';
    this.elements.formsList.innerHTML = '';

    forms.forEach((form, index) => {
      const formCard = this.createFormCard(form, index);
      this.elements.formsList.appendChild(formCard);
    });

    this.elements.formsList.classList.add('fade-in');
  }

  createFormCard(form, index) {
    const template = this.elements.formTemplate.content.cloneNode(true);
    const card = template.querySelector('.form-card');
    
    card.setAttribute('data-form-id', form.id);
    
    // Form title
    const formNumber = template.querySelector('.form-number');
    formNumber.textContent = index + 1;

    // Status indicators
    const submittingIndicator = template.querySelector('.status-indicator.submitting');
    const validatingIndicator = template.querySelector('.status-indicator.validating');
    const dirtyIndicator = template.querySelector('.status-indicator.dirty');

    submittingIndicator.style.display = form.isSubmitting ? 'flex' : 'none';
    validatingIndicator.style.display = form.isValidating ? 'flex' : 'none';
    dirtyIndicator.style.display = form.dirty ? 'flex' : 'none';

    // Summary counts
    const fieldCount = Object.keys(form.values || {}).length;
    const errorCount = Object.keys(form.errors || {}).length;
    const touchedCount = Object.keys(form.touched || {}).filter(key => form.touched[key]).length;

    template.querySelector('.field-count').textContent = fieldCount;
    template.querySelector('.error-count').textContent = errorCount;
    template.querySelector('.touched-count').textContent = touchedCount;
    template.querySelector('.submit-count').textContent = form.submitCount || 0;

    // Error count styling
    const errorCountEl = template.querySelector('.error-count');
    errorCountEl.classList.toggle('error-count', errorCount > 0);

    // Section contents
    this.renderSection(template.querySelector('.values-content'), form.values || {});
    this.renderSection(template.querySelector('.errors-content'), form.errors || {});
    this.renderSection(template.querySelector('.touched-content'), form.touched || {});

    // Copy button handlers
    template.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const copyType = btn.getAttribute('data-copy');
        this.copyToClipboard(form, copyType, btn);
      });
    });

    return template;
  }

  renderSection(container, data) {
    if (!data || Object.keys(data).length === 0) {
      container.innerHTML = '<div class="empty-object">No data</div>';
      return;
    }

    const jsonViewer = document.createElement('div');
    jsonViewer.className = 'json-viewer';
    jsonViewer.innerHTML = this.formatJSON(data);
    container.appendChild(jsonViewer);
  }

  formatJSON(obj, indent = 0) {
    const indentStr = '  '.repeat(indent);
    
    if (obj === null) {
      return '<span class="json-null">null</span>';
    }
    
    if (typeof obj === 'string') {
      return `<span class="json-string">"${this.escapeHTML(obj)}"</span>`;
    }
    
    if (typeof obj === 'number') {
      return `<span class="json-number">${obj}</span>`;
    }
    
    if (typeof obj === 'boolean') {
      return `<span class="json-boolean">${obj}</span>`;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '<span class="json-bracket">[]</span>';
      }
      
      const items = obj.map(item => 
        `${indentStr}  ${this.formatJSON(item, indent + 1)}`
      ).join(',\n');
      
      return `<span class="json-bracket">[</span>\n${items}\n${indentStr}<span class="json-bracket">]</span>`;
    }
    
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return '<span class="json-bracket">{}</span>';
      }
      
      const items = keys.map(key => {
        const value = this.formatJSON(obj[key], indent + 1);
        return `${indentStr}  <span class="json-key">"${this.escapeHTML(key)}"</span>: ${value}`;
      }).join(',\n');
      
      return `<span class="json-bracket">{</span>\n${items}\n${indentStr}<span class="json-bracket">}</span>`;
    }
    
    return String(obj);
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async copyToClipboard(form, type, button) {
    let data;
    switch (type) {
      case 'values':
        data = form.values || {};
        break;
      case 'errors':
        data = form.errors || {};
        break;
      case 'touched':
        data = form.touched || {};
        break;
      default:
        return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      
      // Visual feedback
      const originalHTML = button.innerHTML;
      button.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      button.style.color = 'var(--color-success)';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.color = '';
      }, 1500);
      
    } catch (error) {
      console.error('[Formik Inspector] Copy failed:', error);
      
      // Fallback: show error feedback
      const originalHTML = button.innerHTML;
      button.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      button.style.color = 'var(--color-danger)';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.color = '';
      }, 1500);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FormikInspectorPopup();
});