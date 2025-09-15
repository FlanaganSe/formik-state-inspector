# Privacy Policy

**Effective Date**: 2025-01-01  
**Extension**: Formik State Inspector  
**Developer**: Open Source Community  

## Overview

The Formik State Inspector Chrome extension is designed to help developers inspect Formik form state in React applications. This privacy policy explains how the extension handles data and your privacy.

## Data Collection

**We do not collect any user data.** The Formik State Inspector extension:

-  **No data collection**: The extension does not collect, store, or transmit any personal information
-  **No tracking**: No analytics, usage tracking, or user behavior monitoring
-  **No external servers**: All data processing happens locally in your browser
-  **No network requests**: The extension does not make any network requests to external servers

## How the Extension Works

The extension operates entirely within your local browser environment:

1. **Page Analysis**: The extension scans the current web page for React applications using Formik
2. **Local Processing**: All form state inspection happens locally in your browser's memory
3. **Temporary Display**: Form state data is temporarily displayed in the extension popup
4. **Automatic Cleanup**: All data is automatically cleared when you close the popup or navigate away

## Data Access

The extension only accesses:

- **Formik Form State**: Values, errors, touched fields, and submission status from Formik forms
- **React Component Tree**: To locate Formik providers in the React application
- **The current page**: To relay Formik state to the popup for display

This data is:
-  **Never stored permanently**
-  **Never transmitted over the network**
-  **Only visible to you in the popup interface**
-  **Automatically cleared when the extension is closed**

## Permissions

The extension requests no special host or scripting permissions.

- No host permissions: Content scripts are declared statically and run only on pages where extensions are allowed by Chrome.
- No `activeTab`: The popup communicates with the content script using standard messaging without elevated tab access.
- No `scripting`: The extension does not programmatically inject scripts; it loads a web-accessible script via the content script.

The extension becomes active on allowed pages automatically and only displays data when you open the popup.

## Copy to Clipboard

When you use the "Copy" buttons in the extension:
- Data is copied to your system clipboard using the standard browser API
- This happens locally on your device
- No data is transmitted over the network
- You control what data is copied and where you paste it

## Third-Party Data

The extension may inspect form data that you enter into Formik forms, including:
- Form field values (text, numbers, etc.)
- Validation error messages
- Touch states and submission status

**Important**: This data belongs to you and the website you're using. The extension only displays it temporarily for development purposes and does not store or transmit it.

## Open Source

This extension is open source, which means:
-  **Transparent**: All code is publicly available for review
-  **Auditable**: Security researchers can verify our privacy claims
-  **Community-driven**: Improvements come from the developer community
-  **No hidden functionality**: Everything the extension does is visible in the source code

## Data Security

Since no data is collected or transmitted:
-  **No data breaches possible**: There's no user data to breach
-  **No server security concerns**: No servers store your information
-  **Local-only processing**: All data stays on your device
-  **Automatic cleanup**: Memory is cleared when the extension closes

## Changes to This Policy

If this privacy policy changes:
- We will update the "Effective Date" at the top of this document
- Significant changes will be documented in the extension's changelog
- The updated policy will be included in future extension updates

Since we don't collect data, policy changes will primarily be for clarity or legal compliance.

## Contact

If you have questions about this privacy policy or the extension's data handling:

- **GitHub Issues**: [Open an issue](https://github.com/your-repo/formik-state-inspector/issues) on our GitHub repository
- **Code Review**: Examine the source code directly in the repository
- **Community**: Discuss in the project's community channels

## Legal Compliance

This extension is designed to comply with:
-  **GDPR** (General Data Protection Regulation)
-  **CCPA** (California Consumer Privacy Act)
-  **Chrome Web Store Privacy Requirements**
-  **Other applicable privacy laws**

Compliance is straightforward because we don't collect any user data.

## Summary

The Formik State Inspector extension:
- **Collects**: Nothing
- **Stores**: Nothing permanently
- **Transmits**: Nothing over the network
- **Purpose**: Local development tool for React + Formik debugging
- **Privacy**: Complete privacy by design

---

*This privacy policy reflects our commitment to your privacy and transparency in how the extension operates. Since we don't collect any data, your privacy is protected by design.*
