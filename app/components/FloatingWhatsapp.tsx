// components/FloatingWhatsApp.tsx
'use client';

import { useState, useEffect, useRef } from 'react';

const FloatingWhatsApp = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  const phoneNumber = '7069175399';
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  // Initialize position above the help button in vertical stack
  useEffect(() => {
    if (!isInitialized) {
      const iconSize = 64; // WhatsApp icon size
      const helpButtonSize = 56; // Help button size
      const margin = 24; // Margin from bottom and right edges
      const gap = 16; // Gap between buttons
      
      setPosition({
        x: window.innerWidth - iconSize - margin,
        y: window.innerHeight - (iconSize + helpButtonSize + gap + margin)
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Handle window resize to maintain position relative to bottom-right
  useEffect(() => {
    const handleResize = () => {
      if (isInitialized) {
        const iconSize = 64;
        const helpButtonSize = 56;
        const margin = 24;
        const gap = 16;
        
        setPosition({
          x: window.innerWidth - iconSize - margin,
          y: window.innerHeight - (iconSize + helpButtonSize + gap + margin)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInitialized]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Get icon dimensions
      const iconSize = 64;

      // Constrain position within viewport bounds
      const constrainedX = Math.max(0, Math.min(newX, viewportWidth - iconSize));
      const constrainedY = Math.max(0, Math.min(newY, viewportHeight - iconSize));

      setPosition({
        x: constrainedX,
        y: constrainedY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setIsDragging(true);
    e.preventDefault();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    window.open(whatsappUrl, '_blank');
  };

  // Reset to position above help button
  const resetPosition = () => {
    const iconSize = 64;
    const helpButtonSize = 56;
    const margin = 24;
    const gap = 16;
    
    setPosition({
      x: window.innerWidth - iconSize - margin,
      y: window.innerHeight - (iconSize + helpButtonSize + gap + margin)
    });
  };

  return (
    <div
      ref={iconRef}
      className={`fixed z-40 cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
      } hover:scale-105`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="relative">
        {/* WhatsApp Icon */}
        <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-200 border-2 border-white">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="white"
            className="w-6 h-6 md:w-7 md:h-7"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.18-1.24-6.169-3.495-8.418" />
          </svg>
        </div>

        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20 -z-10"></div>

        {/* Drag handle indicator */}
        {isDragging && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
            Drag me around!
          </div>
        )}
      </div>

      {/* Reset button - appears when dragged away from default position */}
      {isInitialized && (position.x < window.innerWidth - 200 || position.y < window.innerHeight - 200) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetPosition();
          }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded-full transition-colors duration-200"
        >
          Reset Position
        </button>
      )}
    </div>
  );
};

export default FloatingWhatsApp;