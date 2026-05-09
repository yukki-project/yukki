// OPS-001 prompt-update O16 — frontend mirror of the Go IsDevBuild
// const. Hydrated once at App.tsx mount via the Wails binding
// `IsDevBuild()`; cached afterwards. Default false (fail-safe: hide
// developer surfaces if the binding has not yet resolved).
//
// Used by DeveloperMenu (O17), TitleBar badge (O13 — hidden in
// prod), and LogsDrawer (O19 — render null in prod).

import { IsDevBuild as IsDevBuildBinding } from '../../wailsjs/go/main/App';

let cached: boolean | null = null;

/** Returns the cached IsDevBuild flag. False until hydrate resolves. */
export function isDevBuild(): boolean {
  return cached ?? false;
}

/** Test/SSR escape hatch — sets the cached value directly. */
export function setDevBuildFlag(v: boolean): void {
  cached = v;
}

/**
 * Hydrates the flag from the Wails binding. Idempotent — a second
 * call short-circuits. Catches binding errors and leaves the flag
 * at its safe default (false).
 */
export async function hydrateBuildFlags(): Promise<void> {
  if (cached !== null) return;
  try {
    const v = await IsDevBuildBinding();
    cached = !!v;
  } catch {
    cached = false;
  }
}
