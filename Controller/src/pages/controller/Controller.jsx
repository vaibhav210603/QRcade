import React, { useRef, useState, useEffect } from "react";
import Joystick from "../../components/Joystick";
import Button from "../../components/Button";
import { io } from "socket.io-client";

const socket = io("https://qrcade.api.vibhaupadhyay.com"); // socket connection to backend

//it takes the session id from the url and joins the session
const sessionId = new URLSearchParams(window.location.search).get("sessionId");
//now append session id in the messages sent tot he server, where messages are input keys pressed on the forntend

const Controller = () => {
  const lastEventRef = useRef("none");
  const lastSentPressRef = useRef(null);
  const [showRoleSelect, setShowRoleSelect] = useState(true);
  const [player, setPlayer] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Socket connection status handling
  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  // Map UI keys to keyboard event keys
  const mapKey = (keyName) => {
    const mapping = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
      triangle: 'w',
      square: 'a',
      circle: 'd',
      cross: 's'
    };
    return mapping[keyName] || keyName;
  };

  const sendToServer = (keyName, action) => {
    if (!sessionId || !player) return;

    const type = action === 'down' ? 'keydown' : action === 'up' ? 'keyup' : undefined;
    if (!type) return;

    const payload = {
      sessionId,
      type,
      key: mapKey(keyName)
    };

    console.log('Sending input:', payload);
    socket.emit('input', payload);
  };

  const handlePress = (key) => (state) => {
    const signature = `${key}:${state}`;
    lastEventRef.current = signature;

    // Dedupe accidental repeats (e.g., overlapping event streams)
    if (lastSentPressRef.current === signature) return;
    lastSentPressRef.current = signature;

    console.log(key, state);
    sendToServer(key, state);
  };

  const handleJoystickChange = (joystickType) => (values) => {
    lastEventRef.current = `${joystickType}:${values.x.toFixed(2)},${values.y.toFixed(2)}`;
    if (!sessionId || !player) return;
    const payload = {
      sessionId,
      type: 'mousemove',
      x: values.x,
      y: values.y
    };
    socket.emit('input', payload);
  };

  const handleConnect = () => {
    if (sessionId && player) {
      const assigned = player === 'P1' ? 'p1' : 'p2';
      socket.emit('join', { sessionId, role: 'controller', player: assigned });
      console.log(`Joining session: ${sessionId} as ${assigned}`);
    }
  };


  return (
    <div className="w-screen h-screen overflow-hidden bg-neutral-900 text-white flex flex-col touch-none">
      {showRoleSelect && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-800 border border-neutral-700 p-5 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-center">Select Player</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                className={`px-4 py-3 rounded-md border transition-colors ${
                  player === 'P1'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : 'bg-neutral-900 border-neutral-600 hover:border-neutral-500'
                }`}
                onClick={() => setPlayer('P1')}
              >
                Player 1
              </button>
              <button
                className={`px-4 py-3 rounded-md border transition-colors ${
                  player === 'P2'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : 'bg-neutral-900 border-neutral-600 hover:border-neutral-500'
                }`}
                onClick={() => setPlayer('P2')}
              >
                Player 2
              </button>
            </div>
            <button
              className={`w-full px-4 py-3 rounded-md font-medium transition-colors ${
                player
                  ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'
                  : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              }`}
              onClick={() => {
                if (!player) return;
                setShowRoleSelect(false);
              }}
              disabled={!player}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="p-4 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          <Button
            label="Connect"
            className="px-3 py-3 rounded-md bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white"
            onPress={handleConnect}
          />
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-[1fr_auto]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-5 place-items-center">
          {/* Left side: D-pad and Left Joystick */}
          <div className="flex items-center justify-center gap-6 w-full max-w-md">
            <div className="grid grid-cols-3 gap-3 w-44 shrink-0">
              <div />
              <Button label="▲" className="rounded-xl bg-neutral-700 px-5 py-4" onPress={handlePress("up")} />
              <div />
              <Button label="◀" className="rounded-xl bg-neutral-700 px-5 py-4" onPress={handlePress("left")} />
              <div className="rounded-2xl bg-neutral-800 px-5 py-4 text-center">●</div>
              <Button label="▶" className="rounded-xl bg-neutral-700 px-5 py-4" onPress={handlePress("right")} />
              <div />
              <Button label="▼" className="rounded-xl bg-neutral-700 px-5 py-4" onPress={handlePress("down")} />
              <div />
            </div>

            <Joystick label="L" onChange={handleJoystickChange("L")} />
          </div>

          {/* Right side: PlayStation shapes and Right Joystick */}
          <div className="flex items-center justify-center gap-6 w-full max-w-md">
            <Joystick label="R" onChange={handleJoystickChange("R")} />

            <div className="grid grid-cols-3 gap-3 w-44 shrink-0">
              <div />
              <Button label="△" className="rounded-xl bg-neutral-800 px-2 py-2 text-green-400" onPress={handlePress("triangle")} />
              <div />
              <Button label="◻" className="rounded-xl bg-neutral-800 px-5 py-4 text-sky-400" onPress={handlePress("square")} />
              <div className="rounded-2xl bg-neutral-800 px-5 py-4 text-center">●</div>
              <Button label="◯" className="rounded-xl bg-neutral-800 px-5 py-4 text-rose-400" onPress={handlePress("circle")} />
              <div />
              <Button label="✕" className="rounded-xl bg-neutral-800 px-5 py-4 text-purple-400" onPress={handlePress("cross")} />
              <div />
            </div>
          </div>
        </div>

       
      </div>

      
    </div>
  );
};

export default Controller;


