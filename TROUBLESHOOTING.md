Formik State Inspector – Troubleshooting

- React DevTools Hook required: This extension relies on `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` to access React fiber roots. Install/enable the official React DevTools extension and refresh the page.

- React 18/19 support: The extension discovers fiber roots per renderer id using `__REACT_DEVTOOLS_GLOBAL_HOOK__.getFiberRoots(rendererId)`. If roots show as empty, refresh the tab after installing DevTools.

- Local test page: Open `examples/formik-demo.html` in Chrome and click the extension. You should see one Formik form with live updates.

- Popup still shows “No Formik forms detected”:
  - Ensure the page actually uses Formik and that forms are mounted.
  - Check the Console for logs prefixed with `[Formik Inspector]`.
  - Verify other extensions aren’t blocking content scripts.
  - Reload the extension from `chrome://extensions` and hard-refresh the page.

