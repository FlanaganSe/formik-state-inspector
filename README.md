# Formik State Inspector

A lightweight and efficient Chrome developer tool to inspect Formik form state in React applications in real-time.

## Features

- **Real-time Updates**: Automatically detects and displays Formik state changes as you interact with forms
- **Multiple Forms Support**: Lists all Formik instances on a page
- **Clean JSON Display**: Simple, readable display of form `values`, `errors`, and `touched` state
- **Copy to Clipboard**: One-click copy of form state as JSON
- **Minimal & Fast**: Ultra-lightweight architecture with direct communication paths

## How It Works

The extension has a simple three-part architecture:

1. **Content Script (`src/content.js`)**: Injected into web pages. Injects the page script and handles communication between the popup and page context.

2. **Injected Script (`src/inject.js`)**: Accesses the React DevTools global hook to find and extract Formik state from the fiber tree. Sends updates via window messaging.

3. **Popup (`src/popup.js` and `src/popup.html`)**: Simple UI that requests data directly from the content script and displays form state with clean JSON formatting.

4. **Background Script (`src/background.js`)**: Minimal service worker that only handles extension badge updates.

## Getting Started for Developers

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/formik-state-inspector.git
    cd formik-state-inspector
    ```

2.  **Load the extension in Chrome:**
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" in the top right corner.
    - Click "Load unpacked".
    - Select the `formik-state-inspector` directory.

3.  **Start developing:**
    - The extension is now installed. You can make changes to the code and see them reflected by reloading the extension from the `chrome://extensions` page.

## Project Structure

```
/
├── assets/              # Icons for the extension
├── src/
│   ├── background.js    # Minimal service worker (badge management only) - 23 lines
│   ├── content.js       # Bridge between popup and page context - 37 lines
│   ├── inject.js        # Core Formik detection logic - 88 lines
│   ├── popup.css        # Clean, minimal styling - 216 lines
│   ├── popup.html       # Simple popup structure - 30 lines
│   └── popup.js         # Streamlined popup logic - 125 lines
├── manifest.json        # Extension manifest file
└── README.md            # This file
```

**Total: ~519 lines of code** (dramatically reduced from original complex implementation)