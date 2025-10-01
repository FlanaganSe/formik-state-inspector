// ============================================================================
// Native JSON Tree Component
// ============================================================================

const createTreeNode = (key, value, depth = 0, isLast = false, query = '') => {
  const type = Array.isArray(value) ? 'array' : typeof value;
  const isObject = type === 'object' || type === 'array';

  // Filter check for query matching
  const matchesQuery = !query ||
    key?.toString().toLowerCase().includes(query) ||
    (!isObject && String(value).toLowerCase().includes(query));

  if (query && !matchesQuery && !isObject) return null;

  const container = document.createElement('div');

  if (isObject && value !== null) {
    const entries = type === 'array' ? value.map((v, i) => [i, v]) : Object.entries(value);
    const hasChildren = entries.length > 0;

    if (hasChildren) {
      // Header line: ▼ key: {
      const header = document.createElement('div');
      header.className = 'tree-line';

      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.textContent = '▼ ';
      header.appendChild(toggle);

      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      keySpan.textContent = key;
      header.appendChild(keySpan);

      const punctuation = document.createElement('span');
      punctuation.className = 'tree-punctuation';
      punctuation.textContent = `: ${type === 'array' ? '[' : '{'}`;
      header.appendChild(punctuation);

      container.appendChild(header);

      // Children container
      const children = document.createElement('div');
      children.className = 'tree-children';

      let visibleChildren = 0;
      entries.forEach(([k, v], i) => {
        const child = createTreeNode(k, v, depth + 1, i === entries.length - 1, query);
        if (child) {
          children.appendChild(child);
          visibleChildren++;
        }
      });

      if (visibleChildren > 0 || !query) {
        container.appendChild(children);

        // Closing bracket line
        const footer = document.createElement('div');
        footer.className = 'tree-line';
        footer.innerHTML = `<span class="tree-punctuation">${type === 'array' ? ']' : '}'}</span>${!isLast ? '<span class="tree-comma">,</span>' : ''}`;
        container.appendChild(footer);

        // Toggle collapse/expand
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isExpanded = toggle.textContent === '▼ ';
          if (isExpanded) {
            toggle.textContent = '▶ ';
            children.style.display = 'none';
            footer.style.display = 'none';
            punctuation.textContent = `: ${type === 'array' ? '[...]' : '{...}'}`;
          } else {
            toggle.textContent = '▼ ';
            children.style.display = 'block';
            footer.style.display = 'block';
            punctuation.textContent = `: ${type === 'array' ? '[' : '{'}`;
          }
        });
      } else if (query) {
        return null; // No matching children
      }
    } else {
      // Empty object/array: key: {}
      const line = document.createElement('div');
      line.className = 'tree-line';
      line.innerHTML = `<span class="tree-key">${key}</span><span class="tree-punctuation">: ${type === 'array' ? '[]' : '{}'}</span>${!isLast ? '<span class="tree-comma">,</span>' : ''}`;
      container.appendChild(line);
    }
  } else {
    // Primitive value: key: value,
    const line = document.createElement('div');
    line.className = 'tree-line';

    const keySpan = document.createElement('span');
    keySpan.className = 'tree-key';
    keySpan.textContent = key;
    line.appendChild(keySpan);

    const colon = document.createElement('span');
    colon.className = 'tree-punctuation';
    colon.textContent = ': ';
    line.appendChild(colon);

    const valueSpan = document.createElement('span');
    valueSpan.className = `tree-value tree-${type}`;
    valueSpan.textContent = value === null ? 'null' :
                           type === 'string' ? `"${value}"` :
                           String(value);
    line.appendChild(valueSpan);

    if (!isLast) {
      const comma = document.createElement('span');
      comma.className = 'tree-comma';
      comma.textContent = ',';
      line.appendChild(comma);
    }

    container.appendChild(line);
  }

  return container;
};

const createTree = (data, query = '') => {
  const tree = document.createElement('div');
  tree.className = 'json-tree';

  const entries = Object.entries(data);
  entries.forEach(([key, value], i) => {
    const node = createTreeNode(key, value, 0, i === entries.length - 1, query);
    if (node) tree.appendChild(node);
  });

  return tree;
};

// ============================================================================
// Main Popup Logic
// ============================================================================

const $ = (id) => document.getElementById(id);
let currentTab = null;
let currentForms = [];
let searchQuery = '';

// Set status message
const setStatus = (text, type = '') => {
  const el = $('status');
  if (el) {
    el.textContent = text;
    el.className = `status ${type}`;
  }
};

// Show/hide empty state
const showEmpty = () => {
  $('empty')?.classList.remove('hidden');
  $('forms')?.classList.add('hidden');
};

const showForms = () => {
  $('empty')?.classList.add('hidden');
  $('forms')?.classList.remove('hidden');
};

// Create a form card
const createFormCard = (form, index) => {
  const card = document.createElement('div');
  card.className = 'form-card';

  const errorCount = Object.keys(form.errors || {}).length;
  const fieldCount = Object.keys(form.values || {}).length;
  const touchedCount = Object.values(form.touched || {}).filter(Boolean).length;

  const flags = [];
  if (form.isSubmitting) flags.push('⟳ Submitting');
  if (form.isValidating) flags.push('✓ Validating');
  if (form.dirty) flags.push('● Modified');

  // Header
  card.innerHTML = `
    <div class="form-header">
      <h3>Form ${index + 1}</h3>
      <div class="form-stats">${fieldCount} fields • ${errorCount} errors • ${touchedCount} touched</div>
      ${flags.length ? `<div class="form-flags">${flags.join(' ')}</div>` : ''}
    </div>
  `;

  // Values section
  if (Object.keys(form.values).length > 0) {
    const section = createSection('Values', form.values);
    card.appendChild(section);
  }

  // Errors section
  if (errorCount > 0) {
    const section = createSection('Errors', form.errors);
    section.classList.add('error-section');
    card.appendChild(section);
  }

  // Touched section
  if (Object.keys(form.touched).length > 0) {
    const section = createSection('Touched', form.touched);
    card.appendChild(section);
  }

  return card;
};

// Create a collapsible section with tree view
const createSection = (title, data) => {
  const section = document.createElement('div');
  section.className = 'form-section';

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <strong>${title}</strong>
    <button class="copy-btn" data-copy='${JSON.stringify(data)}'>Copy</button>
  `;
  section.appendChild(header);

  const tree = createTree(data, searchQuery);
  section.appendChild(tree);

  // Copy button handler
  header.querySelector('.copy-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    const data = JSON.parse(btn.dataset.copy);

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      btn.textContent = 'Copied!';
      btn.classList.add('success');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('success');
      }, 1500);
    } catch {
      btn.textContent = 'Failed';
      btn.classList.add('error');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('error');
      }, 2000);
    }
  });

  return section;
};

// Render forms
const render = (forms = []) => {
  currentForms = forms;

  if (forms.length === 0) {
    showEmpty();
    setStatus('No forms found', 'inactive');
    return;
  }

  showForms();
  const container = $('forms');
  container.innerHTML = '';

  let visibleForms = 0;
  forms.forEach((form, i) => {
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hasMatch =
        JSON.stringify(form.values).toLowerCase().includes(q) ||
        JSON.stringify(form.errors).toLowerCase().includes(q) ||
        JSON.stringify(form.touched).toLowerCase().includes(q);

      if (!hasMatch) return;
    }

    const card = createFormCard(form, i);
    container.appendChild(card);
    visibleForms++;
  });

  if (visibleForms === 0 && searchQuery) {
    showEmpty();
    setStatus('No matches found', 'inactive');
  } else if (searchQuery) {
    setStatus(`${visibleForms} of ${forms.length} forms match`, 'active');
  } else {
    setStatus(`Found ${forms.length} form${forms.length === 1 ? '' : 's'}`, 'active');
  }
};

// Fetch forms from content script
const fetchForms = async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus('No active tab', 'error');
      showEmpty();
      return;
    }

    currentTab = tab;
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'get-forms' });
    render(response?.forms || []);
  } catch {
    setStatus('Extension not loaded on this page', 'error');
    showEmpty();
  }
};

// Refresh forms
const refresh = async () => {
  if (!currentTab?.id) return;

  setStatus('Refreshing...', 'loading');

  try {
    await chrome.tabs.sendMessage(currentTab.id, { type: 'refresh' });
    setTimeout(async () => {
      const response = await chrome.tabs.sendMessage(currentTab.id, { type: 'get-forms' });
      render(response?.forms || []);
    }, 200);
  } catch {
    setStatus('Refresh failed', 'error');
  }
};

// Search handler
let searchTimeout;
$('search').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    render(currentForms);
  }, 200);
});

$('clear').addEventListener('click', () => {
  $('search').value = '';
  searchQuery = '';
  render(currentForms);
});

$('refresh').addEventListener('click', refresh);

// Listen for live updates
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'update' && sender?.tab?.id === currentTab?.id) {
    render(msg.forms || []);
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', fetchForms);
