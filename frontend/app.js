"use strict";

// Public development configuration. No opportunity records are stored here.
const API_BASE_URL = "http://127.0.0.1:8000";

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

// Display database text as text, never as executable HTML.
function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(value) {
  // A date-only value is parsed at local midnight to avoid a UTC date shift.
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
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }

  const data = await response.json();

  if (!response.ok) {
    const message = data.detail || "The request could not be completed.";
    const errors = Array.isArray(data.errors)
      ? data.errors.map((item) => item.message).join(" ")
      : "";

    throw new Error(errors ? `${message} ${errors}` : message);
  }

  return data;
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
  refreshButton.disabled = true;
  pageMessage.hidden = true;
  listLoading.hidden = false;
  emptyState.hidden = true;
  grid.hidden = true;
  grid.replaceChildren();
  listSummary.textContent = "Loading opportunities…";

  try {
    const opportunities = await apiRequest("/api/opportunities");

    listSummary.textContent = `${opportunities.length} ${
      opportunities.length === 1 ? "opportunity" : "opportunities"
    } available to view`;

    if (opportunities.length === 0) {
      emptyState.hidden = false;
      return;
    }

    const cards = document.createDocumentFragment();
    for (const opportunity of opportunities) {
      cards.append(createOpportunityCard(opportunity));
    }

    grid.append(cards);
    grid.hidden = false;
  } catch (error) {
    pageMessage.textContent = error.message;
    pageMessage.hidden = false;
    listSummary.textContent = "Unable to load opportunities.";
  } finally {
    listLoading.hidden = true;
    refreshButton.disabled = false;
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
    // Fetch the selected record again so the modal displays current DB values.
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

detailsElement.addEventListener("hide.bs.modal", () => {
  if (detailsRequest) {
    detailsRequest.abort();
  }
});

refreshButton.addEventListener("click", loadOpportunities);
loadOpportunities();
