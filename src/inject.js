(() => {
	if (
		window.__FORMIK_INSPECTOR_ACTIVE__ ||
		!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
	)
		return;

	const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
	window.__FORMIK_INSPECTOR_ACTIVE__ = true;

	function getFormikBag(fiber) {
		const bag = fiber?.memoizedProps?.value;
		if (!bag || typeof bag !== "object" || !("values" in bag)) return null;

		const type = fiber?.type;
		const hasFormikName = /Formik/i.test(
			type?.name || type?._context?.displayName || "",
		);
		const hasFormikShape =
			"errors" in bag && "touched" in bag && "isSubmitting" in bag;

		return hasFormikName || hasFormikShape ? bag : null;
	}

	function findForms() {
		const forms = [];
		const roots = new Set();
		const seen = new WeakSet();

		HOOK.renderers?.forEach((_, id) => {
			HOOK.getFiberRoots(id)?.forEach((root) => roots.add(root?.current));
		});

		for (const root of roots) {
			const queue = [root];
			while (queue.length > 0) {
				const fiber = queue.shift();
				if (!fiber || seen.has(fiber)) continue;
				seen.add(fiber);

				const bag = getFormikBag(fiber);
				if (bag) forms.push(bag);

				if (fiber.child) queue.push(fiber.child);
				if (fiber.sibling) queue.push(fiber.sibling);
			}
		}
		return forms;
	}

	function scan() {
		try {
			const forms = findForms();
			const serialized = forms.map((bag, i) => ({
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

			window.postMessage(
				{
					source: "formik-inspector",
					type: "forms-update",
					forms: serialized,
				},
				"*",
			);
		} catch (e) {
			console.warn("[Formik Inspector] Scan failed:", e);
		}
	}

	// Hook into React commits for automatic updates
	const originalCommit = HOOK.onCommitFiberRoot;
	HOOK.onCommitFiberRoot = (...args) => {
		try {
			return originalCommit?.apply(null, args);
		} finally {
			setTimeout(scan, 100); // Debounced scan
		}
	};

	// Listen for manual refresh requests
	window.addEventListener("message", (event) => {
		if (
			event.data?.source === "formik-inspector" &&
			event.data.type === "refresh-request"
		) {
			scan();
		}
	});

	// Initial scan
	setTimeout(scan, 300);
	console.log("[Formik Inspector] Ready");
})();
