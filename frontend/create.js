"use strict";

// The existing form supports both creation and editing.
(() => {
  const form = document.getElementById("opportunityForm");
  const modalElement = document.getElementById("opportunityFormModal");
  const formTitle = document.getElementById("opportunityFormTitle");
  const addButton = document.getElementById("addOpportunityButton");
  const saveButton = document.getElementById("saveOpportunityButton");
  const deadlineInput = document.getElementById("deadlineInput");
  const formError = document.getElementById("formError");
  const successMessage = document.getElementById("formSuccess");

  let isSaving = false;
  let originalOpportunity = null;

  function todayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function setSaving(saving) {
    isSaving = saving;

    for (const control of form.querySelectorAll("input, textarea, select, button")) {
      control.disabled = saving;
    }

    form.setAttribute("aria-busy", String(saving));
    saveButton.textContent = saving
      ? "Saving…"
      : originalOpportunity
        ? "Save changes"
        : "Create opportunity";
  }

  function updateDeadlineMinimum() {
    const unchangedDeadline =
      originalOpportunity &&
      deadlineInput.value === originalOpportunity.application_deadline;

    // An expired existing deadline can remain unchanged during an edit.
    deadlineInput.min = unchangedDeadline ? "" : todayDate();
  }

  function validateForm() {
    for (const field of form.querySelectorAll('input[type="text"], textarea')) {
      field.value = field.value.trim();
      field.setCustomValidity("");

      if (field.maxLength > 0 && field.value.length > field.maxLength) {
        field.setCustomValidity("This value exceeds the allowed length.");
      }
    }

    updateDeadlineMinimum();
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
      showFormError("Please review the highlighted fields.");
      const invalidField = form.querySelector(":invalid");
      if (invalidField) {
        invalidField.focus();
      }
      return false;
    }

    return true;
  }

  function buildPayload() {
    const fields = new FormData(form);

    const values = {
      title: fields.get("title"),
      description: fields.get("description"),
      research_area: fields.get("research_area"),
      faculty_name: fields.get("faculty_name"),
      department: fields.get("department"),
      required_skills: fields.get("required_skills"),
      positions_available: Number(fields.get("positions_available")),
      application_deadline: fields.get("application_deadline"),
      status: fields.get("status"),
    };

    if (!originalOpportunity) {
      return values;
    }

    // PUT accepts partial updates, so send only changed values.
    const changes = {};
    for (const [field, value] of Object.entries(values)) {
      if (value !== originalOpportunity[field]) {
        changes[field] = value;
      }
    }

    return changes;
  }

  addButton.addEventListener("click", () => {
    if (!window.bootstrap) {
      pageMessage.textContent =
        "The form dialog could not load. Check your internet connection and reload.";
      pageMessage.hidden = false;
      return;
    }

    originalOpportunity = null;
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
  });

  // A small public interface used by the details modal's Edit button.
  window.opportunityForm = {
    openEdit(opportunity) {
      originalOpportunity = {...opportunity};
      bootstrap.Modal.getOrCreateInstance(modalElement).show();
    },
  };

  modalElement.addEventListener("show.bs.modal", () => {
    form.reset();
    form.classList.remove("was-validated");
    formError.hidden = true;
    successMessage.hidden = true;

    for (const field of form.querySelectorAll("input, textarea, select")) {
      field.setCustomValidity("");
    }

    if (originalOpportunity) {
      for (const field of form.querySelectorAll("[name]")) {
        field.value = originalOpportunity[field.name];
      }
    }

    formTitle.textContent = originalOpportunity
      ? "Edit opportunity"
      : "Add opportunity";

    setSaving(false);
    updateDeadlineMinimum();
  });

  modalElement.addEventListener("shown.bs.modal", () => {
    document.getElementById("titleInput").focus();
  });

  modalElement.addEventListener("hide.bs.modal", (event) => {
    if (isSaving) {
      event.preventDefault();
    }
  });

  modalElement.addEventListener("hidden.bs.modal", () => {
    originalOpportunity = null;
  });

  deadlineInput.addEventListener("input", updateDeadlineMinimum);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    formError.hidden = true;
    successMessage.hidden = true;

    if (!validateForm()) {
      return;
    }

    const editing = originalOpportunity !== null;
    const payload = buildPayload();

    if (editing && Object.keys(payload).length === 0) {
      showFormError("No changes to save. Update a field or select Cancel.");
      return;
    }

    const path = editing
      ? `/api/opportunities/${originalOpportunity.id}`
      : "/api/opportunities";

    let saved = null;
    setSaving(true);

    try {
      saved = await apiRequest(path, {
        method: editing ? "PUT" : "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
    } catch (error) {
      showFormError(error.message);
    } finally {
      setSaving(false);
    }

    if (saved) {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
      successMessage.textContent =
        `Opportunity "${saved.title}" ${editing ? "updated" : "created"} successfully.`;
      successMessage.hidden = false;
      await loadOpportunities();
    }
  });
})();
