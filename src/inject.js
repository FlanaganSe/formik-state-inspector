(() => {
  if (window.__FORMIK_INSPECTOR__ || !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;

  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const MAX_DEPTH = 100;
  const DEBOUNCE_MS = 100;
  const INITIAL_DELAY_MS = 300;

  window.__FORMIK_INSPECTOR__ = true;

  const isFormik = (fiber) => {
    const bag = fiber?.memoizedProps?.value;
    if (!bag?.values || typeof bag.values !== 'object') return null;

    const hasName = /Formik/i.test(fiber.type?.name || fiber.type?._context?.displayName || '');
    const hasShape = ['errors', 'touched', 'isSubmitting'].every(k => k in bag);

    return hasName || hasShape ? bag : null;
  };

  // Extract serializable snapshot of Formik state
  const snapshot = (bag) => ({
    values: bag.values ?? {},
    errors: bag.errors ?? {},
    touched: bag.touched ?? {},
    isSubmitting: !!bag.isSubmitting,
    isValidating: !!bag.isValidating,
    dirty: !!bag.dirty
  });

  const findForms = () => {
    const forms = [];
    const seenFibers = new WeakSet();
    const seenBags = new WeakSet();

    hook.renderers?.forEach((_, id) => {
      hook.getFiberRoots?.(id)?.forEach(root => {
        if (!root?.current) return;

        // Use index-based iteration for O(1) queue operations
        const queue = [{ fiber: root.current, depth: 0 }];
        for (let i = 0; i < queue.length; i++) {
          const { fiber, depth } = queue[i];

          if (!fiber || seenFibers.has(fiber) || depth > MAX_DEPTH) continue;
          seenFibers.add(fiber);

          const bag = isFormik(fiber);
          if (bag && !seenBags.has(bag)) {
            seenBags.add(bag);
            forms.push(bag);
          }

          if (fiber.child) queue.push({ fiber: fiber.child, depth: depth + 1 });
          if (fiber.sibling) queue.push({ fiber: fiber.sibling, depth });
        }
      });
    });

    // Map to minimal serializable snapshots
    return forms.map(snapshot);
  };

  const send = () => {
    try {
      const forms = findForms();
      window.postMessage({ source: 'formik-inspector', type: 'update', forms }, '*');
    } catch (_) {
      // Swallow errors to avoid breaking React DevTools hook
    }
  };

  let timer;
  const originalHook = hook.onCommitFiberRoot;

  hook.onCommitFiberRoot = (...args) => {
    originalHook?.apply(null, args);
    clearTimeout(timer);
    timer = setTimeout(send, DEBOUNCE_MS);
  };

  const cleanup = () => {
    clearTimeout(timer);
    if (originalHook) hook.onCommitFiberRoot = originalHook;
    delete window.__FORMIK_INSPECTOR__;
  };

  window.addEventListener('beforeunload', cleanup, { once: true });

  setTimeout(send, INITIAL_DELAY_MS);
})();
