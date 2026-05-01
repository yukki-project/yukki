// @ts-check
// AV-WORKAROUND STUB — see App.d.ts.

export function Greet() {
  return window['go']['main']['App']['Greet']();
}

export function SelectProject() {
  return window['go']['main']['App']['SelectProject']();
}

export function AllowedKinds() {
  return window['go']['main']['App']['AllowedKinds']();
}

export function ListArtifacts(kind) {
  return window['go']['main']['App']['ListArtifacts'](kind);
}

export function GetClaudeStatus() {
  return window['go']['main']['App']['GetClaudeStatus']();
}

export function InitializeSPDD(dir) {
  return window['go']['main']['App']['InitializeSPDD'](dir);
}

export function ReadArtifact(path) {
  return window['go']['main']['App']['ReadArtifact'](path);
}
