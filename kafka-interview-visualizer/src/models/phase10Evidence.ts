// PROVEN evidence from the actual Phase 10 lab session against the live
// broker. Static, never derived from this UI's simulation.

export const PHASE10_PROVEN: string[] = [
  'T1: transactional producer assigned real ProducerId=3007 epoch=0; commitTransaction() on COMMITTED-001/002 (partition 2, offsets 0-1); abortTransaction() on ABORTED-001/002 (partition 0, offsets 0-1) — both aborted records still consumed real offsets',
  'T2: read_committed on the committed partition returned exactly 2 messages (COMMITTED-001/002); read_committed on the aborted partition returned 0 messages; read_uncommitted on the SAME aborted partition returned both ABORTED-001/002',
  'T3: sendOffsetsToTransaction + commitTransaction — input consumed at partition1/offset0, output produced at partition2/offset3, one atomic unit; independently verified via kafka-consumer-groups.sh (CURRENT-OFFSET=1, LAG=0) and read_committed console-consumer at the exact output offset',
  'T4: crash injected via Runtime.halt(1) after send(), before sendOffsetsToTransaction/commitTransaction — input CURRENT-OFFSET stayed "-" (never committed); output under read_committed returned a TimeoutException with 0 messages (the open transaction blocked the read entirely, not merely hid it)',
  'T4 retry: reconnecting with the same transactional.id silently fenced the zombie transaction (no error surfaced); both records reprocessed cleanly and committed; the original crashed transaction\'s orphaned output records remained permanently invisible (0 messages) even after the retry succeeded',
  'T7: duplicate PAY-1001 delivery correctly skipped by an in-memory idempotency check ("ALREADY PROCESSED -> skip business effect"); PAY-1002 (different id) processed normally',
];

export const PHASE10_LIMITATION_NOTE =
  'Saga, Outbox, orchestration vs choreography, and the full banking architecture were documented conceptually in Phase 10 (T8-T10) — no Saga framework or real database was executed in this lab. Labeled CONCEPTUAL below, not PROVEN.';

export const SAGA_CONCEPTUAL: string[] = [
  'Saga = a sequence of local transactions, each publishing an event that triggers the next step, with a compensating action for every step that must be undone on failure.',
  'Example modeled (not executed): Debit Account -> Reserve Funds -> Process Payment -> (failure) -> Compensation: Credit Account back.',
  'Kafka is the event transport/backbone carrying these steps between services — Kafka does not implement Saga itself, and no distributed 2-phase-commit exists across the services.',
  'Orchestration: one service (an orchestrator) explicitly calls each step and holds the workflow state — easier to observe end-to-end, but a coupling point.',
  'Choreography: each service reacts to the previous event with no central controller — looser coupling, harder to trace without distributed tracing.',
];
