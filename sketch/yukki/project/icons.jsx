// icons.jsx — small set of stroke icons used across the UI

const I = ({ d, s = 1.5, w = 16, fill = "none", children }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const Icon = {
  Files:    (p) => <I {...p} d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />,
  Search:   (p) => <I {...p} d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3" />,
  Branch:   (p) => <I {...p}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 8v8M18 11a6 6 0 0 1-6 6H8"/></I>,
  Play:     (p) => <I {...p} fill="currentColor" s={0} d="M7 4l14 8L7 20z" />,
  Pause:    (p) => <I {...p} fill="currentColor" s={0}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></I>,
  Stop:     (p) => <I {...p} fill="currentColor" s={0}><rect x="5" y="5" width="14" height="14" rx="1"/></I>,
  Save:     (p) => <I {...p} d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM7 3v6h10V3M7 21v-7h10v7" />,
  Cmd:      (p) => <I {...p} d="M9 3a3 3 0 1 1 0 6h6a3 3 0 1 1 0-6 3 3 0 0 1 3 3v12a3 3 0 0 1-3 3 3 3 0 0 1-3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3" />,
  Plus:     (p) => <I {...p} d="M12 5v14M5 12h14" />,
  X:        (p) => <I {...p} d="M6 6l12 12M18 6L6 18" />,
  Chev:     (p) => <I {...p} d="M9 18l6-6-6-6" />,
  ChevDown: (p) => <I {...p} d="M6 9l6 6 6-6" />,
  Folder:   (p) => <I {...p} d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  Doc:      (p) => <I {...p} d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 13h6M9 17h6" />,
  Check:    (p) => <I {...p} d="M5 12l4 4 10-10" />,
  Refresh:  (p) => <I {...p} d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
  Settings: (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></I>,
  Terminal: (p) => <I {...p} d="M4 17l6-6-6-6M12 19h8" />,
  Diff:     (p) => <I {...p} d="M9 5L4 10l5 5M15 19l5-5-5-5M14 4l-4 16" />,
  Sync:     (p) => <I {...p} d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7-3.3M3 12a9 9 0 0 1 16-5.7M16 7h5V2M8 17H3v5" />,
  Ext:      (p) => <I {...p} d="M14 3h7v7M10 14L21 3M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />,
  Bug:      (p) => <I {...p} d="M8 7a4 4 0 0 1 8 0v3H8zM5 11h3M16 11h3M5 17h3M16 17h3M12 14v7M8 14v7a4 4 0 0 0 8 0v-7" />,
  Arrow:    (p) => <I {...p} d="M5 12h14M13 6l6 6-6 6" />,
  Edit:     (p) => <I {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  More:     (p) => <I {...p}><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></I>,
  Eye:      (p) => <I {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"><circle cx="12" cy="12" r="3"/></I>,
  Code:     (p) => <I {...p} d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  Brain:    (p) => <I {...p} d="M9 4a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 10v0a3 3 0 0 0 1 5.5V17a3 3 0 0 0 4 3 3 3 0 0 0 3-3V7a3 3 0 0 0-3-3M15 4a3 3 0 0 1 3 3v.5a3 3 0 0 1 2 2.5v0a3 3 0 0 1-1 5.5V17a3 3 0 0 1-4 3 3 3 0 0 1-3-3V7a3 3 0 0 1 3-3" />,
};

// Rabbit logo — geometric, inscribed in a square. Scales via size prop.
function RabbitMark({ size = 28, color = "currentColor", accent }) {
  const a = accent || color;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* left ear */}
      <path d="M9 4 C 7.5 8, 7.5 13, 10 17"
            stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 6 C 9 9, 9 12, 11 15"
            stroke={a} strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      {/* right ear */}
      <path d="M19 4 C 20.5 8, 20.5 13, 18 17"
            stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 6 C 19 9, 19 12, 17 15"
            stroke={a} strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      {/* head — soft rounded square */}
      <path d="M8 18 C 8 13, 10.5 12, 14 12 L 14 12 C 17.5 12, 20 13, 20 18 L 20 23 C 20 26, 18 28, 14 28 C 10 28, 8 26, 8 23 Z"
            fill={color} fillOpacity="0.0" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* eyes */}
      <circle cx="12" cy="20" r="0.9" fill={color} />
      <circle cx="16" cy="20" r="0.9" fill={color} />
      {/* nose */}
      <path d="M14 23 L 14 24" stroke={a} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

window.Icon = Icon;
window.RabbitMark = RabbitMark;
