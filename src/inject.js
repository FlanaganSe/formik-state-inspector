(() => {
  if (window.__FORMIK_INSPECTOR__ || !window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;

  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  window.__FORMIK_INSPECTOR__ = true;

  const extractFormikBag = (fiber) => {
    const bag = fiber?.memoizedProps?.value;
    if (!bag?.values || typeof bag.values !== "object") return null;

    const hasName = /Formik/i.test(fiber.type?.name || fiber.type?._context?.displayName || "");
    const hasShape = "errors" in bag && "touched" in bag && "isSubmitting" in bag;

    return hasName || hasShape ? bag : null;
  };

  const findFormikInstances = () => {
    const forms = [];
    const seen = new WeakSet();

    hook.renderers?.forEach((_, id) => {
      hook.getFiberRoots?.(id)?.forEach((root) => {
        if (!root?.current) return;

        const queue = [root.current];
        while (queue.length) {
          const fiber = queue.shift();
          if (!fiber || seen.has(fiber)) continue;
          seen.add(fiber);

          const bag = extractFormikBag(fiber);
          if (bag) forms.push(bag);

          if (fiber.child) queue.push(fiber.child);
          if (fiber.sibling) queue.push(fiber.sibling);
        }
      });
    });

    return forms;
  };

  const sendUpdate = () => {
    const forms = findFormikInstances().map((bag, i) => ({
      id: `form-${i}`,
      values: bag.values ?? {},
      errors: bag.errors ?? {},
      touched: bag.touched ?? {},
      isSubmitting: bag.isSubmitting ?? false,
      isValidating: bag.isValidating ?? false,
      isValid: bag.isValid ?? true,
      dirty: bag.dirty ?? false,
      submitCount: bag.submitCount ?? 0,
    }));

    window.postMessage({ source: "formik-inspector", type: "update", forms }, window.location.origin);
  };

  let timeout = null;
  const originalCommit = hook.onCommitFiberRoot;

  hook.onCommitFiberRoot = (...args) => {
    originalCommit?.apply(null, args);
    clearTimeout(timeout);
    timeout = setTimeout(sendUpdate, 100);
  };

  window.addEventListener("message", (e) => {
    if (e.source === window && e.data?.source === "formik-inspector" && e.data?.type === "refresh") {
      sendUpdate();
    }
  });

  window.addEventListener("beforeunload", () => {
    clearTimeout(timeout);
    hook.onCommitFiberRoot = originalCommit;
    delete window.__FORMIK_INSPECTOR__;
  });

  setTimeout(sendUpdate, 300);
})();
