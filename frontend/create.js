"use strict";

// Keep form variables separate from the opportunity-list variables.
(() => {
  const form = document.getElementById("opportunityForm");
  const modalElement = document.getElementById("opportunityFormModal");
  const addButton = document.getElementById("addOpportunityButton");
  const saveButton = document.getElementById("saveOpportunityButton");
  const deadlineInput = document.getElementById("deadlineInput");
  const formError = document.getElementById("formError");
  const successMessage = document.getElementById("formSuccess");

  let isSaving = false;

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
    saveButton.textContent = saving ? "Saving…" : "Create opportunity";
  }

  function validateForm() {
    // Trim text before checking required fields, so spaces alone are invalid.
    for (const field of form.querySelectorAll('input[type="text"], textarea')) {
      field.value = field.value.trim();
      field.setCustomValidity("");

      if (field.maxLength > 0 && field.value.length > field.maxLength) {
        field.setCustomValidity("This value exceeds the allowed length.");
      }
    }

    deadlineInput.min = todayDate();
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

    return {
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
  }

  addButton.addEventListener("click", () => {
    if (!window.bootstrap) {
      pageMessage.textContent =
        "The form dialog could not load. Check your internet connection and reload.";
      pageMessage.hidden = false;
      return;
    }

    bootstrap.Modal.getOrCreateInstance(modalElement).show();
  });

  modalElement.addEventListener("show.bs.modal", () => {
    form.reset();
    form.classList.remove("was-validated");
    formError.hidden = true;
    successMessage.hidden = true;
    deadlineInput.min = todayDate();

    for (const field of form.querySelectorAll("input, textarea, select")) {
      field.setCustomValidity("");
    }
  });

  modalElement.addEventListener("shown.bs.modal", () => {
    document.getElementById("titleInput").focus();
  });

  modalElement.addEventListener("hide.bs.modal", (event) => {
    // Keep the dialog open until the current save request finishes.
    if (isSaving) {
      event.preventDefault();
    }
  });

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

    // Read values before disabling the controls.
    const payload = buildPayload();
    let created = null;
    setSaving(true);

    try {
      created = await apiRequest("/api/opportunities", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
      });
    } catch (error) {
      // Preserve entered values so the user can correct or retry the request.
      showFormError(error.message);
    } finally {
      setSaving(false);
    }

    if (created) {
      bootstrap.Modal.getOrCreateInstance(modalElement).hide();
      successMessage.textContent = `Opportunity "${created.title}" created successfully.`;
      successMessage.hidden = false;
      await loadOpportunities();
    }
  });
})();
