/**
 * Maintainer utility
 * Reads the maintainer name from the NAME file at the project root
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedMaintainer: string | null = null;

/**
 * Get the maintainer name
 * @returns The maintainer string, or "unknown" if it cannot be read
 */
export function getMaintainer(): string {
  if (cachedMaintainer !== null) {
    return cachedMaintainer;
  }

  try {
    // Try multiple paths to find NAME file
    const paths = [
      join(process.cwd(), "NAME"), // Production: /app/NAME
      join(process.cwd(), "..", "NAME"), // Development from frontend/
      join(process.cwd(), "static", "NAME"), // In static assets
    ];

    for (const path of paths) {
      try {
        const maintainer = readFileSync(path, "utf-8").trim();
        if (maintainer) {
          cachedMaintainer = maintainer;
          return maintainer;
        }
      } catch {
        // Try next path
      }
    }
  } catch (err) {
    console.warn("Failed to read NAME file:", err);
  }

  cachedMaintainer = "unknown";
  return cachedMaintainer;
}

export function getVersion(): string {
  return getMaintainer();
}
