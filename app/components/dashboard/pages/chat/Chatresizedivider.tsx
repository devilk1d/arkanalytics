'use client';

import { useCallback, useRef } from 'react';

interface ChatResizeDividerProps {
  onDrag: (dx: number) => void;
}

export default function ChatResizeDivider({ onDrag }: ChatResizeDividerProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onDrag(dx);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative w-1 shrink-0 cursor-col-resize bg-gray-100 hover:bg-blue-200 transition-colors duration-150"
      style={{ zIndex: 10 }}
    >
      {/* Invisible wider hit area */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      {/* Visual dots indicator */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-1 h-1 rounded-full bg-blue-400" />
        <div className="w-1 h-1 rounded-full bg-blue-400" />
        <div className="w-1 h-1 rounded-full bg-blue-400" />
      </div>
    </div>
  );
}