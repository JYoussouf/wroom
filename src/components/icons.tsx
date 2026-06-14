/** Minimal, consistent stroke icon set. No third-party platform iconography. */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconBack = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconRoom = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconHome = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
);
export const IconPlus = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconReply = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);
export const IconRepost = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
export const IconHeart = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.3 5 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5c3.3 0 5 3.4 3.6 6.7C19.5 16.4 12 21 12 21z" />
  </svg>
);
export const IconHeartFill = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.3 5 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5c3.3 0 5 3.4 3.6 6.7C19.5 16.4 12 21 12 21z" />
  </svg>
);
export const IconSettings = ({ size = 24, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </svg>
);
export const IconLock = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="10.5" width="16" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
);
export const IconGlobe = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3C9.5 5.5 9.5 18.5 12 21" />
  </svg>
);
export const IconSearch = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconSwitch = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 9l6-6 6 6M6 15l6 6 6-6" />
  </svg>
);
export const IconChevronDown = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const IconClose = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconThread = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="5" r="2.4" />
    <circle cx="12" cy="19" r="2.4" />
    <path d="M12 7.4v9.2" />
  </svg>
);
export const IconExport = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);
export const IconImport = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 15V3" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);
export const IconTrash = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
  </svg>
);
export const IconSpark = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1z" fill="currentColor" stroke="none" />
  </svg>
);
