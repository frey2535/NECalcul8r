import React from "react";

export default function ResizableTh({ width, onResizeStart, children, className }) {
  return (
    <th style={{ width }} className={`relative ${className || ""}`}>
      {children}
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-10"
      />
    </th>
  );
}