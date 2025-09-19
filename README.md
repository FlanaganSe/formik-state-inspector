# Formik State Inspector

A lightweight Chrome extension for real-time inspection of Formik form state in React applications.

![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![React DevTools Required](https://img.shields.io/badge/Requires-React%20DevTools-orange) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Real-time updates** on every React render
- **Multi-form support** - inspect all Formik instances on a page
- **Complete state view** - values, errors, touched fields, and status flags
- **One-click JSON copy** for any state object
- **Instant search/filter** - show only matching fields (with parents) across values, errors, and touched
- **Badge counter** showing detected forms
- **100% private** - no network requests, all data stays local

## Requirements

- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) extension must be installed
- Web pages using React with Formik

## Installation

### Local Development
1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this directory

## Usage

1. Navigate to a page with React and Formik forms
2. Click the Formik Inspector icon in your toolbar
3. View form state in the popup
4. Use the search bar to filter fields and values
   - Matches are case-insensitive and include field names and primitive values
   - Only matching fields (and their parent objects/arrays) are shown
   - Sections and forms without matches are hidden for clarity
5. Use **Copy** to copy the currently visible (filtered) JSON
6. Click **⟳** to manually refresh

## How It Works

Simple 4-component architecture:

- **inject.js** - Hooks into React DevTools to scan the component tree for Formik instances
- **content.js** - Bridge between page and extension
- **popup.js** - Renders the inspection UI
- **background.js** - Updates the badge counter

All processing happens locally. No data leaves your browser.

### Security & Robustness

The extension includes comprehensive defensive coding:
- **Memory leak prevention** - Timeouts are properly cleared and managed with overlap protection
- **Infinite loop protection** - Maximum iteration limits on fiber tree traversal with global caps
- **Performance optimization** - Fast change detection without expensive JSON operations
- **Defensive data handling** - Type checking and validation for all form data
- **XSS protection** - Uses DOM APIs instead of innerHTML
- **Secure messaging** - PostMessage with specific origins instead of wildcards
- **Proper cleanup** - Event listeners and hooks are cleaned up on page unload
- **Optimized rendering** - DocumentFragment for efficient DOM updates
- **Non-destructive filtering** - Search operates locally on the view without mutating original data
- **Silent operation** - Minimal console output to avoid user confusion
- **Error boundaries** - Graceful handling of React DevTools edge cases

### Troubleshooting

- If you see “Extension not loaded on this page”, ensure React DevTools is installed and the target page uses React.
- Some sites with strict CSP may block injection; the extension fails silently in those cases without spamming the console.
- Badge count updates only when forms actually change to avoid unnecessary noise.

## Contributing

**Quick start:**
1. Follow installation steps above
2. Edit files in `src/` directly (no build step)
3. Reload extension in `chrome://extensions/`
4. Refresh target pages to update content scripts

## Future Enhancements

Production-readiness improvements prioritized by impact and ease of implementation.

**Collapsible JSON Sections**
- **What**: Expand/collapse values, errors, touched
- **Why**: Large form objects are hard to read
- **Impact**: Better scalability

**Match Highlighting**
- **What**: Visually emphasize matched keys/values in filtered view
- **Why**: Faster scanning when many matches remain
- **Impact**: Improves readability without changing current behavior


## Privacy

- **No data collection** - extension never stores or transmits data
- **Local processing only** - all inspection happens in your browser
- **Automatic cleanup** - data vanishes when popup closes
- **Open source** - fully auditable

See [PRIVACY.md](PRIVACY.md) for complete details.
