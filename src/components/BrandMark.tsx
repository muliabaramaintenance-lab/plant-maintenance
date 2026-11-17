import React from 'react';

interface BrandMarkProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'dark',
  className = 'h-7 w-auto',
}) => {
  const primaryColor = variant === 'dark' ? '#82c341' : '#19325d';
  const secondaryColor = variant === 'dark' ? '#ffffff' : '#82c341';

  return (
    <svg
      viewBox="0 0 120 74"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      <path d="M2 54 L43 3 L43 42 L15 71 L2 71 Z" fill={primaryColor} />
      <path
        d="M50 3 L67 3 C71 3 73 6 73 10 L73 27 L104 3 L117 3 L117 21 L69 71 L50 71 Z"
        fill={primaryColor}
      />
      <path
        d="M117 33 L117 61 C117 67 112 71 106 71 L80 71 Z"
        fill={secondaryColor}
      />
    </svg>
  );
};
