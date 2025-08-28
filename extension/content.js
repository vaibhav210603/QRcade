chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "input") {
      const { payload } = msg;
      handleInput(payload);
    }
  });
  
  function handleInput(payload) {
    const { type, key, from } = payload;
  
    if (type === "keydown" || type === "keyup") {
      const ev = new KeyboardEvent(type, {
        key,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(ev);
    }
  
    if (type === "mousedown" || type === "mouseup") {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true });
      document.dispatchEvent(ev);
    }
  }
  