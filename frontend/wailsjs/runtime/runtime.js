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
