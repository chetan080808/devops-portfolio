import { setConsoleFunction } from "three";

/**
 * Route three's console output, dropping one known-harmless message we can't fix at the source:
 * R3F 9 (latest stable) creates a THREE.Clock in its store, which three r183+ flags as deprecated.
 * Everything else passes through unchanged.
 */
const IGNORED = ["THREE.Clock: This module has been deprecated"];

let installed = false;

export function installThreeConsoleFilter() {
  if (installed) return;
  installed = true;
  setConsoleFunction((type: string, message: string, ...params: unknown[]) => {
    if (IGNORED.some((m) => message.startsWith(m))) return;
    const log = type === "error" ? console.error : type === "warn" ? console.warn : console.log;
    log(message, ...params);
  });
}
