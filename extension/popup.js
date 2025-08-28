// popup.js - Enhanced with the UI elements from your HTML
let currentSessionId = null;
let connectionStatus = 'disconnected';

// DOM elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const statusDescription = document.getElementById('statusDescription');
const qrContainer = document.getElementById('qrContainer');
const qrDiv = document.getElementById('qr');
const createButton = document.getElementById('createButton');
const connectionInfo = document.getElementById('connectionInfo');
const sessionIdDisplay = document.getElementById('sessionId');
const connectionStatusDisplay = document.getElementById('connectionStatus');
const deviceCountDisplay = document.getElementById('deviceCount');

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  checkCurrentStatus();
});

// Check current connection status
function checkCurrentStatus() {
  chrome.runtime.sendMessage({ type: "getStatus" }, (response) => {
    if (response && response.sessionId) {
      currentSessionId = response.sessionId;
      connectionStatus = response.isConnected ? 'connected' : 'connecting';
      updateUI();
      if (response.isConnected) {
        generateQRCode();
      }
    }
  });
}

// Create session button handler
createButton.addEventListener("click", () => {
  if (connectionStatus === 'disconnected') {
    createSession();
  } else if (connectionStatus === 'connected') {
    disconnectSession();
  }
});

// Add ripple effect to button
createButton.addEventListener('click', function(e) {
  const ripple = document.createElement('span');
  const rect = this.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  this.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
  }, 600);
});

function createSession() {
  setConnectionStatus('connecting');
  
  chrome.runtime.sendMessage({ type: "createSession" }, (response) => {
    if (response && response.error) {
      console.error("Failed to create session:", response.error);
      setConnectionStatus('disconnected');
      statusDescription.textContent = "Failed to connect. Please try again.";
      return;
    }
    
    if (response && response.sessionId) {
      console.log("Session created:", response);
      currentSessionId = response.sessionId;
      setConnectionStatus('connected');
      
      // Generate QR code
      generateQRCode(response.controllerUrl);
      
      // Update session info
      sessionIdDisplay.textContent = response.sessionId.substring(0, 8) + '...';
      connectionStatusDisplay.textContent = 'Active';
    }
  });
}

function disconnectSession() {
  chrome.runtime.sendMessage({ type: "disconnect" }, () => {
    currentSessionId = null;
    setConnectionStatus('disconnected');
    hideQRCode();
    hideConnectionInfo();
  });
}

function generateQRCode(controllerUrl = null) {
  if (!controllerUrl && currentSessionId) {
    controllerUrl = `https://your-relay-server/controller/${currentSessionId}`;
  }
  
  if (controllerUrl) {
    qrDiv.innerHTML = "";
    const img = document.createElement("img");
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(controllerUrl)}`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.display = "block";
    
    img.onload = () => {
      showQRCode();
    };
    
    img.onerror = () => {
      qrDiv.textContent = "Failed to generate QR code";
    };
    
    qrDiv.appendChild(img);
  }
}

function setConnectionStatus(status) {
  connectionStatus = status;
  updateUI();
}

function updateUI() {
  // Update status indicator and text
  statusIndicator.className = 'status-indicator';
  
  switch (connectionStatus) {
    case 'disconnected':
      statusIndicator.classList.add('status-disconnected');
      statusText.textContent = 'Ready to Connect';
      statusDescription.textContent = 'Click the button below to create a new session';
      createButton.className = 'button';
      createButton.querySelector('.button-text').textContent = 'Create Session';
      hideQRCode();
      hideConnectionInfo();
      break;
      
    case 'connecting':
      statusIndicator.classList.add('status-connecting');
      statusText.textContent = 'Connecting...';
      statusDescription.textContent = 'Setting up your remote session';
      createButton.className = 'button connecting';
      createButton.querySelector('.button-text').textContent = 'Connecting...';
      break;
      
    case 'connected':
      statusIndicator.classList.add('status-connected');
      statusText.textContent = 'Session Active';
      statusDescription.textContent = 'Scan the QR code with your mobile device';
      createButton.className = 'button connected';
      createButton.querySelector('.button-text').textContent = 'Disconnect';
      showConnectionInfo();
      break;
  }
}

function showQRCode() {
  qrContainer.classList.add('show');
}

function hideQRCode() {
  qrContainer.classList.remove('show');
}

function showConnectionInfo() {
  connectionInfo.classList.add('show');
}

function hideConnectionInfo() {
  connectionInfo.classList.remove('show');
}

// Update device count periodically when connected
setInterval(() => {
  if (connectionStatus === 'connected') {
    // You could poll for connected device count here
    // For now, just show a placeholder
    deviceCountDisplay.textContent = '1'; // Placeholder
  }
}, 5000);