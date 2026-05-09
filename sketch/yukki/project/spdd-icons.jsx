/* global React */
// Icon set — minimal lucide-inspired strokes. All sized via .yk-icon class.

const Icon = ({ name, className = '', size }) => {
  const cls = `yk-icon ${className}`;
  const style = size ? { width: size, height: size } : undefined;
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg className={cls} style={style} viewBox="0 0 24 24" aria-hidden="true">
      {paths}
    </svg>
  );
};

const ICONS = {
  // app rail
  inbox:    <><path d="M3 13h4l2 3h6l2-3h4"/><path d="M5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6Z"/></>,
  book:     <><path d="M5 4a2 2 0 0 1 2-2h12v18H7a2 2 0 0 0-2 2V4Z"/><path d="M5 20a2 2 0 0 0 2 2h12"/></>,
  layers:   <><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></>,
  bulb:     <><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5v.5h6V16c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z"/></>,
  doc:      <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></>,
  check:    <><polyline points="3 13 9 19 21 7"/></>,
  map:      <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/></>,
  workflow: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M14 7h3a2 2 0 0 1 2 2v2"/><path d="M10 17H7a2 2 0 0 1-2-2v-2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77"/></>,

  // file/window
  rabbit:   <><path d="M9 20a4 4 0 1 1 6 0"/><path d="M9 5c0-2 1-3 1-3s2 1 2 4-1 4-1 4"/><path d="M15 5c0-2-1-3-1-3s-2 1-2 4 1 4 1 4"/><path d="M5 14a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4"/><circle cx="9" cy="14" r=".5" fill="currentColor"/><circle cx="15" cy="14" r=".5" fill="currentColor"/></>,
  close:    <><path d="m6 6 12 12M18 6 6 18"/></>,
  min:      <><path d="M5 12h14"/></>,
  max:      <><rect x="5" y="5" width="14" height="14" rx="1"/></>,
  plus:     <><path d="M12 5v14M5 12h14"/></>,
  archive:  <><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></>,

  // header
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  edit:     <><path d="M14 4 20 10"/><path d="M4 20h6L20 10l-6-6L4 14Z"/></>,
  code:     <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  eye:      <><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  more:     <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,

  // section
  sparkle:  <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  star:     <><polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9"/></>,
  refresh:  <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  chevron_up:   <><polyline points="6 15 12 9 18 15"/></>,
  chevron_down: <><polyline points="6 9 12 15 18 9"/></>,
  trash:    <><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M5 6v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6"/></>,
  warn:     <><path d="M12 3 2 21h20Z"/><path d="M12 9v5"/><path d="M12 18h.01"/></>,
  info:     <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></>,
  help:     <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.5 2.6c-.8.5-1.5 1-1.5 2.4"/><path d="M12 17h.01"/></>,
  bolt:     <><polygon points="13 2 4 14 11 14 11 22 20 10 13 10"/></>,
  drag:     <><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>,
  search:   <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  copy:     <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  arrow_right: <><path d="M5 12h14"/><polyline points="13 6 19 12 13 18"/></>,
};

window.Icon = Icon;
