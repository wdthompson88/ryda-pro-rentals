// Guards the one collision that two people working in parallel actually
// cause: two branches each adding `0038_*.sql`, both merging, and the
// migration chain silently ending up with two different migrations at the
// same ordinal. Nothing about that fails a typecheck or a build — it only
// surfaces when someone applies the chain to a fresh database and gets a
// different schema than production.
//
// AGENTS.md tells both humans to claim the number in the PR title. This is
// the part that does not rely on anyone remembering.

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations",
);

const NAME_PATTERN = /^(\d{4})_[a-z0-9_]+\.sql$/;

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("supabase migration numbering", () => {
  it("finds migrations to check", () => {
    // Guards against the check silently passing because the path moved.
    expect(migrationFiles().length).toBeGreaterThan(0);
  });

  it("every migration is named NNNN_snake_case.sql", () => {
    const bad = migrationFiles().filter((f) => !NAME_PATTERN.test(f));
    expect(bad).toEqual([]);
  });

  it("no two migrations share the same number", () => {
    // The actual parallel-work hazard. Two branches adding 0038 both pass
    // their own CI in isolation; only the merged tree is broken.
    const byNumber = new Map<string, string[]>();
    for (const file of migrationFiles()) {
      const num = NAME_PATTERN.exec(file)?.[1];
      if (!num) continue;
      byNumber.set(num, [...(byNumber.get(num) ?? []), file]);
    }

    const collisions = [...byNumber.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([num, files]) => `${num}: ${files.join(" vs ")}`);

    expect(collisions).toEqual([]);
  });

  // Deliberately NOT asserting a contiguous sequence. 0026 is already
  // absent on main and a gap is harmless — the chain applies in sorted
  // order regardless. Asserting contiguity would fail on a pre-existing
  // condition and train everyone to ignore this file.
});
