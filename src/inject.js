(() => {
	if (
		window.__FORMIK_INSPECTOR_ACTIVE__ ||
		!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
	)
		return;

	const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
	window.__FORMIK_INSPECTOR_ACTIVE__ = true;

	function getFormikBag(fiber) {
		if (!fiber || typeof fiber !== "object") return null;

		const bag = fiber.memoizedProps?.value;
		if (!bag || typeof bag !== "object" || !("values" in bag)) return null;

		const type = fiber.type;
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
		} catch (error) {
			// Silent fail for robustness
		}
		return forms;
	}

	function scan() {
		try {
			const forms = findForms();
			if (!Array.isArray(forms)) return;

			const serialized = forms
				.filter((bag) => bag && typeof bag === "object")
				.map((bag, i) => ({
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
			// Silent fail for robustness
		}
	}

	// Hook into React commits for automatic updates
	const originalCommit = HOOK.onCommitFiberRoot;
	HOOK.onCommitFiberRoot = (...args) => {
		try {
			if (typeof originalCommit === "function") {
				return originalCommit.apply(null, args);
			}
		} finally {
			setTimeout(scan, 100); // Debounced scan
		}
	};

	// Listen for manual refresh requests
	window.addEventListener("message", (event) => {
		if (
			event?.data?.source === "formik-inspector" &&
			event.data.type === "refresh-request"
		) {
			scan();
		}
	});

	// Initial scan
	setTimeout(scan, 300);
})();
