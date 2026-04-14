function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
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

function stripDriveNamePrefixes(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  const prefixes = [
    /^Google\s+Drive\s+shortcut(?:\s+to)?\s*[:：-]?\s*/i,
    /^shortcut(?:\s+to)?\s*[:：-]?\s*/i,
    /^Google\s+Drive\s+folder\s*[:：-]?\s*/i,
    /^Google\s+Drive\s+file\s*[:：-]?\s*/i,
    /^folder\s*[:：-]?\s*/i,
    /^file\s*[:：-]?\s*/i
  ];

  const stripped = prefixes.reduce((acc, pattern) => acc.replace(pattern, ''), normalized).trim();
  if (stripped) {
    return stripped;
  }

  // Last-resort cleanup if labels include "Google Drive shortcut" without consistent punctuation.
  return normalized.replace(/google\s+drive\s+shortcut/gi, '').replace(/^[:：-]\s*/, '').trim();
}

function cleanName(value) {
  const stripped = stripDriveNamePrefixes(value);
  if (!stripped) {
    return '';
  }

  // Drive aria-label values often append metadata separated by commas.
  return stripped.split(',')[0].trim();
}

function collectBreadcrumbsFromSelector(selector) {
  return Array.from(document.querySelectorAll(selector))
    .map((el) => cleanName(el.textContent || el.getAttribute('aria-label') || el.getAttribute('data-tooltip')))
    .filter(Boolean);
}

function getBreadcrumbs() {
  const candidateSelectors = [
    'nav[aria-label*="Breadcrumb"] a',
    'nav[aria-label*="breadcrumb"] a',
    'div[aria-label*="Breadcrumb"] a',
    'div[aria-label*="breadcrumb"] a',
    '[aria-label*="Breadcrumb"] [data-tooltip]',
    '[aria-label*="breadcrumb"] [data-tooltip]',
    'nav a[role="link"]'
  ];

  const crumbs = uniqueNonEmpty(candidateSelectors.flatMap(collectBreadcrumbsFromSelector));

  const rootLabels = new Set(['my drive', 'shared with me', 'shared drives', 'computers']);
  while (crumbs.length > 0 && rootLabels.has(crumbs[0].toLowerCase())) {
    crumbs.shift();
  }

  return crumbs;
}

function getSelectedItem() {
  return (
    document.querySelector('[role="row"][aria-selected="true"]') ||
    document.querySelector('[aria-selected="true"][data-id]') ||
    document.querySelector('[aria-selected="true"]')
  );
}

function getSelectedFileName() {
  const selected = getSelectedItem();
  if (!selected) {
    return null;
  }

  const textCandidates = [
    selected.querySelector('[data-tooltip]')?.getAttribute('data-tooltip'),
    selected.querySelector('[data-tooltip]')?.textContent,
    selected.querySelector('[data-target="doc-name"]')?.textContent,
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
  const breadcrumbs = getBreadcrumbs();
  const fileName = getSelectedFileName();

  if (!fileName) {
    return null;
  }

  const pathParts = [...breadcrumbs];
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
