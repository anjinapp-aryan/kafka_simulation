// PROVEN evidence from the actual Phase 9 lab session against a real
// isolated 3-broker cluster (kafka-cluster/, RF=3). Static, never derived
// from this UI's simulation. The simulation model below (replicationModel.ts)
// was deliberately built to reproduce these exact transitions.

export const PHASE9_PROVEN: string[] = [
  'RF=3 topic created: P0 Leader=3 Replicas=[3,1,2] Isr=[3,1,2]; P1 Leader=1 Replicas=[1,2,3] Isr=[1,2,3]; P2 Leader=2 Replicas=[2,3,1] Isr=[2,3,1]',
  'acks=all write succeeded while ISR=3 (healthy baseline)',
  'Killed kafka2 (leader of P2): P2 leader changed 2 -> 3 (real leader election observed); P0/P1 leaders unchanged (kafka2 was not their leader); ISR shrank to 2 on all three partitions',
  'Replicas list for P2 stayed [2,3,1] (configured, unchanged) while Isr excluded the dead broker -> [3,1] — Replicas != ISR, proven directly',
  'All 3 partitions reported under-replicated (ISR=2 < RF=3) via --under-replicated-partitions',
  'acks=all write succeeded again at ISR=2 with min.insync.replicas=2',
  'Killed a second broker (kafka3): only kafka1 alive; direct produce with acks=all got NOT_ENOUGH_REPLICAS / NotEnoughReplicasException — the exact real broker error, not inferred',
  'Restarted both failed brokers: ISR restored to [1,2,3] on all partitions in 20 seconds (measured, polled)',
  'After recovery, leadership stayed on kafka1 (the survivor) for all 3 partitions — Kafka did NOT automatically hand leadership back to the recovered brokers',
];

export const PHASE9_LIMITATION_NOTE =
  'Killing 2 of 3 nodes in this lab also broke the KRaft controller Raft quorum (combined broker+controller roles need 2/3 majority) — admin metadata calls timed out even though the direct produce still worked off cached metadata. This is a real, additional finding from this lab, not a general Kafka guarantee.';
