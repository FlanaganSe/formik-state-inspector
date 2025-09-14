(function () {
  'use strict';

  const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!HOOK) {
    console.warn('[Formik Inspector] React DevTools hook missing; cannot inspect.');
    return;
  }

  const DEBUG = true;
  const log = {
    info: (...a) => DEBUG && console.log('[Formik Inspector]', ...a),
    warn: (...a) => console.warn('[Formik Inspector]', ...a),
    error: (...a) => console.error('[Formik Inspector]', ...a),
  };

  let seen = new WeakSet();
  let debounceTimer = null;
  let lastFormCount = 0;

  function isFormikProviderFiber(fiber) {
    const props = fiber?.memoizedProps;
    const ctx = fiber?.type?._context;
    const bag = props?.value;

    if (ctx) {
      const name = ctx.displayName || ctx._displayName || '';
      if (name.includes('FormikContext') || name === 'Formik' || name.includes('Formik')) {
        return bag && typeof bag === 'object' ? bag : null;
      }
    }

    if (bag && typeof bag === 'object') {
      const has = (k, type) => typeof bag[k] === type || bag[k] === undefined;
      const looksLikeFormik =
        typeof bag.values === 'object' &&
        typeof bag.errors === 'object' &&
        typeof bag.touched === 'object' &&
        has('handleSubmit', 'function') &&
        has('handleChange', 'function');
      if (looksLikeFormik) return bag;
    }

    const tName = fiber?.type?.name;
    if (tName && (tName.includes('FormikContext') || tName.includes('Formik')) && bag) return bag;
    return null;
  }

  function toFormData(bag, index) {
    return {
      id: `form-${index}`,
      values: bag.values ?? {},
      errors: bag.errors ?? {},
      touched: bag.touched ?? {},
      isSubmitting: bag.isSubmitting ?? false,
      isValidating: bag.isValidating ?? false,
      isValid: bag.isValid ?? true,
      submitCount: bag.submitCount ?? 0,
      dirty: bag.dirty ?? false,
      status: bag.status,
      initialValues: bag.initialValues ?? {},
    };
  }

  function walk(fiber, forms, depth = 0) {
    if (!fiber || depth > 60 || seen.has(fiber)) return;
    seen.add(fiber);

    try {
      const bag = isFormikProviderFiber(fiber);
      if (bag) forms.push(toFormData(bag, forms.length));
    } catch (e) {
      log.warn('Error while checking fiber:', e);
    }

    if (fiber.child) walk(fiber.child, forms, depth + 1);
    if (fiber.sibling) walk(fiber.sibling, forms, depth);
  }

  function getRoots() {
    const roots = [];
    if (HOOK.getFiberRoots && HOOK.renderers && typeof HOOK.renderers.forEach === 'function') {
      HOOK.renderers.forEach((renderer, id) => {
        try {
          const set = HOOK.getFiberRoots(id);
          if (set && set.size) set.forEach(r => r?.current && roots.push(r.current));
        } catch (e) {
          log.warn('getFiberRoots failed for renderer', id, e);
        }
      });
    }
    if (roots.length) return roots;

    // Fallback: attempt via renderer APIs using common containers
    const containers = document.querySelectorAll('[data-reactroot], #root, #app, [id*="root"], [id*="app"]');
    if (HOOK.renderers) {
      HOOK.renderers.forEach(renderer => {
        if (!renderer.findFiberByHostInstance) return;
        containers.forEach(el => {
          const host = el.firstElementChild || el;
          try {
            const fiber = renderer.findFiberByHostInstance(host);
            let cur = fiber;
            while (cur && (cur.return || cur._owner)) cur = cur.return || cur._owner;
            if (cur) roots.push(cur);
          } catch (_) {}
        });
      });
    }
    return roots;
  }

  function scanForms() {
    seen = new WeakSet();
    const forms = [];
    const roots = getRoots();
    log.info('Scanning. Renderers:', HOOK.renderers?.size || 0, 'Roots:', roots.length);
    roots.forEach(root => walk(root, forms));
    log.info('Scan complete. Forms:', forms.length);
    return forms;
  }

  function sendUpdate() {
    const forms = scanForms();
    window.postMessage({ source: 'formik-inspector', type: 'forms-update', forms, timestamp: Date.now() }, '*');
    if (forms.length !== lastFormCount) {
      lastFormCount = forms.length;
      window.postMessage({ source: 'formik-inspector', type: 'badge-update', count: forms.length }, '*');
    }
  }

  function debouncedUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sendUpdate, 100);
  }

  // Initial scan shortly after inject
  setTimeout(sendUpdate, 600);

  // Subscribe to React commits for live updates
  if (HOOK.onCommitFiberRoot) {
    const orig = HOOK.onCommitFiberRoot;
    HOOK.onCommitFiberRoot = function (...args) {
      try { orig.apply(this, args); } catch (e) { /* ignore */ }
      debouncedUpdate();
    };
    log.info('Subscribed to commit hook');
  }

  // Manual refresh from popup
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'formik-inspector' && event.data?.type === 'refresh-request') sendUpdate();
  });

  // Debug helpers
  window.__FORMIK_INSPECTOR_DEBUG__ = {
    scanForms,
    getRoots,
    forceScan: sendUpdate,
    HOOK,
  };

  log.info('Injected and ready');
})();
