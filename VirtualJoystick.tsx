import React, { useEffect, useRef, useState } from 'react';
import { Vector2 } from '../types';

interface JoystickProps {
  onMove: (vector: Vector2) => void;
  size?: number;
}

const VirtualJoystick: React.FC<JoystickProps> = ({ onMove, size = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState<Vector2>({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);

  const radius = size / 2;

  const handleStart = (clientX: number, clientY: number, id: number) => {
    setActive(true);
    touchId.current = id;
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active || !containerRef.current) return;
    updatePosition(clientX, clientY);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
    touchId.current = null;
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize if outside radius
    let clampedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);
    
    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;

    setPosition({ x, y });
    
    // Normalized output (-1 to 1)
    onMove({ 
      x: x / radius, 
      y: y / radius 
    });
  };

  // Touch handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    };

    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                break;
            }
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
         e.preventDefault();
         for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId.current) {
                handleEnd();
                break;
            }
        }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-full border-2 transition-opacity duration-200 ${active ? 'opacity-80 border-cyan-400 bg-cyan-900/30' : 'opacity-40 border-slate-500 bg-slate-900/30'}`}
      style={{ width: size, height: size }}
    >
      <div 
        ref={knobRef}
        className={`absolute rounded-full shadow-lg shadow-cyan-500/50 ${active ? 'bg-cyan-400' : 'bg-slate-400'}`}
        style={{ 
          width: size / 2.5, 
          height: size / 2.5,
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
        }}
      />
    </div>
  );
};

export default VirtualJoystick;