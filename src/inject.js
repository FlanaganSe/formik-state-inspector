(() => {
	// Prevent double-injection (content scripts can run more than once)
	if (window.__FORMIK_INSPECTOR_ACTIVE__) return;
	window.__FORMIK_INSPECTOR_ACTIVE__ = true;

	const HOOK = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
	if (!HOOK) {
		console.warn(
			"[Formik Inspector] React DevTools hook not found; no inspection.",
		);
		return;
	}

	// Toggle for local debugging
	const DEBUG = false;
	const log = (...a) => DEBUG && console.log("[Formik Inspector]", ...a);

	let lastCount = 0;
	let debounceId;

	// ---- Small, clear helpers -------------------------------------------------

	const isObj = (x) => x != null && typeof x === "object";

	// Heuristic: tolerate Formik versions by checking context *or* bag shape
	function getFormikBagFromFiber(fiber) {
		const props = fiber?.memoizedProps;
		const bag = props?.value;
		const type = fiber?.type;
		const ctx = type?._context;
		const typeName = type?.name || "";

		// If it's a context provider named like Formik, trust it.
		const ctxLooksFormik =
			!!ctx && /Formik/i.test(ctx.displayName || ctx._displayName || "");

		// If component name hints at Formik, prefer it too.
		const typeLooksFormik = /Formik|FormikContext/i.test(typeName || "");

		// Generic “Formik bag” shape (loose on purpose for version drift)
		const looksLikeBag =
			isObj(bag) &&
			isObj(bag.values) &&
			isObj(bag.errors) &&
			isObj(bag.touched) &&
			// common methods, optional: tolerate undefined to span versions
			(bag.handleSubmit === undefined ||
				typeof bag.handleSubmit === "function") &&
			(bag.handleChange === undefined ||
				typeof bag.handleChange === "function");

		return (ctxLooksFormik || typeLooksFormik || looksLikeBag) && isObj(bag)
			? bag
			: null;
	}

	function toFormData(bag, idx) {
		// Only pluck safe, serializable fields; default generously
		return {
			id: `form-${idx}`,
			values: bag.values ?? {},
			errors: bag.errors ?? {},
			touched: bag.touched ?? {},
			isSubmitting: !!bag.isSubmitting,
			isValidating: !!bag.isValidating,
			isValid: bag.isValid ?? true,
			submitCount: bag.submitCount ?? 0,
			dirty: !!bag.dirty,
			status: bag.status,
			initialValues: bag.initialValues ?? {},
		};
	}

	// Breadth-first walk keeps stack tiny; WeakSet avoids revisits
	function traverseFiber(root, visit) {
		if (!root) return;
		const seen = new WeakSet();
		const q = [root];
		while (q.length) {
			const f = q.shift();
			if (!f || seen.has(f)) continue;
			seen.add(f);

			visit(f);

			// Children first (BFS)
			if (f.child) q.push(f.child);
			// Then siblings (stay at level)
			if (f.sibling) q.push(f.sibling);
			// Some renderers expose alternate trees; ignore to keep it simple
		}
	}

	// Best path: ask DevTools for roots
	function getRootsViaHook() {
		const out = [];
		if (!HOOK.getFiberRoots || !HOOK.renderers) return out;
		try {
			HOOK.renderers.forEach((_, id) => {
				const set = HOOK.getFiberRoots(id);
				if (set?.size) set.forEach((r) => r?.current && out.push(r.current));
			});
		} catch (e) {
			log("getFiberRoots failed", e);
		}
		return out;
	}

	// Gentle fallback: try common containers + renderer.findFiberByHostInstance
	function getRootsFallback() {
		const roots = [];
		const containers = document.querySelectorAll(
			'[data-reactroot], #root, #app, [id*="root"], [id*="app"]',
		);
		if (!containers.length || !HOOK.renderers) return roots;

		HOOK.renderers.forEach((renderer) => {
			const find = renderer?.findFiberByHostInstance;
			if (!find) return;
			containers.forEach((el) => {
				const host = el.firstElementChild || el;
				try {
					const fiber = find(host);
					let cur = fiber;
					while (cur && (cur.return || cur._owner))
						cur = cur.return || cur._owner;
					if (cur) roots.push(cur);
				} catch {
					/* ignore */
				}
			});
		});
		return roots;
	}

	function scanForms() {
		const forms = [];
		const roots = getRootsViaHook();
		const allRoots = roots.length ? roots : getRootsFallback();

		for (const root of allRoots) {
			traverseFiber(root, (fiber) => {
				const bag = getFormikBagFromFiber(fiber);
				if (bag) forms.push(toFormData(bag, forms.length));
			});
		}

		log("scan complete:", { roots: allRoots.length, forms: forms.length });
		return forms;
	}

	function post(forms) {
		window.postMessage(
			{
				source: "formik-inspector",
				type: "forms-update",
				forms,
				timestamp: Date.now(),
			},
			"*",
		);
		if (forms.length !== lastCount) {
			lastCount = forms.length;
			window.postMessage(
				{
					source: "formik-inspector",
					type: "badge-update",
					count: forms.length,
				},
				"*",
			);
		}
	}

	function updateNow() {
		try {
			post(scanForms());
		} catch (e) {
			console.warn("[Formik Inspector] scan failed:", e);
		}
	}

	function debouncedUpdate(ms = 100) {
		if (debounceId) clearTimeout(debounceId);
		debounceId = setTimeout(updateNow, ms);
	}

	// ---- Wiring: fast path (React commits) + safe fallbacks --------------------

	// Initial snapshot, slightly delayed so apps finishing mount get included
	setTimeout(updateNow, 400);

	// Subscribe to React commits (most efficient)
	if (HOOK.onCommitFiberRoot) {
		const orig = HOOK.onCommitFiberRoot;
		HOOK.onCommitFiberRoot = function (...args) {
			try {
				return orig.apply(this, args);
			} finally {
				debouncedUpdate();
			}
		};
	}

	// Fallback: DOM mutations can hint at re-renders in non-standard setups
	const mo = new MutationObserver(() => debouncedUpdate(200));
	mo.observe(document.documentElement, { childList: true, subtree: true });

	// Manual refresh from extension UI
	window.addEventListener("message", (e) => {
		if (
			e?.data?.source === "formik-inspector" &&
			e.data.type === "refresh-request"
		) {
			updateNow();
		}
	});

	// Small debug surface
	window.__FORMIK_INSPECTOR_DEBUG__ = {
		scanForms,
		forceScan: updateNow,
		getRootsViaHook,
		getRootsFallback,
		HOOK,
	};

	log("ready");
})();
