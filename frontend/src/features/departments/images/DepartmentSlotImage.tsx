import React, { memo } from 'react';

export type DepartmentSlotImageProps = {
  /**
   * Exactly one slot image url (or empty string when the slot is intentionally empty).
   */
  src: string;
};

function DepartmentSlotImageImpl({ src }: DepartmentSlotImageProps) {
  const maskStyle: React.CSSProperties = {
    maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
  };

  return (
    <div className="absolute inset-0 z-0" style={maskStyle}>
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
      ) : null}
    </div>
  );
}

export const DepartmentSlotImage = memo(DepartmentSlotImageImpl);

