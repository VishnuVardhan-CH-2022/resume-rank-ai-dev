/**
 * Ranking helpers self-check — terminal set / fingerprint (UXD §5.4.3).
 * Run: npm run test:ranking
 */
import {
  allStatusesTerminal,
  fingerprintStatuses,
  isTerminalStatus,
  TERMINAL_STATUSES,
} from "./types.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(isTerminalStatus("completed"), "completed terminal");
assert(isTerminalStatus("failed_ai"), "failed_ai terminal");
assert(isTerminalStatus("failed_parse"), "failed_parse terminal");
assert(isTerminalStatus("archived"), "archived terminal");
assert(!isTerminalStatus("queued"), "queued not terminal");
assert(!isTerminalStatus("ai_processing"), "ai_processing not terminal");
assert(TERMINAL_STATUSES.size === 4, "four terminals");

assert(
  allStatusesTerminal([
    { status: "completed" },
    { status: "failed_ai" },
  ]),
  "all terminal",
);
assert(
  !allStatusesTerminal([
    { status: "completed" },
    { status: "queued" },
  ]),
  "mixed not terminal",
);
assert(allStatusesTerminal([]), "empty is terminal (stop)");

const a = fingerprintStatuses([
  { id: "b", status: "queued", updated_at: "2" },
  { id: "a", status: "completed", updated_at: "1" },
]);
const b = fingerprintStatuses([
  { id: "a", status: "completed", updated_at: "1" },
  { id: "b", status: "queued", updated_at: "2" },
]);
assert(a === b, "fingerprint order-independent");

const c = fingerprintStatuses([
  { id: "a", status: "completed", updated_at: "1" },
  { id: "b", status: "completed", updated_at: "2" },
]);
assert(a !== c, "fingerprint changes on status");

console.log("ranking/types.selftest: ok");
