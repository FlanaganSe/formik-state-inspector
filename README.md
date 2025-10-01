# Formik State Inspector

Chrome extension for inspecting Formik form state in React applications. Real-time updates, collapsible JSON tree, instant search.

## What It Does

Displays Formik form state (values, errors, touched, flags) in a popup with:
- Native JSON tree view with collapse/expand
- Real-time updates on every React render
- Search/filter across all fields
- Copy to clipboard
- Badge showing form count

## Requirements

- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) extension installed
- React app using Formik

## Installation

```bash
# Clone and load
git clone https://github.com/FlanaganSe/formik-state-inspector
cd formik-state-inspector

# Open chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" → select this directory
```

## Usage

1. Navigate to a page with Formik forms
2. Click extension icon in toolbar
3. View state in JSON tree format
4. Click **▼/▶** to collapse/expand
5. Type in search to filter fields
6. Click **Copy** to copy JSON

## How It Works

Hooks into `__REACT_DEVTOOLS_GLOBAL_HOOK__` to scan React fiber tree for Formik instances. Updates automatically on every React commit (debounced 100ms).

**Architecture:**
```
inject.js     → Scans fiber tree, finds Formik
content.js    → Message bridge
background.js → Updates badge
popup.js      → UI with JSON tree
```

**Detection logic:**
- Checks for `fiber.type.name` matching `/Formik/i`
- Or validates shape: has `values`, `errors`, `touched`, `isSubmitting`

## Privacy

- ✅ All processing happens locally in your browser
- ✅ Zero network requests
- ✅ No data collection or storage
- ✅ Only permission: `activeTab`
- ✅ Data cleared when popup closes

See [PRIVACY.md](PRIVACY.md)

## Technical Details

- **Manifest:** v3
- **Permissions:** `activeTab` only
- **Dependencies:** None (vanilla JS)
- **Syntax highlighting:** Keys (blue), strings (green), numbers (purple), booleans (red)

## License

MIT - See [LICENSE](LICENSE)
