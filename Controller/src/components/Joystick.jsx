import React from "react";
import { useRef,useState } from "react";

const Joystick = ({ onChange, label = "L" }) => {
    const baseRef = useRef(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const baseSize = 160; // px (tailwind h-40 => 10rem => 160px)
    const thumbSize = 80; // px (tailwind h-20 => 5rem => 80px)
    const radius = (baseSize - thumbSize) / 2; // 40px travel

    const start = (clientX, clientY) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const move = (mx, my) => {
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.min(Math.hypot(dx, dy), radius);
        const angle = Math.atan2(dy, dx);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        setPos({ x, y });
        const nx = x / radius;
        const ny = y / radius;
        onChange?.({ x: nx, y: ny });
      };

      const onMouseMove = (e) => move(e.clientX, e.clientY);
      const onTouchMove = (e) => {
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
      };
      const end = () => {
        setPos({ x: 0, y: 0 });
        onChange?.({ x: 0, y: 0 });
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", end);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", end);
      };
      window.addEventListener("mousemove", onMouseMove, { passive: false });
      window.addEventListener("mouseup", end, { passive: false });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", end, { passive: false });
    };

    return (
      <div className="flex flex-col items-center gap-2 select-none">
        <div
          ref={baseRef}
          className="relative h-40 w-40 rounded-full bg-neutral-800/80 border border-neutral-700 shadow-inner touch-none"
          onMouseDown={(e) => start(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) start(t.clientX, t.clientY);
          }}
        >
          <div
            className="absolute h-20 w-20 rounded-full bg-neutral-600 shadow-md border border-neutral-500"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            }}
          />
        </div>
        <span className="text-xs uppercase text-neutral-400 tracking-widest">{label}</span>
      </div>
    );
  };


  export default Joystick;