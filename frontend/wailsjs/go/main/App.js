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

// UI-009
export function SelectDirectory() {
  return window['go']['uiapp']['App']['SelectDirectory']();
}

export function OpenProject(path) {
  return window['go']['uiapp']['App']['OpenProject'](path);
}

export function CloseProject(idx) {
  return window['go']['uiapp']['App']['CloseProject'](idx);
}

export function SwitchProject(idx) {
  return window['go']['uiapp']['App']['SwitchProject'](idx);
}

export function ListOpenedProjects() {
  return window['go']['uiapp']['App']['ListOpenedProjects']();
}

export function ReorderProjects(order) {
  return window['go']['uiapp']['App']['ReorderProjects'](order);
}

export function LoadRegistry() {
  return window['go']['uiapp']['App']['LoadRegistry']();
}

export function ListRecentProjects() {
  return window['go']['uiapp']['App']['ListRecentProjects']();
}

export function InitializeYukki(dir) {
  return window['go']['uiapp']['App']['InitializeYukki'](dir);
}

// UI-010
export function WriteArtifact(path, content) {
  return window['go']['uiapp']['App']['WriteArtifact'](path, content);
}

// CORE-007 — draft persistence
export function DraftSave(draft) {
  return window['go']['uiapp']['App']['DraftSave'](draft);
}

export function DraftLoad(id) {
  return window['go']['uiapp']['App']['DraftLoad'](id);
}

export function DraftList() {
  return window['go']['uiapp']['App']['DraftList']();
}

export function DraftDelete(id) {
  return window['go']['uiapp']['App']['DraftDelete'](id);
}

export function StoryValidate(draft) {
  return window['go']['uiapp']['App']['StoryValidate'](draft);
}

// CORE-009 — story export
export function StoryExport(draft, options) {
  return window['go']['uiapp']['App']['StoryExport'](draft, options);
}

// CORE-008 — LLM suggestion streaming
export function SpddSuggestStart(req) {
  return window['go']['uiapp']['App']['SpddSuggestStart'](req);
}

export function SpddSuggestCancel(sessionID) {
  return window['go']['uiapp']['App']['SpddSuggestCancel'](sessionID);
}

export function SpddSuggestPreview(req) {
  return window['go']['uiapp']['App']['SpddSuggestPreview'](req);
}

// UI-015 — PDF export
export function SaveFilePdf(suggestedName) {
  return window['go']['uiapp']['App']['SaveFilePdf'](suggestedName);
}

export function WritePdfFile(path, base64Content) {
  return window['go']['uiapp']['App']['WritePdfFile'](path, base64Content);
}

export function ResolveCanvasChain(canvasPath) {
  return window['go']['uiapp']['App']['ResolveCanvasChain'](canvasPath);
}

// UI-021 — About dialog
export function GetBuildInfo() {
  return window['go']['uiapp']['App']['GetBuildInfo']();
}

// OPS-001 — settings + logging
export function LoadSettings() {
  return window['go']['uiapp']['App']['LoadSettings']();
}

export function SaveSettings(settings) {
  return window['go']['uiapp']['App']['SaveSettings'](settings);
}

export function LogToBackend(payload) {
  return window['go']['uiapp']['App']['LogToBackend'](payload);
}

export function OpenLogsFolder() {
  return window['go']['uiapp']['App']['OpenLogsFolder']();
}

// OPS-001 prompt-update — build-time gating + logs drawer
export function IsDevBuild() {
  return window['go']['uiapp']['App']['IsDevBuild']();
}

export function TailLogs(maxLines) {
  return window['go']['uiapp']['App']['TailLogs'](maxLines);
}

// UI-019 — restructuration IA d'un artefact mal formé
export function RestructureStart(req) {
  return window['go']['uiapp']['App']['RestructureStart'](req);
}

export function RestructureCancel(sessionID) {
  return window['go']['uiapp']['App']['RestructureCancel'](sessionID);
}
