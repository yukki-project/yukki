// AV-WORKAROUND STUB — minimal Wails runtime types used by the frontend.
// Wails normally generates this file via `wails generate module`, but the
// helper Wails binary in %TEMP% gets quarantined by corporate Defender
// during binding generation (cf. TICKET IT in TODO.md). The stub here
// only exposes what UI-007 consumes (TitleBar buttons). Wails overwrites
// this file cleanly once the AV exclusion is in place.

export function WindowMinimise(): void;
export function WindowToggleMaximise(): void;
export function Quit(): void;

// UI-021 — Built-in Wails runtime functions exposed for the
// AboutDialog. Wails injects them into `window.runtime` at startup ;
// les ajouts ci-dessous sont alignés sur la signature officielle
// Wails v2 et seront cohérents avec une régénération future du
// stub (une fois l'exclusion AV obtenue).
export function BrowserOpenURL(url: string): void;
export function ClipboardSetText(text: string): Promise<boolean>;
