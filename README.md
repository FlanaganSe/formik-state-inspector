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
3. View state in JSON tree format:
   ```
   ▼ user: {
     email: "test@example.com",
     ▼ address: {
       city: "Boston"
     }
   }
   ```
4. Click **▼/▶** to collapse/expand
5. Type in search to filter fields
6. Click **Copy** to copy JSON
7. Click **⟳** to refresh

## How It Works

Hooks into `__REACT_DEVTOOLS_GLOBAL_HOOK__` to scan React fiber tree for Formik instances. Updates automatically on every React commit (debounced 100ms).

**Architecture:**
```
inject.js (98 lines)    → Scans fiber tree, finds Formik
content.js (35 lines)   → Message bridge
background.js (14 lines) → Updates badge
popup.js (360 lines)    → UI with JSON tree
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

## Development

No build step. Edit files in `src/` directly:

```bash
# After editing:
# 1. Reload extension in chrome://extensions/
# 2. Refresh target page
```

**Key files:**
- `src/inject.js` - Formik detection logic
- `src/popup.js` - JSON tree component (lines 1-138)
- `src/popup.css` - Tree styling (lines 257-326)

## Technical Details

- **Manifest:** v3
- **Permissions:** `activeTab` only
- **Dependencies:** None (vanilla JS)
- **Tree rendering:** Native JSON syntax with 2-space indentation
- **Default state:** Expanded (collapse as needed)
- **Syntax highlighting:** Keys (blue), strings (green), numbers (purple), booleans (red)

## License

MIT - See [LICENSE](LICENSE)
