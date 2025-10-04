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
- Store anything permanently (no localStorage, no databases, nothing)
- Track you or collect analytics

## How It Works

All data processing happens locally in your browser. Form data is held in memory only while the popup is open. Close the popup or refresh the page, and it's gone.

**Permissions:**
- `activeTab` - Required to read form state from the current tab

No servers, no tracking, no data collection.