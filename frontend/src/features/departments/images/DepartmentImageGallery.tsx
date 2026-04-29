import React, { memo } from 'react';

export type DepartmentImageGalleryProps = {
  /**
   * Exactly 5 entries expected.
   * Empty string entries are treated as missing and render as empty tiles (no broken images).
   */
  images: string[];
};

function DepartmentImageGalleryImpl({ images }: DepartmentImageGalleryProps) {
  const safe = images.slice(0, 5);
  while (safe.length < 5) safe.push('');

  const maskStyle: React.CSSProperties = {
    maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
  };

  return (
    <div className="absolute inset-0 z-0" style={maskStyle}>
      <div className="w-full h-full grid grid-cols-2 grid-rows-3 gap-0">
        {safe.map((src, idx) => {
          const isLast = idx === 4;
          const tileClass = isLast ? 'col-span-2 row-span-1' : '';
          return (
            <div key={idx} className={`w-full h-full ${tileClass}`}>
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
        })}
      </div>
    </div>
  );
}

export const DepartmentImageGallery = memo(DepartmentImageGalleryImpl);

