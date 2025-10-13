# Privacy Policy

**Effective Date**: 2025-10-03
**Extension**: Formik State Inspector

## What This Extension Does

This is a local debugging tool for developers. It reads Formik form state from your React apps to help you debug forms.

## Data Access

**What we access:**
- Form state data (values, errors, touched fields, validation status) from Formik forms on the current page
- React component tree via React DevTools hook

**What we do with it:**
- Display it in the extension popup while you're debugging
- Copy it to your clipboard when you click the "Copy" button

**What we DON'T do:**
- Send anything over the network
- Store form data permanently
- Track you or collect analytics
- Share data with third parties

## Local Storage

The extension stores UI preferences locally in your browser using `chrome.storage.local`:
- Search filter text
- Which tree nodes you've collapsed/expanded
- Scroll position in the popup

**What's NOT stored:**
- Form values, errors, or any actual form data
- Personal information
- Browsing history

This state is saved per-tab to give you a consistent debugging experience. You can clear this storage anytime via chrome://extensions.

## How It Works

All data processing happens locally in your browser. Form data is held in memory only while the popup is open and is never persisted to disk.

**Permissions:**
- `activeTab` - Required to read form state from the current tab
- `storage` - Used to save UI preferences (search filter, collapsed nodes, scroll position)

No servers, no tracking, no external data collection.