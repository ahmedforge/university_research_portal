"use strict";

// Public development configuration. No opportunity records are stored here.
const API_BASE_URL = "http:" + "//127.0.0.1:8000";

const grid = document.getElementById("opportunityGrid");
const listLoading = document.getElementById("listLoading");
const emptyState = document.getElementById("emptyState");
const listSummary = document.getElementById("listSummary");
const pageMessage = document.getElementById("pageMessage");
const refreshButton = document.getElementById("refreshButton");
const detailsElement = document.getElementById("detailsModal");
const detailsTitle = document.getElementById("detailsTitle");
const detailsBody = document.getElementById("detailsBody");

let detailsRequest = null;
let detailsBusy = false;
let allOpportunities = [];
let listAvailable = false;
let listRequest = null;

const filters = createFilters();

// Database values are displayed as text, never as executable HTML.
function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(value) {
  const parsed = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function statusBadge(status) {
  const className = status === "Open" ? "status-open" : "status-closed";
  return createElement("span", `status-badge ${className}`, status);
}

function loadingMessage(message) {
  const wrapper = createElement("div", "text-center py-4");
  wrapper.setAttribute("role", "status");

  const spinner = createElement("span", "spinner-border text-primary");
  spinner.setAttribute("aria-hidden", "true");

  wrapper.append(spinner, createElement("p", "mt-3 mb-0", message));
  return wrapper;
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const sourceSignal = options.signal;
  let timedOut = false;

  const cancelRequest = () => controller.abort();

  if (sourceSignal) {
    if (sourceSignal.aborted) {
      controller.abort();
    } else {
      sourceSignal.addEventListener("abort", cancelRequest, {once: true});
    }
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10000);

  let response;
  let data;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {Accept: "application/json", ...options.headers},
    });
    data = await response.json();
  } catch (error) {
    if (timedOut) {
      throw new Error(
        "Request timed out. Refresh the list to check the result before retrying."
      );
    }

    if (sourceSignal && sourceSignal.aborted) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new Error("The server returned an unexpected response.");
    }

    throw new Error("Cannot reach the server. Check that the backend is running.");
  } finally {
    clearTimeout(timeout);

    if (sourceSignal) {
      sourceSignal.removeEventListener("abort", cancelRequest);
    }
  }

  if (!response.ok) {
    const message = data.detail || "The request could not be completed.";
    const errors = Array.isArray(data.errors)
      ? data.errors.map((item) => item.message).join(" ")
      : "";

    throw new Error(errors ? `${message} ${errors}` : message);
  }

  return data;
}

function createFilters() {
  const panel = createElement("div", "filter-panel mb-4");
  panel.setAttribute("role", "search");
  panel.setAttribute("aria-label", "Filter research opportunities");

  const row = createElement("div", "row g-3");

  function addControl(id, label, width, control) {
    const column = createElement("div", width);
    const heading = createElement("label", "form-label", label);
    heading.htmlFor = id;
    control.id = id;
    column.append(heading, control);
    row.append(column);
  }

  const search = createElement("input", "form-control");
  search.type = "search";
  search.placeholder = "Title, faculty, skills…";
  search.setAttribute("autocomplete", "off");
  addControl("searchInput", "Search opportunities", "col-12 col-md-6", search);

  const status = createElement("select", "form-select");
  status.append(
    new Option("All statuses", ""),
    new Option("Open", "Open"),
    new Option("Closed", "Closed")
  );
  addControl("statusFilter", "Status", "col-6 col-md-3", status);

  const area = createElement("select", "form-select");
  area.append(new Option("All research areas", ""));
  addControl("areaFilter", "Research area", "col-6 col-md-3", area);

  const footer = createElement(
    "div",
    "d-flex justify-content-between align-items-center gap-3 mt-3"
  );
  const updated = createElement("span", "filter-caption", "Waiting for data");
  const clear = createElement(
    "button",
    "btn btn-link p-0 text-decoration-none",
    "Clear filters"
  );
  clear.type = "button";

  footer.append(updated, clear);
  panel.append(row, footer);
  document.querySelector(".section-toolbar").after(panel);

  search.addEventListener("input", renderOpportunities);
  status.addEventListener("change", renderOpportunities);
  area.addEventListener("change", renderOpportunities);

  clear.addEventListener("click", () => {
    search.value = "";
    status.value = "";
    area.value = "";
    renderOpportunities();
    search.focus();
  });

  return {search, status, area, updated, clear};
}

function setFiltersDisabled(disabled) {
  for (const control of [
    filters.search,
    filters.status,
    filters.area,
    filters.clear,
  ]) {
    control.disabled = disabled;
  }
}

function updateAreaOptions() {
  const previous = filters.area.value;
  const areas = [
    ...new Set(allOpportunities.map((item) => item.research_area)),
  ];

  areas.sort((first, second) => first.localeCompare(second));

  filters.area.replaceChildren(new Option("All research areas", ""));

  for (const area of areas) {
    filters.area.append(new Option(area, area));
  }

  filters.area.value = areas.includes(previous) ? previous : "";
}

function renderOpportunities() {
  if (!listAvailable) {
    return;
  }

  const query = filters.search.value.trim().toLowerCase();
  const selectedStatus = filters.status.value;
  const selectedArea = filters.area.value;

  const visible = allOpportunities.filter((opportunity) => {
    const searchable = [
      opportunity.title,
      opportunity.description,
      opportunity.research_area,
      opportunity.faculty_name,
      opportunity.department,
      opportunity.required_skills,
    ].join(" ").toLowerCase();

    return (
      searchable.includes(query) &&
      (!selectedStatus || opportunity.status === selectedStatus) &&
      (!selectedArea || opportunity.research_area === selectedArea)
    );
  });

  listSummary.textContent =
    `Showing ${visible.length} of ${allOpportunities.length} opportunities`;

  grid.replaceChildren();
  emptyState.hidden = visible.length !== 0;
  grid.hidden = visible.length === 0;

  if (visible.length === 0) {
    const noRecords = allOpportunities.length === 0;

    emptyState.querySelector("h3").textContent = noRecords
      ? "No opportunities yet"
      : "No matching opportunities";

    emptyState.querySelector("p").textContent = noRecords
      ? "Select Add opportunity to post the first research project."
      : "Try another search or select Clear filters.";

    return;
  }

  const cards = document.createDocumentFragment();

  for (const opportunity of visible) {
    cards.append(createOpportunityCard(opportunity));
  }

  grid.append(cards);
}

function createOpportunityCard(opportunity) {
  const column = createElement("div", "col-12 col-md-6 col-xl-4");
  const card = createElement("article", "card opportunity-card");
  const body = createElement("div", "card-body");

  const top = createElement(
    "div",
    "d-flex justify-content-between align-items-start gap-3 mb-3"
  );
  top.append(
    createElement("span", "research-area", opportunity.research_area),
    statusBadge(opportunity.status)
  );

  const title = createElement("h3", "opportunity-title", opportunity.title);
  const description = createElement(
    "p",
    "card-description mb-3",
    opportunity.description
  );
  const faculty = createElement(
    "p",
    "card-meta mb-1",
    opportunity.faculty_name
  );
  const department = createElement(
    "p",
    "card-meta mb-3",
    opportunity.department
  );

  const bottom = createElement("div", "card-bottom");
  const deadline = createElement(
    "p",
    "card-meta mb-2",
    `Deadline: ${formatDate(opportunity.application_deadline)}`
  );
  const positions = createElement(
    "p",
    "card-meta mb-3",
    `${opportunity.positions_available} available ${
      opportunity.positions_available === 1 ? "position" : "positions"
    }`
  );

  const button = createElement(
    "button",
    "btn btn-outline-primary w-100",
    "View details"
  );
  button.type = "button";
  button.setAttribute("aria-label", `View details of ${opportunity.title}`);
  button.addEventListener("click", () => showDetails(opportunity.id));

  bottom.append(deadline, positions, button);
  body.append(top, title, description, faculty, department, bottom);
  card.append(body);
  column.append(card);
  return column;
}

async function loadOpportunities() {
  if (listRequest) {
    listRequest.abort();
  }

  const controller = new AbortController();
  listRequest = controller;

  listAvailable = false;
  refreshButton.disabled = true;
  setFiltersDisabled(true);
  pageMessage.hidden = true;
  listLoading.hidden = false;
  emptyState.hidden = true;
  grid.hidden = true;
  listSummary.textContent = "Loading opportunities…";

  try {
    const opportunities = await apiRequest("/api/opportunities", {
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      return;
    }

    if (!Array.isArray(opportunities)) {
      throw new Error("The server returned an unexpected list response.");
    }

    allOpportunities = opportunities;
    listAvailable = true;
    updateAreaOptions();

    filters.updated.textContent = `Updated ${new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    renderOpportunities();
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }

    pageMessage.textContent = error.message;
    pageMessage.hidden = false;
    listSummary.textContent = "Unable to load opportunities.";
    filters.updated.textContent = "Select Refresh to try again";
  } finally {
    if (listRequest === controller) {
      listRequest = null;
      listLoading.hidden = true;
      refreshButton.disabled = false;
      setFiltersDisabled(!listAvailable);
    }
  }
}

function addDetail(container, label, value, fullWidth = false) {
  const column = createElement(
    "div",
    fullWidth ? "col-12" : "col-12 col-sm-6"
  );

  column.append(
    createElement("h3", "detail-label", label),
    createElement("p", "detail-value", String(value))
  );
  container.append(column);
}

function setDetailsBusy(busy) {
  detailsBusy = busy;
  detailsBody.setAttribute("aria-busy", String(busy));

  for (const button of detailsElement.querySelectorAll("button")) {
    button.disabled = busy;
  }
}

async function performOpportunityAction(opportunity, action, button, errorBox) {
  if (detailsBusy) {
    return;
  }

  const deleting = action === "delete";

  if (deleting) {
    const confirmed = window.confirm(
      `Delete "${opportunity.title}"? This permanently removes the opportunity.`
    );
    if (!confirmed) {
      return;
    }
  }

  const originalLabel = button.textContent;
  const successMessage = document.getElementById("formSuccess");
  successMessage.hidden = true;
  errorBox.hidden = true;

  let succeeded = false;
  setDetailsBusy(true);
  button.textContent = deleting ? "Deleting…" : "Closing…";

  try {
    const options = deleting
      ? {method: "DELETE"}
      : {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({status: "Closed"}),
        };

    await apiRequest(`/api/opportunities/${opportunity.id}`, options);
    succeeded = true;
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  } finally {
    setDetailsBusy(false);
    button.textContent = originalLabel;
  }

  if (succeeded) {
    successMessage.textContent =
      `Opportunity "${opportunity.title}" ${deleting ? "deleted" : "closed"} successfully.`;
    successMessage.hidden = false;

    bootstrap.Modal.getOrCreateInstance(detailsElement).hide();
    await loadOpportunities();
  }
}

function addManagementActions(container, opportunity) {
  const column = createElement("div", "col-12");
  const errorBox = createElement("div", "alert alert-danger");
  errorBox.hidden = true;
  errorBox.setAttribute("role", "alert");

  const actions = createElement(
    "div",
    "d-flex flex-wrap gap-2 border-top pt-3"
  );

  const editButton = createElement(
    "button",
    "btn btn-outline-primary",
    "Edit opportunity"
  );
  editButton.type = "button";

  editButton.addEventListener("click", () => {
    detailsElement.addEventListener(
      "hidden.bs.modal",
      () => window.opportunityForm.openEdit(opportunity),
      {once: true}
    );
    bootstrap.Modal.getOrCreateInstance(detailsElement).hide();
  });

  actions.append(editButton);

  if (opportunity.status === "Open") {
    const closeButton = createElement(
      "button",
      "btn btn-outline-secondary",
      "Close opportunity"
    );
    closeButton.type = "button";
    closeButton.addEventListener("click", () => {
      performOpportunityAction(opportunity, "close", closeButton, errorBox);
    });
    actions.append(closeButton);
  }

  const deleteButton = createElement(
    "button",
    "btn btn-outline-danger",
    "Delete"
  );
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => {
    performOpportunityAction(opportunity, "delete", deleteButton, errorBox);
  });

  actions.append(deleteButton);
  column.append(errorBox, actions);
  container.append(column);
}

async function showDetails(id) {
  if (!window.bootstrap) {
    pageMessage.textContent =
      "The details dialog could not load. Check your internet connection and reload.";
    pageMessage.hidden = false;
    return;
  }

  if (detailsRequest) {
    detailsRequest.abort();
  }

  const controller = new AbortController();
  detailsRequest = controller;

  detailsTitle.textContent = "Opportunity details";
  detailsBody.replaceChildren(loadingMessage("Loading complete details…"));
  bootstrap.Modal.getOrCreateInstance(detailsElement).show();

  try {
    const opportunity = await apiRequest(`/api/opportunities/${id}`, {
      signal: controller.signal,
    });

    if (controller.signal.aborted) {
      return;
    }

    detailsTitle.textContent = opportunity.title;
    const content = createElement("div", "row g-4");
    const statusColumn = createElement("div", "col-12");
    statusColumn.append(statusBadge(opportunity.status));
    content.append(statusColumn);

    addDetail(content, "Research description", opportunity.description, true);
    addDetail(content, "Research area", opportunity.research_area);
    addDetail(content, "Faculty member", opportunity.faculty_name);
    addDetail(content, "Department", opportunity.department);
    addDetail(content, "Available positions", opportunity.positions_available);
    addDetail(
      content,
      "Application deadline",
      formatDate(opportunity.application_deadline)
    );
    addDetail(content, "Opportunity ID", opportunity.id);
    addDetail(content, "Required skills", opportunity.required_skills, true);
    addDetail(content, "Created at", opportunity.created_at.replace("T", " "));
    addDetail(content, "Last updated", opportunity.updated_at.replace("T", " "));
    addManagementActions(content, opportunity);

    detailsBody.replaceChildren(content);
  } catch (error) {
    if (error.name !== "AbortError") {
      detailsBody.replaceChildren(
        createElement("div", "alert alert-danger mb-0", error.message)
      );
    }
  } finally {
    if (detailsRequest === controller) {
      detailsRequest = null;
    }
  }
}

detailsElement.addEventListener("hide.bs.modal", (event) => {
  if (detailsBusy) {
    event.preventDefault();
    return;
  }

  if (detailsRequest) {
    detailsRequest.abort();
  }
});

refreshButton.addEventListener("click", () => {
  document.getElementById("formSuccess").hidden = true;
  loadOpportunities();
});

loadOpportunities();
