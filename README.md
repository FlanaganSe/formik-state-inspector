# Formik State Inspector

A lightweight Chrome extension for real-time inspection of Formik form state in React applications.

![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue) ![React DevTools Required](https://img.shields.io/badge/Requires-React%20DevTools-orange) ![License](https://img.shields.io/badge/License-Not%20Specified-red)

## Features

- **Real-time updates** on every React render
- **Multi-form support** - inspect all Formik instances on a page
- **Complete state view** - values, errors, touched fields, and status flags
- **One-click JSON copy** for any state object
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
4. Use **Copy** buttons to export JSON data
5. Click **⟳** to manually refresh

## How It Works

Simple 4-component architecture:

- **inject.js** - Hooks into React DevTools to scan the component tree for Formik instances
- **content.js** - Bridge between page and extension
- **popup.js** - Renders the inspection UI
- **background.js** - Updates the badge counter

All processing happens locally. No data leaves your browser.

## Contributing

**Quick start:**
1. Follow installation steps above
2. Edit files in `src/` directly (no build step)
3. Reload extension in `chrome://extensions/`
4. Refresh target pages to update content scripts

**See [FutureEnhancements.md](FutureEnhancements.md) for planned improvements.**

**Philosophy:**
- Zero external dependencies
- Privacy-first design
- Simple, readable code

## Privacy

- **No data collection** - extension never stores or transmits data
- **Local processing only** - all inspection happens in your browser
- **Automatic cleanup** - data vanishes when popup closes
- **Open source** - fully auditable

See [PRIVACY.md](PRIVACY.md) for complete details.

## License

License to be added before distribution.