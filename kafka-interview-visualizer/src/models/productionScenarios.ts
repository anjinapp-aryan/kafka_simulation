export interface ProductionScenario {
  phase: 'P6' | 'P7' | 'P8' | 'P9' | 'P10';
  symptom: string;
  whatICheck: string;
  why: string;
  rootCause: string;
  fix: string;
  commonTrap: string;
}

export const PRODUCTION_SCENARIOS: ProductionScenario[] = [
  {
    phase: 'P6',
    symptom: 'A consumer instance stopped processing; the group shows a rebalance.',
    whatICheck: 'Was there a LeaveGroup in the logs (graceful) or a session-timeout expiry (crash)?',
    why: 'PROVEN (Phase 6): graceful leave rebalances in ~3s; abrupt crash takes ~44s in this lab (session.timeout.ms-bound) — the failure mode changes the recovery time by an order of magnitude.',
    rootCause: 'Process exit (deploy, OOM-kill, crash) without a clean shutdown hook calling consumer.close().',
    fix: 'Ensure graceful shutdown (SIGTERM handler calling close()) wherever possible; it is the difference between 3s and 44s of reduced parallelism.',
    commonTrap: 'Assuming all consumer failures recover in the same amount of time - PROVEN they do not.',
  },
  {
    phase: 'P7',
    symptom: 'A payment producer occasionally throws a timeout exception.',
    whatICheck: 'Did the record actually land? (A timeout means "no confirmation," not "no write.") Check delivery.timeout.ms vs request.timeout.ms, and whether idempotence is enabled.',
    why: 'PROVEN (Phase 7): a producer against an unreachable broker retried 10 times with exponential backoff before a terminal timeout at 6185ms - the ambiguity between "failed" and "succeeded, ack lost" is real and unavoidable at the network layer.',
    rootCause: 'Transient network issue, broker overload, or genuine broker unavailability.',
    fix: 'With idempotence enabled (PROVEN: PID+epoch+sequence dedup), a safe retry is automatic. Without it, a manual retry risks a duplicate write - always verify idempotence is on for anything payment-adjacent.',
    commonTrap: 'Treating a producer timeout as "the message was lost" and blindly re-sending without idempotence.',
  },
  {
    phase: 'P8',
    symptom: 'Consumer lag jumped from near-zero to a large number.',
    whatICheck: 'Producer rate vs consumer rate first; then per-partition lag distribution; then downstream (DB/API) latency; then rebalance frequency.',
    why: 'PROVEN (Phase 8): sustained producer > consumer rate measured lag climbing 2800->7350, then draining once the producer stopped - the mechanism is exactly a rate mismatch, not a broker problem.',
    rootCause: 'Either a genuine traffic spike (producer rate increased) or the consumer got slower (downstream dependency, GC, a bad deploy).',
    fix: 'If per-partition lag is even, scale consumers (up to partition count) or fix the slow dependency; if uneven, investigate that specific partition/key\'s hot load first.',
    commonTrap: 'Jumping straight to "add more consumers" - PROVEN that beyond partition count, extra consumers add zero throughput (Phase 3).',
  },
  {
    phase: 'P8',
    symptom: 'CPU utilization is low (~20-30%) but lag keeps climbing.',
    whatICheck: 'DB/external API latency, I/O wait, thread blocking - not CPU or memory first.',
    why: 'Low CPU with high lag means the consumer is waiting on I/O, not computing - PROVEN in spirit by Phase 6\'s F5 (a consumer can be "alive," low resource usage, and still functionally stuck on a slow downstream call).',
    rootCause: 'A slow database query, throttled external API, or lock contention downstream of Kafka entirely.',
    fix: 'Profile the actual per-record processing time and where it is spent; fix or scale the downstream dependency, not the Kafka consumer count.',
    commonTrap: 'Adding CPU or consumer instances when the bottleneck is external I/O - it will not move the needle.',
  },
  {
    phase: 'P9',
    symptom: 'A broker in the cluster went down; the topic reports under-replicated partitions.',
    whatICheck: 'Which partitions lost their leader vs. just lost an ISR member; whether ISR is still ≥ min.insync.replicas; whether acks=all writes are still succeeding.',
    why: 'PROVEN (Phase 9): killing one broker shrank ISR from 3 to 2 on every partition and re-elected a new leader for the one partition it was leading — writes continued succeeding throughout since ISR stayed ≥ min.insync.replicas=2.',
    rootCause: 'Hardware failure, OOM, network partition, or a rolling deploy/restart.',
    fix: 'Confirm min.insync.replicas is still satisfied; if a second broker were to fail, PROVEN evidence shows writes get rejected (NOT_ENOUGH_REPLICAS) rather than silently under-durable — that rejection is the system working correctly, not a bug to route around.',
    commonTrap: 'Treating "under-replicated" alerts as an outage - PROVEN the topic kept serving writes throughout a single-broker failure.',
  },
  {
    phase: 'P10',
    symptom: 'A database update succeeded, but the application crashed before the Kafka offset was committed.',
    whatICheck: 'Whether the operation is idempotent at the business layer (e.g. payment_id uniqueness), since the event WILL be redelivered.',
    why: 'PROVEN (Phase 5, and reconfirmed conceptually in Phase 10 T6): this is the expected at-least-once failure window, not a bug - a restart resumes from the last committed offset and replays anything after it, whether or not it already executed a side effect.',
    rootCause: 'Kafka offset commit and the database transaction are two independent systems with no shared atomicity - crashing between them is always possible.',
    fix: 'A durable, business-keyed idempotency check (payment_id -> already-processed) at the DB boundary is the only mechanism that makes replay safe - not a Kafka setting.',
    commonTrap: 'Trying to solve this with Kafka transactions alone - PROVEN (Phase 10) that Kafka transactions never touch an external database.',
  },
];
