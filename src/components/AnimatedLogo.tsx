import React from 'react';
import { motion } from 'motion/react';

interface AnimatedLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-13 h-13' : 'w-10 h-10';

  return (
    <motion.div
      className={`relative flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Hexagon structure representing order/IQ */}
        <motion.path
          d="M50 5 L93.3 30 V70 L50 95 L6.7 70 V30 L50 5 Z"
          stroke="var(--accent, #6366F1)"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        />
        {/* Inner nodes representing reasoning connections */}
        {[0, 120, 240].map((angle, i) => (
          <motion.circle
            key={i}
            cx={50 + 20 * Math.cos((angle * Math.PI) / 180)}
            cy={50 + 20 * Math.sin((angle * Math.PI) / 180)}
            r="6"
            fill="var(--accent, #6366F1)"
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        {/* Core connection lines */}
        <motion.path
          d="M50 30 L50 70 M32 40 L68 60 M32 60 L68 40"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[var(--text-faint)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2 }}
        />
      </svg>
    </motion.div>
  );
};
