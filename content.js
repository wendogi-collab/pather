function getBreadcrumbs() {
  const nav = document.querySelector('nav');
  if (!nav) return [];

  const crumbs = nav.querySelectorAll('a');

  return Array.from(crumbs)
    .map(el => el.textContent.trim())
    .filter(Boolean);
}

function getSelectedFileName() {
  const selected = document.querySelector('[aria-selected="true"]');

  if (!selected) return null;

  return selected.getAttribute("aria-label");
}

function buildPath() {
  const crumbs = getBreadcrumbs();
  const file = getSelectedFileName();

  if (!file) return null;

  if (!crumbs.length) return file;

  return [...crumbs, file].join(' / ');
}

function getFileLink() {
  return window.location.href;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_DATA") {

    setTimeout(() => {
      const path = buildPath();
      const link = getFileLink();

      sendResponse({ path, link });
    }, 500);

    return true;
  }
});