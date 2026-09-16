type PepLogWordmarkProps = {
  className?: string;
  label?: string;
};

export function PepLogWordmark({ className, label = "PepLog" }: PepLogWordmarkProps) {
  return (
    <svg
      viewBox="0 0 154 32"
      role="img"
      aria-label={label}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text x="0" y="27" fill="currentColor" fontFamily="Outfit, sans-serif" fontSize="30" fontWeight="300">P</text>
      <g stroke="currentColor" strokeWidth="1.5">
        <path d="M28 6.5H46" />
        <path d="M28 16H44" />
        <path d="M28 25.5H46" />
      </g>
      <text x="54" y="27" fill="currentColor" fontFamily="Outfit, sans-serif" fontSize="30" fontWeight="300">P</text>
      <text x="80" y="27" fill="currentColor" fontFamily="Outfit, sans-serif" fontSize="30" fontWeight="300" letterSpacing="2.5">LOG</text>
    </svg>
  );
}