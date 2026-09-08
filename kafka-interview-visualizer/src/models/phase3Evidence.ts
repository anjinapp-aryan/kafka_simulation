// PROVEN evidence from the actual Phase 3 lab run against the live broker
// (see kafka_imp_feauture_plan.md / the Phase 3 session report). Not derived
// from this UI's simulation - kept as a separate, static source of truth so
// the two are never confused.

export interface ProvenAssignmentCase {
  consumerCount: number;
  assignment: string; // exact text as observed via kafka-consumer-groups.sh --describe
}

export const PHASE3_PROVEN_ASSIGNMENTS: ProvenAssignmentCase[] = [
  { consumerCount: 1, assignment: 'C1 -> [0,1,2]' },
  { consumerCount: 2, assignment: 'C1 -> [0,1]   C2 -> [2]' },
  { consumerCount: 3, assignment: 'C1 -> [0]   C2 -> [1]   C3 -> [2]' },
  { consumerCount: 4, assignment: 'C1 -> [0]   C2 -> [1]   C3 -> [2]   C4 -> [] (idle, 0 partitions)' },
];

export const PHASE3_SOURCE_NOTE =
  'Observed via kafka-consumer-groups.sh --describe --members --verbose against the live single-broker lab, topic orders (3 partitions).';
