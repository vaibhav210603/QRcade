chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "input") {
      const { payload } = msg;
      handleInput(payload);
    }
  });
  
  function handleInput(payload) {
    const { type, key, x, y } = payload;
  
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

    if (type === "mousemove") {
      const ev = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: typeof x === 'number' ? Math.round((x + 1) * 0.5 * window.innerWidth) : undefined,
        clientY: typeof y === 'number' ? Math.round((y + 1) * 0.5 * window.innerHeight) : undefined
      });
      document.dispatchEvent(ev);
    }
  }
  