type PepLogWordmarkProps = {
  className?: string;
  label?: string;
};

export function PepLogWordmark({ className, label = "PepLog" }: PepLogWordmarkProps) {
  return (
    <svg
      viewBox="0 0 230 32"
      role="img"
      aria-label={label}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M2 29V3h14.5l5 5v6l-5 5H2M2 3h14.5" />
        <path d="M34 3h21M34 16h17M34 29h21" />
        <path d="M68 29V3h14.5l5 5v6l-5 5H68M68 3h14.5" />
        <path d="M100 3v26h21" />
        <path d="M139 3h11l6 6v14l-6 6h-11l-6-6V9l6-6Z" />
        <path d="M176 3h16l5 5M197 12V8M197 20v3l-6 6h-10l-6-6V9l6-6M187 17h10" />
      </g>
    </svg>
  );
}