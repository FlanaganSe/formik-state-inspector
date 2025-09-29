(() => {
  if (window.__FORMIK_INSPECTOR_ACTIVE__ || !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;

  const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  window.__FORMIK_INSPECTOR_ACTIVE__ = true;

  function getFormikBag(fiber) {
    try {
      if (!fiber || typeof fiber !== "object") return null;

      const props = fiber.memoizedProps;
      if (!props || typeof props !== "object") return null;

      const bag = props.value;
      if (!bag || typeof bag !== "object") return null;

      // Must have values property
      if (!("values" in bag) || typeof bag.values !== "object") return null;

      const type = fiber.type;
      let hasFormikName = false;
      let hasFormikShape = false;

      // Safe type checking
      try {
        const typeName = type?.name || type?._context?.displayName || "";
        hasFormikName = typeof typeName === "string" && /Formik/i.test(typeName);
      } catch {
        hasFormikName = false;
      }

      // Check for Formik-like shape with proper type checking
      hasFormikShape =
        "errors" in bag &&
        "touched" in bag &&
        "isSubmitting" in bag &&
        (typeof bag.errors === "object" || bag.errors == null) &&
        (typeof bag.touched === "object" || bag.touched == null) &&
        typeof bag.isSubmitting === "boolean";

      return hasFormikName || hasFormikShape ? bag : null;
    } catch {
      return null;
    }
  }

  function findForms() {
    const forms = [];
    const roots = new Set();
    const seen = new WeakSet();
    let totalIterations = 0;
    const MAX_TOTAL_ITERATIONS = 50000;

    try {
      if (HOOK.renderers && typeof HOOK.renderers.forEach === "function") {
        HOOK.renderers.forEach((_, id) => {
          const fiberRoots = HOOK.getFiberRoots?.(id);
          if (fiberRoots && typeof fiberRoots.forEach === "function") {
            fiberRoots.forEach((root) => {
              if (root?.current) roots.add(root.current);
            });
          }
        });
      }

      for (const root of roots) {
        if (!root) continue;
        const queue = [root];
        let iterations = 0;
        const MAX_ITERATIONS = 10000;

        while (queue.length > 0 && iterations < MAX_ITERATIONS && totalIterations < MAX_TOTAL_ITERATIONS) {
          const fiber = queue.shift();
          if (!fiber || seen.has(fiber)) continue;
          seen.add(fiber);
          iterations++;
          totalIterations++;

          const bag = getFormikBag(fiber);
          if (bag) forms.push(bag);

          if (fiber.child) queue.push(fiber.child);
          if (fiber.sibling) queue.push(fiber.sibling);
        }
      }
    } catch {
      // Silent fail for robustness
    }
    return forms;
  }

  let lastFormsCount = 0;
  let lastFormsSimpleHash = "";

  // Simple hash function for basic change detection
  function simpleHash(forms) {
    if (!Array.isArray(forms) || forms.length === 0) return "";

    let hash = forms.length.toString();
    for (let i = 0; i < forms.length; i++) {
      const bag = forms[i];
      if (!bag || typeof bag !== "object") continue;

      // Hash based on keys count and basic values
      const valuesCount = bag.values ? Object.keys(bag.values).length : 0;
      const errorsCount = bag.errors ? Object.keys(bag.errors).length : 0;
      const touchedCount = bag.touched ? Object.keys(bag.touched).length : 0;
      const flags = `${bag.isSubmitting}${bag.isValidating}${bag.dirty}`;

      hash += `|${valuesCount}:${errorsCount}:${touchedCount}:${flags}`;
    }
    return hash;
  }

  function scan() {
    try {
      const forms = findForms();
      if (!Array.isArray(forms)) return;

      // Fast change detection first
      const currentSimpleHash = simpleHash(forms);
      const formsCountChanged = forms.length !== lastFormsCount;

      if (!formsCountChanged && currentSimpleHash === lastFormsSimpleHash) {
        return; // No changes detected
      }

      const serialized = forms
        .filter((bag) => bag && typeof bag === "object")
        .map((bag, i) => {
          // Defensive data extraction with type checking
          const safeValues = bag.values && typeof bag.values === "object" ? bag.values : {};
          const safeErrors = bag.errors && typeof bag.errors === "object" ? bag.errors : {};
          const safeTouched = bag.touched && typeof bag.touched === "object" ? bag.touched : {};

          return {
            id: `form-${i}`,
            values: safeValues,
            errors: safeErrors,
            touched: safeTouched,
            isSubmitting: Boolean(bag.isSubmitting),
            isValidating: Boolean(bag.isValidating),
            isValid: bag.isValid !== false, // Default to true if undefined
            dirty: Boolean(bag.dirty),
            submitCount: Number(bag.submitCount) || 0,
          };
        });

      // Update tracking variables
      lastFormsCount = forms.length;
      lastFormsSimpleHash = currentSimpleHash;

      window.postMessage(
        {
          source: "formik-inspector",
          type: "forms-update",
          forms: serialized,
        },
        window.location.origin
      );
    } catch {
      // Silent fail for robustness
    }
  }

  // Hook into React commits for automatic updates
  let scanTimeout = null;
  let isScanning = false;
  const originalCommit = HOOK.onCommitFiberRoot;
  HOOK.onCommitFiberRoot = (...args) => {
    try {
      if (typeof originalCommit === "function") {
        return originalCommit.apply(null, args);
      }
    } finally {
      // Prevent overlapping scans
      if (scanTimeout) clearTimeout(scanTimeout);
      if (!isScanning) {
        scanTimeout = setTimeout(() => {
          isScanning = true;
          scan();
          isScanning = false;
          scanTimeout = null;
        }, 100);
      }
    }
  };

  // Listen for manual refresh requests
  const messageHandler = (event) => {
    if (event?.data?.source === "formik-inspector" && event.data.type === "refresh-request") {
      scan();
    }
  };
  window.addEventListener("message", messageHandler);

  // Cleanup function
  const cleanup = () => {
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    // Reset tracking variables
    isScanning = false;
    lastFormsCount = 0;
    lastFormsSimpleHash = "";

    // Restore the original hook unconditionally
    HOOK.onCommitFiberRoot = originalCommit;
    window.removeEventListener("message", messageHandler);
    window.__FORMIK_INSPECTOR_ACTIVE__ = false;
  };

  // Listen for page unload or extension disable
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);

  // Initial scan
  setTimeout(scan, 300);
})();
