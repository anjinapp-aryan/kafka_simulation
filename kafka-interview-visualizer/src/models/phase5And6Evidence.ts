// PROVEN evidence from the actual Phase 5 and Phase 6 lab sessions against
// the live broker. Static, never derived from this UI's simulation state.

export const PHASE5_PROVEN: string[] = [
  'No commit + restart -> full replay (exact same offsets re-delivered)',
  'Commit + restart -> resumes after the committed position, no replay',
  'Process-before-commit, crash before commit -> replay -> duplicate processing possible',
  'Commit-before-process, crash before processing -> record permanently skipped by that group -> loss possible',
  'Two independent groups (group-A, group-B) reading the same records end up with completely independent committed offsets',
];

export const PHASE6_PROVEN: string[] = [
  '1 consumer -> owns all 3 partitions',
  '2 consumers -> partitions split 2/1 (range-style)',
  '3 consumers -> one partition each, zero idle',
  '4 consumers -> 4th consumer is a group member with 0 partitions assigned (idle)',
  'Graceful leave (LeaveGroup sent) -> observed rebalance to reassignment in ~3 seconds',
  'Abrupt crash (process killed, no LeaveGroup) -> observed reassignment in ~44 seconds (matches this lab\'s session.timeout.ms)',
  'Slow consumer exceeding max.poll.interval.ms -> evicted by its own heartbeat thread while still "alive"',
];

export const PHASE5_6_TIMING_NOTE =
  'The 3s and 44s figures are PROVEN for this lab\'s specific configuration only. Actual failure-detection timing in any Kafka deployment depends on that deployment\'s session.timeout.ms / heartbeat.interval.ms / max.poll.interval.ms - never assume these exact numbers elsewhere.';
