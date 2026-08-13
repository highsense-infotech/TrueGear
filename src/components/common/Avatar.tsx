import React, { useState } from 'react';

interface AvatarProps {
  /** Signed image URL (or null/undefined to show initials). */
  src?: string | null;
  /** Preferred display name for initials (full name, then username). */
  name?: string | null;
  /** Fallback used when `name` is empty. */
  fallback?: string | null;
  /** Pixel size of the square avatar. */
  size?: number;
  className?: string;
}

/** Derive up to two uppercase initials from a display name. */
function getInitials(name?: string | null, fallback?: string | null): string {
  const source = (name && name.trim()) || (fallback && fallback.trim()) || '';
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Circular user avatar. Renders the uploaded image when available (and it
 * loads), otherwise falls back to initials on a neutral background. Used in the
 * header, dropdown, user-management list, and the My Profile page.
 */
const Avatar: React.FC<AvatarProps> = ({ src, name, fallback, size = 40, className = '' }) => {
  const [errored, setErrored] = useState(false);
  const showImage = !!src && !errored;
  const initials = getInitials(name, fallback);
  const fontSize = Math.max(11, Math.round(size * 0.4));

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#faedee] text-[#FE306C] font-semibold select-none ${className}`}
      style={{ width: size, height: size, fontSize }}
      aria-label={(name || fallback || 'User') ?? 'User'}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={(name || fallback || 'User') ?? 'User'}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
