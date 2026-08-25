// The IO shell's failure modes (ADR-0023 §3, ADR-0028 §6). The pipeline's
// own logic is tested in broadcast.test.ts and to-schedule.test.ts; what is
// left here is the guarantee the hourly cron leans on entirely — a bad run
// exits non-zero and leaves data/schedule.json untouched, so `git diff
// --quiet` sees nothing, nothing is committed, and main keeps the last
// known-good Schedule. The output is either correct or absent, never
// partial.
//
// Driven as a subprocess rather than by importing the module: the failure
// path IS the exit code, and the script's work happens at import time.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(import.meta.dirname, "fetch-schedule.ts");
const output = join(import.meta.dirname, "..", "data", "schedule.json");

type Run = { status: number | null; stderr: string; wroteOutput: boolean };

/** Runs the shell to completion, reporting how it exited and whether it wrote. */
function run(env: Record<string, string | undefined>): Run {
  const before = readFileSync(output, "utf8");
  let status: number | null = 0;
  let stderr = "";
  try {
    execFileSync("node", [script], { env, stdio: "pipe" });
  } catch (error) {
    const failure = error as { status: number | null; stderr?: Buffer };
    status = failure.status;
    stderr = failure.stderr?.toString() ?? "";
  }
  return { status, stderr, wroteOutput: readFileSync(output, "utf8") !== before };
}

describe("fetch-schedule shell", () => {
  it("exits non-zero and writes nothing when the fetch fails", () => {
    // An unroutable endpoint: connection is refused immediately.
    const { status, wroteOutput } = run({
      ...process.env,
      BROADCAST_KEY: "test-key",
      BROADCAST_URL: "http://127.0.0.1:1",
    });

    expect(status).not.toBe(0);
    expect(wroteOutput).toBe(false);
  });

  it("fails loud and writes nothing when BROADCAST_KEY is unset", () => {
    // Deleted, not set to undefined: a developer running the suite with the
    // real key exported must still exercise the unset path, and must not
    // have this test reach Broadcast for real.
    const env = { ...process.env };
    delete env.BROADCAST_KEY;
    delete env.BROADCAST_URL;

    const { status, stderr, wroteOutput } = run(env);

    expect(status).not.toBe(0);
    expect(wroteOutput).toBe(false);
    // Named, and with the remediation in it: a red run in Reveal week should
    // be a one-line fix, not an investigation.
    expect(stderr).toMatch(/BROADCAST_KEY/);
    expect(stderr).toMatch(/pnpm fetch-schedule/);
  });
});
