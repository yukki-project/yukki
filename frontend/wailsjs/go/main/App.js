// @ts-check
// AV-WORKAROUND STUB — see App.d.ts.

// (Greet was removed in UI-001c per D-C11.)

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

// UI-001c
export function RunStory(description, prefix, strictPrefix) {
  return window['go']['uiapp']['App']['RunStory'](description, prefix, strictPrefix);
}

export function AbortRunning() {
  return window['go']['uiapp']['App']['AbortRunning']();
}

export function SuggestedPrefixes() {
  return window['go']['uiapp']['App']['SuggestedPrefixes']();
}

// UI-008
export function UpdateArtifactStatus(path, newStatus) {
  return window['go']['uiapp']['App']['UpdateArtifactStatus'](path, newStatus);
}

export function AllowedTransitions(currentStatus) {
  return window['go']['uiapp']['App']['AllowedTransitions'](currentStatus);
}

export function UpdateArtifactPriority(path, priority) {
  return window['go']['uiapp']['App']['UpdateArtifactPriority'](path, priority);
}
