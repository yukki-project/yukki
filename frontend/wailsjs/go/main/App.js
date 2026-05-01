// @ts-check
// AV-WORKAROUND STUB — see App.d.ts.

export function Greet() {
  return window['go']['uiapp']['App']['Greet']();
}

export function SelectProject() {
  return window['go']['uiapp']['App']['SelectProject']();
}

export function AllowedKinds() {
  return window['go']['uiapp']['App']['AllowedKinds']();
}

export function ListArtifacts(kind) {
  return window['go']['uiapp']['App']['ListArtifacts'](kind);
}

export function GetClaudeStatus() {
  return window['go']['uiapp']['App']['GetClaudeStatus']();
}

export function InitializeSPDD(dir) {
  return window['go']['uiapp']['App']['InitializeSPDD'](dir);
}

export function ReadArtifact(path) {
  return window['go']['uiapp']['App']['ReadArtifact'](path);
}
