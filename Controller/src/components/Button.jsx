import React from "react";

const Button = ({ label, className = "", onPress }) => (
    <button
      className={`active:scale-95 transition-transform select-none ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress?.("down");
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPress?.("up");
      }}
      onPointerCancel={(e) => {
        e.preventDefault();
        onPress?.("up");
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  export default Button;