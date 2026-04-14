function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function uniqueNonEmpty(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item)) {
      return false;
    }
    seen.add(item);
    return true;
  });
}

function collectBreadcrumbsFromSelector(selector) {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => normalizeText(el.textContent || el.getAttribute("aria-label")))
    .filter(Boolean);
}

function getBreadcrumbs() {
  const candidateSelectors = [
    'nav[aria-label*="Breadcrumb"] a',
    'nav[aria-label*="breadcrumb"] a',
    'nav a[role="link"]',
    'div[aria-label*="Breadcrumb"] a',
    'div[aria-label*="breadcrumb"] a'
  ];

  const crumbs = candidateSelectors.flatMap(collectBreadcrumbsFromSelector);
  return uniqueNonEmpty(crumbs);
}

function getSelectedItem() {
  return (
    document.querySelector('[role="row"][aria-selected="true"]') ||
    document.querySelector('[aria-selected="true"][data-id]') ||
    document.querySelector('[aria-selected="true"]')
  );
}

function cleanName(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  // Drive aria-label values often append metadata separated by commas.
  return normalized.split(",")[0].trim();
}

function getSelectedFileName() {
  const selected = getSelectedItem();
  if (!selected) {
    return null;
  }

  const textCandidates = [
    selected.querySelector('[data-tooltip]')?.getAttribute('data-tooltip'),
    selected.querySelector('[data-tooltip]')?.textContent,
    selected.getAttribute('aria-label'),
    selected.querySelector('[aria-label]')?.getAttribute('aria-label'),
    selected.textContent
  ];

  for (const candidate of textCandidates) {
    const cleaned = cleanName(candidate);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function buildPath() {
  const crumbs = getBreadcrumbs();
  const fileName = getSelectedFileName();

  if (!fileName) {
    return null;
  }

  const pathParts = [...crumbs];
  if (pathParts[pathParts.length - 1] !== fileName) {
    pathParts.push(fileName);
  }

  return pathParts.join(' > ');
}

function getSelectedFileLink() {
  const selected = getSelectedItem();
  if (!selected) {
    return window.location.href;
  }

  const directLink = selected.querySelector('a[href*="/file/d/"]')?.href;
  if (directLink) {
    return directLink;
  }

  const dataId = selected.getAttribute('data-id') || selected.dataset?.id;
  if (dataId) {
    return `https://drive.google.com/file/d/${dataId}/view`;
  }

  return window.location.href;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'GET_DATA') {
    return;
  }

  // Give Drive a brief moment after a click so aria-selected can update.
  setTimeout(() => {
    const path = buildPath();
    const link = getSelectedFileLink();
    sendResponse({
      path,
      link,
      ok: Boolean(path)
    });
  }, 150);

  return true;
});
