import React from 'react';

type AuroraTextProps = {
  children: React.ReactNode;
  colors?: string[];
  className?: string;
};

const DEFAULT_COLORS = ['#0070F3', '#38bdf8', '#7928CA', '#FF0080'];

export function AuroraText({ children, colors = DEFAULT_COLORS, className = '' }: AuroraTextProps) {
  const gradient = `linear-gradient(120deg, ${colors.join(', ')})`;

  return (
    <span
      className={className}
      style={{
        backgroundImage: gradient,
        backgroundSize: '220% 220%',
        backgroundPosition: '0% 50%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        animation: 'aurora-shift 5.5s ease-in-out infinite',
      }}
    >
      {children}
    </span>
  );
}
