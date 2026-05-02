// AV-WORKAROUND STUB — minimal Wails runtime types used by the frontend.
// Wails normally generates this file via `wails generate module`, but the
// helper Wails binary in %TEMP% gets quarantined by corporate Defender
// during binding generation (cf. TICKET IT in TODO.md). The stub here
// only exposes what UI-007 consumes (TitleBar buttons). Wails overwrites
// this file cleanly once the AV exclusion is in place.

export function WindowMinimise(): void;
export function WindowToggleMaximise(): void;
export function Quit(): void;
