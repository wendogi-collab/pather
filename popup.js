async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  async function copyToClipboard(text, message) {
    if (!text) {
      document.getElementById("status").innerText =
        "No file selected or data not found";
      return;
    }
  
    await navigator.clipboard.writeText(text);
    document.getElementById("status").innerText = message + ": " + text;
  }
  chrome.tabs.sendMessage(tab.id, { action: "GET_DATA" }, (res) => {
    if (chrome.runtime.lastError) {
      document.getElementById("status").innerText =
        "Error: " + chrome.runtime.lastError.message;
      return;
    }
  
    if (!res) {
      document.getElementById("status").innerText =
        "No response from page (content script not running)";
      return;
    }
  
    copyToClipboard(res.path, "Path copied");
  });