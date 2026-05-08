// @ts-check
// AV-WORKAROUND STUB — see runtime.d.ts.
// Wails populates `window.runtime` at startup ; these wrappers delegate
// the call directly. Pattern identical to wailsjs/go/main/App.js.

export function WindowMinimise() {
  return window['runtime']['WindowMinimise']();
}

export function WindowToggleMaximise() {
  return window['runtime']['WindowToggleMaximise']();
}

export function Quit() {
  return window['runtime']['Quit']();
}

// UI-021 — see runtime.d.ts.
export function BrowserOpenURL(url) {
  return window['runtime']['BrowserOpenURL'](url);
}

export function ClipboardSetText(text) {
  return window['runtime']['ClipboardSetText'](text);
}
