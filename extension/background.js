// background.js - Fixed for Manifest V3
// Remove importScripts - use fetch API instead

let sessionId = null;
let isConnected = false;

// Create a session with relay
async function createSession() {
  try {
    const res = await fetch("https://your-relay-server/createSession", {
      method: "POST"
    });
    const data = await res.json();
    sessionId = data.sessionId;

    // Start polling for messages instead of WebSocket
    startMessagePolling(sessionId);

    return data; // { sessionId, controllerUrl }
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
}

// Poll for messages instead of WebSocket (since importScripts doesn't work)
let pollingInterval = null;

async function startMessagePolling(sessionId) {
  if (pollingInterval) clearInterval(pollingInterval);
  
  isConnected = true;
  
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`https://your-relay-server/poll/${sessionId}`, {
        method: "GET"
      });
      
      if (response.ok) {
        const messages = await response.json();
        
        messages.forEach(payload => {
          // Forward input event to all content scripts in active tab
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: "input",
                payload
              });
            }
          });
        });
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, 100); // Poll every 100ms
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isConnected = false;
}

// Listen to popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "createSession") {
    createSession()
      .then((data) => sendResponse(data))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // async response
  }
  
  if (msg.type === "getStatus") {
    sendResponse({ 
      isConnected, 
      sessionId 
    });
    return true;
  }
  
  if (msg.type === "disconnect") {
    stopPolling();
    sessionId = null;
    sendResponse({ success: true });
    return true;
  }
});

// Clean up when extension is disabled/reloaded
chrome.runtime.onSuspend.addListener(() => {
  stopPolling();
});