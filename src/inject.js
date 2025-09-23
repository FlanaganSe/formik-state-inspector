(() => {
  if (window.__FORMIK_INSPECTOR_ACTIVE__ || !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;

  const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  window.__FORMIK_INSPECTOR_ACTIVE__ = true;

  // Track last seen form count and bag signature by reference
  let lastFormsCount = 0;
  let prevSigs = new WeakMap();

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

  // Change detection in this layer caused missed updates for value-only changes.
  // We now emit on every commit and let the popup perform lightweight diffing.

  function scan() {
    try {
      const forms = findForms();
      if (!Array.isArray(forms)) return;

      // Determine if any form actually changed since last scan
      let changed = forms.length !== lastFormsCount;
      for (let i = 0; i < forms.length; i++) {
        const bag = forms[i];
        if (!bag || typeof bag !== "object") continue;

        const nextSig = {
          v: bag.values,
          e: bag.errors,
          t: bag.touched,
          s: Boolean(bag.isSubmitting),
          a: Boolean(bag.isValidating),
          d: Boolean(bag.dirty),
          c: Number(bag.submitCount) || 0,
        };
        const prev = prevSigs.get(bag);
        if (!prev) {
          changed = true;
        } else if (
          prev.v !== nextSig.v ||
          prev.e !== nextSig.e ||
          prev.t !== nextSig.t ||
          prev.s !== nextSig.s ||
          prev.a !== nextSig.a ||
          prev.d !== nextSig.d ||
          prev.c !== nextSig.c
        ) {
          changed = true;
        }
        prevSigs.set(bag, nextSig);
      }

      if (!changed) return;

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
      window.postMessage(
        {
          source: "formik-inspector",
          type: "forms-update",
          forms: serialized,
        },
        window.location.origin
      );

      lastFormsCount = forms.length;
    } catch {
      // Silent fail for robustness
    }
  }

  // Hook into React commits for automatic updates
  let scheduled = false;
  const originalCommit = HOOK.onCommitFiberRoot;
  HOOK.onCommitFiberRoot = (...args) => {
    try {
      if (typeof originalCommit === "function") {
        return originalCommit.apply(null, args);
      }
    } finally {
      // Schedule a single scan on the next frame to coalesce commits
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          try {
            scan();
          } finally {
            scheduled = false;
          }
        });
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
    // Reset scheduling and restore hook
    scheduled = false;
    lastFormsCount = 0;
    prevSigs = new WeakMap();

    // Restore the original hook unconditionally
    HOOK.onCommitFiberRoot = originalCommit;
    window.removeEventListener("message", messageHandler);
    window.__FORMIK_INSPECTOR_ACTIVE__ = false;
  };

  // Listen for page unload or extension disable
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);

  // Initial scan soon after injection
  requestAnimationFrame(scan);
})();
