// PROVEN evidence from the actual Phase 7 lab session against the live
// broker (setup/compose, RF=1). Static, never derived from this UI.

export const PHASE7_PROVEN: string[] = [
  'acks=0: send() returns partition=1 offset=-1 hasOffset=false — broker never confirms, though the record independently verified as landed at offset 0 via console-consumer',
  'acks=1 and acks=all: steady-state ack latency ~7-9ms each — statistically indistinguishable at RF=1 (this lab cannot demonstrate multi-replica acks=all durability; that requires Phase 9\'s 3-broker cluster)',
  'enable.idempotence=true + acks=1 -> client rejects at construction: ConfigException "Must set acks to all in order to use the idempotent producer. Otherwise we cannot guarantee idempotence."',
  'Idempotent producer assigned ProducerId=3007, epoch=0; effective acks=-1, retries=2147483647, max.in.flight.requests.per.connection=5',
  'Producer against an unreachable broker: 10 connection attempts observed with exponential backoff (+104ms, +152ms, +255ms, +503ms...), terminal TimeoutException after 6185ms',
  'delivery.timeout.ms could NOT be isolated from max.block.ms in this single-broker lab — both attempts (unreachable port, and broker stopped after metadata warm-up) failed at the metadata-refresh stage before a batch was ever accepted, not at batch-expiry. This is an honest, reported limitation, not a proven delivery.timeout.ms measurement.',
  'linger.ms 0 vs 100 over 30 unthrottled sends: both produced records-per-request-avg=30.0 (one request) — a tight send loop saturates the batch regardless of linger; the linger difference was NOT isolated in this run',
];

export const PHASE7_LIMITATION_NOTE =
  'This lab is single-broker (RF=1). acks=all\'s real value — surviving a leader failure because a follower already has the data — can only be honestly demonstrated with Phase 9\'s 3-broker cluster, not here.';
