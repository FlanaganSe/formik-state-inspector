(() => {
  // 1. Initial guards
  if (window.__FORMIK_INSPECTOR_ACTIVE__) return;
  const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!HOOK) return;
  
  /**
   * Identifies a Formik instance by checking for its distinct name or shape.
   * This heuristic is designed to be concise and version-agnostic.
   */
  function getFormikBag(fiber) {
    const bag = fiber?.memoizedProps?.value;
    // A valid bag is an object with a `values` property.
    if (!bag || typeof bag !== 'object' || !('values' in bag)) {
      return null;
    }
    
    // Check for Formik's signature: a telling name or the right combination of properties.
    const type = fiber?.type;
    const hasFormikName = /Formik/i.test(type?.name || type?._context?.displayName || '');
    const hasFormikShape = 'errors' in bag && 'touched' in bag && 'isSubmitting' in bag;

    return (hasFormikName || hasFormikShape) ? bag : null;
  }
  
  /**
   * The main controller that finds, formats, and posts Formik state.
   */
  class FormikInspector {
    lastFormCount = 0;
    debounceTimer = null;

    constructor() {
      window.__FORMIK_INSPECTOR_ACTIVE__ = true;
      this.attachListeners();
      setTimeout(() => this.scan(), 400); // Initial scan
      console.log("[Formik Inspector] Ready.");
    }

    /** Attaches listeners to trigger scans. */
    attachListeners() {
      // Primary Trigger: React's own commit hook is the most efficient source of updates.
      const originalCommit = HOOK.onCommitFiberRoot;
      HOOK.onCommitFiberRoot = (...args) => {
        try {
          return originalCommit.apply(null, args);
        } finally {
          this.scheduleScan();
        }
      };

      // Manual Trigger: Allows the extension UI to request a refresh.
      window.addEventListener("message", (event) => {
        if (event.data?.source === "formik-inspector" && event.data.type === "refresh-request") {
          this.scan();
        }
      });
    }

    /** Finds all Formik instances on the page. */
    findForms() {
      const forms = [];
      const roots = new Set();
      const seenFibers = new WeakSet();

      // Get all unique React root fibers from the hook.
      HOOK.renderers?.forEach((_, rendererId) => {
        HOOK.getFiberRoots(rendererId)?.forEach(root => roots.add(root?.current));
      });

      // Perform a breadth-first search on each root to find Formik bags.
      for (const root of roots) {
        const queue = [root];
        while (queue.length > 0) {
          const fiber = queue.shift();
          if (!fiber || seenFibers.has(fiber)) continue;
          seenFibers.add(fiber);
          
          const bag = getFormikBag(fiber);
          if (bag) forms.push(bag);

          if (fiber.child) queue.push(fiber.child);
          if (fiber.sibling) queue.push(fiber.sibling);
        }
      }
      return forms;
    }

    /** Posts data to the extension. */
    post(forms) {
      const serializableForms = forms.map((bag, index) => ({
        id: `formik-${index}`,
        values: bag.values ?? {},
        errors: bag.errors ?? {},
        touched: bag.touched ?? {},
        isSubmitting: bag.isSubmitting ?? false,
        isValidating: bag.isValidating ?? false,
        isValid: bag.isValid ?? true,
        dirty: bag.dirty ?? false,
        submitCount: bag.submitCount ?? 0,
        status: bag.status,
        initialValues: bag.initialValues ?? {},
      }));

      window.postMessage({ source: "formik-inspector", type: "forms-update", forms: serializableForms }, "*");

      if (serializableForms.length !== this.lastFormCount) {
        this.lastFormCount = serializableForms.length;
        window.postMessage({ source: "formik-inspector", type: "badge-update", count: this.lastFormCount }, "*");
      }
    }

    /** The main method to trigger a scan and post the results. */
    scan() {
      try {
        const forms = this.findForms();
        this.post(forms);
      } catch (e) {
        console.warn("[Formik Inspector] Scan failed:", e);
      }
    }
    
    /** Schedules a debounced scan to avoid excessive updates. */
    scheduleScan(delay = 150) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.scan(), delay);
    }
  }

  // Initialize the inspector and expose a debug API.
  const inspector = new FormikInspector();
  window.__FORMIK_INSPECTOR_API__ = { forceScan: () => inspector.scan() };

})();