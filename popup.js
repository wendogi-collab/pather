const statusEl = document.getElementById('status');
const copyPathBtn = document.getElementById('copyPath');
const copyLinkBtn = document.getElementById('copyLink');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b31412' : '#202124';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function requestDriveData(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'GET_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No response from Google Drive page.'));
        return;
      }

      resolve(response);
    });
  });
}

async function copyToClipboard(value, successPrefix) {
  if (!value) {
    setStatus('No file selected. Click a file in Drive first.', true);
    return;
  }

  await navigator.clipboard.writeText(value);
  setStatus(`${successPrefix}: ${value}`);
}

async function handleCopyPath() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus('Could not detect active tab.', true);
      return;
    }

    const data = await requestDriveData(tab.id);
    if (!data.ok || !data.path) {
      setStatus('No selected file detected. Select one file and try again.', true);
      return;
    }

    await copyToClipboard(data.path, 'Path copied');
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

async function handleCopyLink() {
  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus('Could not detect active tab.', true);
      return;
    }

    const data = await requestDriveData(tab.id);
    await copyToClipboard(data.link, 'Link copied');
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

copyPathBtn.addEventListener('click', handleCopyPath);
copyLinkBtn.addEventListener('click', handleCopyLink);
