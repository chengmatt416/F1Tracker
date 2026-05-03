import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, HTMLMotionProps } from 'motion/react';
import { cn } from '../lib/utils';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  tiltAmount?: number;
}

export function GlassCard({ children, className, tiltAmount = 10, ...props }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`]);
  
  // Spring for interactive scale/stretch
  const stretchX = useSpring(1, { stiffness: 400, damping: 20 });
  const stretchY = useSpring(1, { stiffness: 400, damping: 20 });
  const scale = useSpring(1, { stiffness: 400, damping: 30 });

  const updateCoordinates = (clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCoordinates(e.clientX, e.clientY);
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
    stretchX.set(1);
    stretchY.set(1);
  };
  
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    updateCoordinates(e.clientX, e.clientY);
    
    // Squeeze slightly based on axis of pressure (simulate jelly)
    scale.set(0.95);
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = Math.abs((e.clientX - rect.left) / rect.width - 0.5);
    const yPct = Math.abs((e.clientY - rect.top) / rect.height - 0.5);
    
    stretchX.set(1 + xPct * 0.1);
    stretchY.set(1 + yPct * 0.1);
  };
  
  const handlePointerUp = () => {
    scale.set(1.02);
    // Reverse stretch for "snap back" bounce
    stretchX.set(0.95);
    stretchY.set(0.95);
    
    setTimeout(() => {
      scale.set(1);
      stretchX.set(1);
      stretchY.set(1);
    }, 150);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        rotateX,
        rotateY,
        scale,
        scaleX: stretchX,
        scaleY: stretchY,
        transformPerspective: 1000,
      }}
      className={cn("ios-glass will-change-transform cursor-pointer", className)}
      {...props}
    >
      {/* Container to prevent children from being distorted by the squeeze stretch */}
      <div className="w-full h-full pointer-events-none">
        <div className="w-full h-full pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
