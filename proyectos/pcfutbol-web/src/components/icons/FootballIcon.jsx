/**
 * Professional football/soccer ball icon — classic design with filled pentagons.
 * Drop-in replacement for Lucide icons (same props API).
 */
export default function FootballIcon({ size = 24, className = '', style = {}, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      {...props}
    >
      {/* Ball body */}
      <circle cx="12" cy="12" r="10.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.2" />
      {/* Center pentagon (black patch) */}
      <polygon points="12,6.8 15.2,9 14,12.8 10,12.8 8.8,9" fill="currentColor" opacity="0.85" />
      {/* Top pentagon */}
      <polygon points="12,2.2 14,3.8 13,5.8 11,5.8 10,3.8" fill="currentColor" opacity="0.6" />
      {/* Top-right pentagon */}
      <polygon points="18.5,5.5 19.5,7.8 17.8,9 16,8 16.2,5.8" fill="currentColor" opacity="0.6" />
      {/* Bottom-right pentagon */}
      <polygon points="20,13 19.2,15.5 17,16.2 15.5,14.5 16.8,12.2" fill="currentColor" opacity="0.6" />
      {/* Bottom-left pentagon */}
      <polygon points="4,13 4.8,15.5 7,16.2 8.5,14.5 7.2,12.2" fill="currentColor" opacity="0.6" />
      {/* Top-left pentagon */}
      <polygon points="5.5,5.5 4.5,7.8 6.2,9 8,8 7.8,5.8" fill="currentColor" opacity="0.6" />
      {/* Bottom pentagon */}
      <polygon points="12,21.8 10,20.2 11,18.2 13,18.2 14,20.2" fill="currentColor" opacity="0.6" />
      {/* Seam lines */}
      <line x1="12" y1="6.8" x2="12" y2="2.2" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="15.2" y1="9" x2="19.5" y2="7.8" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="14" y1="12.8" x2="17" y2="16.2" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="10" y1="12.8" x2="7" y2="16.2" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="8.8" y1="9" x2="4.5" y2="7.8" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="13" y1="18.2" x2="14" y2="20.2" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <line x1="11" y1="18.2" x2="10" y2="20.2" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
    </svg>
  );
}
