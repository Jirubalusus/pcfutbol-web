/**
 * TouchJoystick.jsx — Mobile touch joystick + enter button overlay
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';

export function TouchJoystick({ movementRef }) {
  const joystickRef = useRef(null);
  const knobRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const touchIdRef = useRef(null);
  const originRef = useRef({ x: 0, y: 0 });
  const RADIUS = 50;

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (touchIdRef.current !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    touchIdRef.current = t.identifier;
    originRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchMove = useCallback((e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== touchIdRef.current) continue;

      let dx = t.clientX - originRef.current.x;
      let dy = t.clientY - originRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }

      movementRef.current = {
        x: dx / RADIUS,
        z: dy / RADIUS,
      };

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }
  }, [movementRef]);

  const handleTouchEnd = useCallback((e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        movementRef.current = { x: 0, z: 0 };
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
      }
    }
  }, [movementRef]);

  if (!isMobile) return null;

  return (
    <>
      {/* Joystick area */}
      <div
        ref={joystickRef}
        className="city-joystick"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="city-joystick__base">
          <div ref={knobRef} className="city-joystick__knob" />
        </div>
      </div>

      {/* Enter building button */}
      <div className="city-enter-btn">
        <button
          onTouchStart={() => {
            // Dispatch Enter key event
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
          }}
          onTouchEnd={() => {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
          }}
        >
          ⏎
        </button>
      </div>
    </>
  );
}
