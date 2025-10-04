# Formik State Inspector

Chrome extension for debugging Formik forms in React applications. Provides real-time inspection of form state with a collapsible JSON tree view and instant search.

## What It Does

Displays Formik state (values, errors, touched, flags) in a popup with:
- Collapsible JSON tree with syntax highlighting
- Real-time updates on every React render (debounced 100ms)
- Search/filter across all fields
- Per-section copy to clipboard
- Badge showing number of forms detected

## Requirements

- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) extension
- React application using Formik

## Installation

```bash
git clone https://github.com/FlanaganSe/formik-state-inspector
cd formik-state-inspector

# Chrome: navigate to chrome://extensions/
# Enable "Developer mode" → "Load unpacked" → select this directory
```

## Usage

1. Open a page with Formik forms
2. Click the extension icon (badge shows form count)
3. View state in the popup (collapse nodes, search/filter, copy forms as JSON)
4. State updates automatically as you interact with forms

## How It Works

Hooks into `__REACT_DEVTOOLS_GLOBAL_HOOK__` (provided by React DevTools) to scan the React fiber tree for Formik instances. Detects Formik by checking for component names matching `/Formik/i` or validating the state shape (must have `values`, `errors`, `touched`, `isSubmitting`).

**Architecture:**
```
inject.js     → Scans fiber tree via BFS (max depth 100), extracts form state
content.js    → Message bridge between page and extension
background.js → Updates badge with form count
popup.js      → Renders JSON tree UI with collapsible nodes
```

**State snapshots include:** values, errors, touched, isSubmitting, isValidating, dirty

**Updates:** Triggered on React's `onCommitFiberRoot` hook, debounced to 100ms

## Privacy

All processing happens locally in your browser. Zero network requests, zero data collection, zero storage. Only permission required is `activeTab`. Form data is held in memory only while the popup is open.

See [PRIVACY.md](PRIVACY.md) for details.

## Technical Details

- **Manifest:** v3
- **Permissions:** activeTab
- **Dependencies:** None (vanilla JavaScript)
- **Content script:** Runs on all http/https pages at document_idle
- **UI:** 600x600px popup with path-based tree node persistence
- **Syntax highlighting:** Keys (blue), strings (green), numbers (purple), booleans (red)

## License

MIT - See [LICENSE](LICENSE)
