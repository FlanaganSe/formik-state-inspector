const $ = (id) => document.getElementById(id);
const status = $("status");
const emptyState = $("emptyState");
const formsList = $("formsList");
const refreshBtn = $("refreshBtn");

let currentTab;

// Verify DOM elements exist
if (!status || !emptyState || !formsList || !refreshBtn) {
	console.error("[Formik Inspector] Required DOM elements not found");
}

function setStatus(text, className = "") {
	if (status) {
		status.textContent = String(text || "");
		status.className = `status ${className || ""}`;
	}
}

function showEmpty() {
	if (emptyState) emptyState.style.display = "block";
	if (formsList) formsList.style.display = "none";
}

function showForms() {
	if (emptyState) emptyState.style.display = "none";
	if (formsList) formsList.style.display = "block";
}

function createFormCard(form, index) {
	if (!form || typeof form !== "object") {
		return document.createElement("div");
	}

	const card = document.createElement("div");
	card.className = "form-card";

	const errors =
		form.errors && typeof form.errors === "object" ? form.errors : {};
	const values =
		form.values && typeof form.values === "object" ? form.values : {};
	const touched =
		form.touched && typeof form.touched === "object" ? form.touched : {};

	const errorCount = Object.keys(errors).length;
	const fieldCount = Object.keys(values).length;
	const touchedCount = Object.values(touched).filter(Boolean).length;

	const statusIndicators = [];
	if (form.isSubmitting) statusIndicators.push("⟳ Submitting");
	if (form.isValidating) statusIndicators.push("✓ Validating");
	if (form.dirty) statusIndicators.push("● Modified");

	card.innerHTML = `
    <div class="form-header">
      <h3>Form ${index + 1}</h3>
      <div class="form-stats">
        ${fieldCount} fields • ${errorCount} errors • ${touchedCount} touched
      </div>
      ${statusIndicators.length ? `<div class="form-status">${statusIndicators.join(" ")}</div>` : ""}
    </div>

    <div class="form-section">
      <div class="section-header">
        <strong>Values</strong>
        <button class="copy-btn" data-copy="values">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(values, null, 2)}</pre>
    </div>

    ${
			errorCount > 0
				? `
    <div class="form-section error-section">
      <div class="section-header">
        <strong>Errors</strong>
        <button class="copy-btn" data-copy="errors">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(errors, null, 2)}</pre>
    </div>`
				: ""
		}

    <div class="form-section">
      <div class="section-header">
        <strong>Touched</strong>
        <button class="copy-btn" data-copy="touched">Copy</button>
      </div>
      <pre class="json-data">${JSON.stringify(touched, null, 2)}</pre>
    </div>
  `;

	// Add click listeners for copy buttons
	card.querySelectorAll(".copy-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const type = btn.dataset.copy;
			let data = {};
			if (type === "values") data = values;
			else if (type === "errors") data = errors;
			else if (type === "touched") data = touched;

			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(JSON.stringify(data, null, 2));
			}
		});
	});

	return card;
}

function renderForms(forms) {
	if (!Array.isArray(forms) || forms.length === 0) {
		showEmpty();
		setStatus("No forms found", "inactive");
		return;
	}

	showForms();
	setStatus(
		`Found ${forms.length} form${forms.length === 1 ? "" : "s"}`,
		"active",
	);

	if (formsList) {
		formsList.innerHTML = "";
		forms.forEach((form, index) => {
			const card = createFormCard(form, index);
			if (card) formsList.appendChild(card);
		});
	}
}

function getForms() {
	try {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!Array.isArray(tabs) || tabs.length === 0) {
				setStatus("No active tab found", "error");
				showEmpty();
				return;
			}

			currentTab = tabs[0];
			if (!currentTab || !currentTab.id) {
				setStatus("Invalid tab", "error");
				showEmpty();
				return;
			}

			chrome.tabs.sendMessage(
				currentTab.id,
				{ type: "get-forms" },
				(response) => {
					if (chrome.runtime.lastError) {
						setStatus("Extension not loaded on this page", "error");
						showEmpty();
						return;
					}
					renderForms(response?.forms || []);
				},
			);
		});
	} catch (_error) {
		setStatus("Error accessing tab", "error");
		showEmpty();
	}
}

function refresh() {
	setStatus("Refreshing...", "loading");
	if (currentTab?.id) {
		try {
			chrome.tabs.sendMessage(currentTab.id, { type: "refresh" });
			setTimeout(() => {
				try {
					getForms();
				} catch (_error) {
					setStatus("Refresh failed", "error");
				}
			}, 500);
		} catch (_error) {
			setStatus("Refresh failed", "error");
		}
	} else {
		setStatus("No tab to refresh", "error");
	}
}

// Initialize
try {
	if (refreshBtn) {
		refreshBtn.addEventListener("click", refresh);
	} else {
		console.error("[Formik Inspector] Refresh button not found");
	}

	document.addEventListener("DOMContentLoaded", () => {
		try {
			getForms();
		} catch (_error) {
			setStatus("Initialization failed", "error");
		}
	});
} catch (_error) {
	// Extension initialization failed - silent
}
