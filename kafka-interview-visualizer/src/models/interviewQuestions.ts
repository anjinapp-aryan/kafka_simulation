export interface InterviewQA {
  priority: '🔥🔥🔥' | '🔥🔥' | '🔥';
  question: string;
  simple: string;
  senior: string;
  why: string;
  production: string;
  trap: string;
  memory: string;
}

export const P3_INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    priority: '🔥🔥🔥',
    question: 'What is a consumer group?',
    simple: 'A named set of consumers that share the work of reading a topic.',
    senior:
      'A logical coordination unit identified by group.id. The group coordinator assigns each partition to exactly one member of the group at a time, so the group divides a topic\'s partitions rather than each member reading everything.',
    why: 'Without a shared group.id, every consumer gets its own full copy of the data - a group is what turns that into divided work.',
    production: 'payment-service runs 3 instances, all with group.id=payment-service-group, so each order is processed by exactly one instance.',
    trap: 'Assuming "consumer" and "consumer group" are the same thing - a consumer is one process; a group is the coordination unit.',
    memory: 'Consumer = one instance. Consumer group = the unit that shares partitions.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'How does Kafka assign partitions?',
    simple: 'The group coordinator runs an assignment strategy whenever membership changes.',
    senior:
      'On every join/leave, the coordinator re-runs the configured assignor (e.g. range-style) over the current partition list and member list, producing a new assignment where each partition has exactly one owner in the group.',
    why: 'Partitions must have a single owner within a group to avoid two consumers processing the same partition concurrently.',
    production: '3 partitions, 3 consumers -> each gets exactly one; add a 4th -> it gets none.',
    trap: 'Assuming every Kafka client always uses the same assignment strategy - it is configurable (range, round-robin, cooperative-sticky, ...).',
    memory: 'Assignment is recomputed by the coordinator whenever membership changes.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What happens when a consumer crashes?',
    simple: 'Kafka reassigns its partitions to surviving consumers.',
    senior:
      'The group coordinator detects membership loss (missed heartbeats), triggers a rebalance, and the crashed consumer\'s partitions are reassigned. The committed offsets remain durable, so the new owner resumes from that position, not from scratch.',
    why: 'Offsets are stored durably in the broker, independent of any single consumer process, so losing a process never loses the bookmark.',
    production: 'One of 3 payment-service pods OOM-kills - the other two absorb its partitions within the group\'s failure-detection window.',
    trap: 'Saying "consumer crash = data loss" - the partition\'s data and committed offset are both untouched; only ownership moves.',
    memory: 'Consumer dies -> ownership moves; data doesn\'t disappear.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What is a rebalance?',
    simple: 'The process of re-dividing partitions among current group members.',
    senior:
      'Triggered by any membership change (join, graceful leave, crash-detected timeout) or a partition-count change. The coordinator computes a new assignment; consumers with eager protocols pause consumption while it happens.',
    why: 'Without rebalancing, a departing or joining consumer would leave partitions permanently orphaned or unshared.',
    production: 'Deploying a new pod to scale payment-service from 3 to 5 instances triggers a rebalance to hand 2 partitions... but only if partition count allows it.',
    trap: 'Assuming rebalances are free - eager rebalances pause the whole group\'s consumption, so frequent rebalancing hurts throughput.',
    memory: 'Membership changes -> rebalance -> new assignment.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What happens when consumers > partitions?',
    simple: 'The extra consumers stay in the group but get zero partitions.',
    senior:
      'Group membership and partition ownership are separate concerns. A consumer can be a fully registered, heartbeating group member while owning 0 partitions - there is simply no partition left to give it.',
    why: 'One partition can only have one owner per group; once every partition has an owner, no mechanism exists to give a partition to a second consumer.',
    production: '3 partitions, 10 payment-service instances -> only 3 are ever actively consuming; the other 7 are pure standby capacity for this topic.',
    trap: 'Believing more consumer instances always means more throughput - it does not, beyond the partition count.',
    memory: 'Parallelism ceiling = partition count, not consumer count.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What is a committed offset?',
    simple: 'The durable bookmark a group has saved for a partition.',
    senior:
      'A value written by the consumer (explicitly via commitSync/commitAsync, or automatically) to the broker\'s internal offset store, keyed by (group, topic, partition). It is what a consumer resumes from after a restart.',
    why: 'In-memory progress disappears when a process dies; a durable, broker-side bookmark is the only thing that survives a restart.',
    production: 'A payment consumer restarts after a deploy - it resumes exactly at its last committed offset, not from the beginning of the topic.',
    trap: 'Confusing "committed" with "read" - a record can be read (current position moved) long before it is committed.',
    memory: 'Committed offset is the restart bookmark, not the read position.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'Current offset vs committed offset?',
    simple: 'Current = where the consumer has read to. Committed = where it has durably saved.',
    senior:
      'Current position lives only in the running consumer\'s memory and advances on every poll(). Committed offset is a separate, durable value that only moves when commit is explicitly (or automatically, on a timer) called. Current can run ahead of committed by an arbitrary amount.',
    why: 'Decoupling "read" from "durably bookmarked" is what makes at-least-once vs at-most-once a real choice rather than an accident.',
    production: 'A consumer polls 500 records (current +=500) but only commits every 5 seconds - if it crashes mid-batch, committed offset reflects the last commit, not the last poll.',
    trap: 'Assuming poll() itself commits anything - it never does, regardless of auto-commit settings.',
    memory: 'Current is in-memory and disposable; committed is durable and load-bearing.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'Why do duplicate messages occur?',
    simple: 'When processing finishes but the commit that would have recorded it never happens.',
    senior:
      'In the process-then-commit pattern, if the process crashes after side effects have run but before the offset is committed, a restart resumes from the last committed offset and replays records whose side effects already happened.',
    why: 'Kafka can only guarantee redelivery from the last durable bookmark - it has no way to know your application already "did the work" for records after that point.',
    production: 'A payment consumer charges a customer, then crashes before committing - restart replays the charge event.',
    trap: 'Calling this "Kafka delivering the message twice from the topic" - the topic held one copy; the consumer\'s own commit timing caused the replay.',
    memory: 'Process -> commit gives at-least-once: duplicates come from the gap between them.',
  },
  {
    priority: '🔥🔥',
    question: 'What happens if consumer crashes before commit?',
    simple: 'On restart, the record(s) are delivered again.',
    senior:
      'The committed offset never advanced past those records, so a fresh poll from that position returns them again - whether or not their processing already ran.',
    why: 'The broker has no visibility into application-level completion, only into what has been explicitly committed.',
    production: 'This is exactly why idempotent processing (e.g. a payment_id uniqueness check) matters at the business layer.',
    trap: 'Assuming this is rare in practice - it is the normal, expected behavior of at-least-once processing, not an edge case.',
    memory: 'No commit -> replay, every time, by design.',
  },
  {
    priority: '🔥🔥',
    question: 'What happens if consumer crashes after commit?',
    simple: 'On restart, those records are not delivered again.',
    senior:
      'If commit happened before the crash - especially if it happened before processing ran (commit-then-process) - the record is now permanently skipped by this group, even if the side effect never actually completed.',
    why: 'The committed offset is the only thing consulted on restart; it has no memory of whether processing actually finished.',
    production: 'commit-then-process is why that ordering is dangerous for anything where losing an event is unacceptable, like payments.',
    trap: 'Assuming "committed" is a safety signal for "processed successfully" - it is not, unless commit happens strictly after processing.',
    memory: 'Commit -> process ordering risks silent loss, not just theoretical risk.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What is consumer lag?',
    simple: 'How far behind the available data the consumer\'s committed position is.',
    senior:
      'LAG = LOG-END-OFFSET minus COMMITTED-OFFSET, computed per partition. It is a symptom, not a diagnosis - could mean slow processing, a stalled consumer, or simply a burst in producer rate.',
    why: 'Lag is defined against the committed offset (the durable, restart-safe position) specifically because that is the position that matters for correctness after a failure.',
    production: 'payment-service lag suddenly spikes to 500,000 - investigate producer rate, processing time, and downstream dependencies before assuming "add more consumers."',
    trap: 'Treating lag as a single global number - it is fundamentally per-partition; one hot or stuck partition can dominate the total.',
    memory: 'Lag is tracked per partition; a total is just a sum, not the real picture.',
  },
  {
    priority: '🔥🔥',
    question: 'Who detects consumer failure?',
    simple: 'The group coordinator, a role held by one of the brokers.',
    senior:
      'The coordinator tracks heartbeats from each member; missing heartbeats past session.timeout.ms mark a member as failed and trigger a rebalance. A graceful shutdown instead sends an explicit LeaveGroup, which is detected immediately.',
    why: 'Someone has to own group membership state centrally so all members agree on the current assignment - that role is the coordinator.',
    production: 'This lab measured graceful leave detected in ~3s (explicit LeaveGroup) vs abrupt crash detected in ~44s (session timeout) - PROVEN for this lab\'s config.',
    trap: 'Assuming consumers detect each other\'s failure directly - they do not; it is entirely coordinator-mediated.',
    memory: 'The coordinator watches heartbeats; consumers never watch each other.',
  },
  {
    priority: '🔥🔥',
    question: 'session.timeout.ms vs max.poll.interval.ms?',
    simple: 'One tracks "is the process alive," the other tracks "is it making progress."',
    senior:
      'session.timeout.ms bounds the heartbeat thread\'s liveness signal - a process can be alive and heartbeating while stuck in expensive processing. max.poll.interval.ms bounds the gap between poll() calls specifically; exceeding it evicts the consumer even though it never missed a heartbeat.',
    why: 'A process can be technically alive but functionally stuck (e.g. blocked on a slow DB call) - Kafka needs a separate signal for "is it actually progressing."',
    production: 'A consumer stuck in a 60s DB call with max.poll.interval.ms=30000 gets evicted by its own heartbeat thread while the DB call is still running.',
    trap: 'Assuming a low CPU/healthy process check means the consumer is fine for Kafka\'s purposes - "alive" and "healthy" are different signals here.',
    memory: 'Consumer alive != consumer healthy.',
  },
  {
    priority: '🔥🔥',
    question: 'Why are frequent rebalances dangerous?',
    simple: 'Because consumption can pause group-wide during each one.',
    senior:
      'With the eager rebalance protocol, every member revokes all its partitions and waits for reassignment before resuming - so a group that rebalances often spends much of its time not consuming at all, even though no data is lost.',
    why: 'The pause is a correctness mechanism (avoid two owners of one partition mid-transition), but it has a real throughput cost when triggered repeatedly.',
    production: 'A consumer whose processing occasionally exceeds max.poll.interval.ms causes a rebalance, rejoins, gets reassigned, processes the same batch again, times out again - a throughput-collapsing loop.',
    trap: 'Treating a single rebalance as the problem - a healthy group rebalances occasionally (deploys, scaling); it is frequency that signals trouble.',
    memory: 'One rebalance is normal; a rebalance loop is an incident.',
  },
  {
    priority: '🔥',
    question: 'How would you troubleshoot a consumer constantly rebalancing?',
    simple: 'Check whether processing time is exceeding max.poll.interval.ms.',
    senior:
      'Look for a pattern of join -> assign -> process -> eviction -> rejoin in the logs. Measure actual per-batch processing time against max.poll.interval.ms, check max.poll.records (a larger batch multiplies total processing time per poll), and check downstream dependency latency (DB, external API) as the likely root cause of slow processing.',
    why: 'The eviction mechanism is doing exactly what it is designed to do - the fix is almost always in processing time, not in Kafka configuration alone.',
    production: 'Reduce max.poll.records, speed up the downstream call, move heavy work off the poll thread, or (last resort) raise max.poll.interval.ms with full awareness of the failure-detection tradeoff.',
    trap: 'Reflexively raising max.poll.interval.ms without first finding out why processing is slow - it hides the symptom, not the cause.',
    memory: 'A rebalance loop is a processing-time problem wearing a rebalancing costume.',
  },
];

export const P7_INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    priority: '🔥🔥🔥',
    question: 'acks=0 vs acks=1 vs acks=all?',
    simple: '0 = no wait. 1 = leader wrote it. all = leader + ISR wrote it.',
    senior:
      'acks controls how much durability confirmation the producer waits for before treating a send as successful. acks=0 fires and forgets; acks=1 waits for the partition leader\'s local write; acks=all waits for every in-sync replica. PROVEN in this lab: acks=0 returns offset=-1/hasOffset=false even though the record landed.',
    why: 'Different durability guarantees cost different latency - Kafka exposes the trade-off as a producer-side choice rather than a fixed policy.',
    production: 'A payment producer should use acks=all; a metrics/logging producer might reasonably use acks=1 or even acks=0 for lower latency.',
    trap: 'Assuming acks=0 means the write failed - PROVEN: the record was independently verified in the log even with no acknowledgement returned.',
    memory: 'acks controls acknowledgement; idempotence protects retries.',
  },
  {
    priority: '🔥🔥',
    question: 'Why do retries create duplicate risk, and how does idempotence fix it?',
    simple: 'A timeout is ambiguous - the write may have succeeded with only the ack lost. Retrying can write it twice.',
    senior:
      'PROVEN in this lab: enable.idempotence=true assigns a PID + epoch + per-partition sequence number; the broker recognizes and drops a retried send whose sequence it already wrote, at the Kafka-write layer only.',
    why: 'Without a dedup identity, "did the first attempt actually land?" is unanswerable from the producer side - idempotence gives the broker enough state to answer it.',
    production: 'A payment producer should always run idempotent (it is the client default since Kafka 3.0, and PROVEN here to require acks=all).',
    trap: 'Believing "Kafka can never produce duplicates" - idempotence dedupes producer-level retries only, not a consumer replaying an already-processed record.',
    memory: 'Idempotence dedupes the write path; it says nothing about the read/process path.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'Producer idempotence vs business idempotency?',
    simple: 'Producer idempotence protects Producer→Kafka. Business idempotency protects Kafka→Application→DB.',
    senior:
      'These are two unrelated layers. PROVEN: the idempotent producer\'s PID/epoch/sequence mechanism only prevents a retried send from being double-written to the topic. It has zero visibility into whether a consumer later replays that same record and re-runs a business side effect - that requires a durable, business-keyed check (e.g. payment_id) at the application/DB boundary.',
    why: 'The producer and the consumer are two separate systems with two separate failure windows; one mechanism cannot cover both.',
    production: 'A payment_id uniqueness check in the database is what actually prevents double-charging a customer - the producer\'s idempotence setting is irrelevant to that specific risk.',
    trap: 'Conflating "I enabled idempotence" with "duplicates are impossible" - a very common and dangerous interview mistake.',
    memory: 'Producer idempotence != business idempotency.',
  },
  {
    priority: '🔥🔥',
    question: 'request.timeout.ms vs delivery.timeout.ms?',
    simple: 'request.timeout.ms bounds one attempt. delivery.timeout.ms bounds the whole record\'s total budget.',
    senior:
      'PROVEN: against an unreachable broker, this lab observed 10 retry attempts with exponential backoff before a terminal TimeoutException at 6185ms — delivery.timeout.ms is the outer deadline retries are bounded by; request.timeout.ms governs how long any single attempt waits before being retried.',
    why: 'Splitting the two lets Kafka retry transient failures quickly (short per-attempt timeout) while still bounding total end-to-end latency (the outer deadline).',
    production: 'Set delivery.timeout.ms to your actual end-to-end SLA budget for "did this record get durably written," not an arbitrary large number.',
    trap: 'Assuming raising retries alone extends how long a send can take - delivery.timeout.ms is the real ceiling regardless of the retries count.',
    memory: 'request.timeout.ms = one attempt; delivery.timeout.ms = the whole budget.',
  },
  {
    priority: '🔥',
    question: 'Can producer configuration alone guarantee a payment happens exactly once?',
    simple: 'No.',
    senior:
      'PROVEN across this lab: producer idempotence covers only the producer-to-Kafka write path (Phase 7). Phase 5 independently proved that a consumer can still replay an already-processed record after a crash regardless of producer settings. Phase 10 proved Kafka transactions atomically couple Kafka-side consume+produce+offset, but never touch an external database. Exactly-once at the business level requires idempotent producer + business-keyed idempotency check + (where relevant) a database transaction - three separate, uncoordinated mechanisms.',
    why: 'Kafka, the consumer application, and the database are three independent systems with no shared atomicity - each layer needs its own protection.',
    production: 'A payment pipeline combines all of: acks=all, idempotent producer, RF/ISR durability, a payment_id check at the DB boundary, and (optionally) Kafka transactions for the Kafka-internal hop.',
    trap: 'Treating any single Kafka setting as sufficient for "exactly once" in a system that also touches a database.',
    memory: 'Kafka producer reliability != consumer processing guarantee != database transaction.',
  },
];

export const P8_INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    priority: '🔥🔥🔥',
    question: 'What is consumer lag and how is it calculated?',
    simple: 'LAG = LOG-END-OFFSET - COMMITTED-OFFSET, per partition.',
    senior:
      'Lag measures how far behind the durable read position is from the newest available data, computed independently for every partition. PROVEN: this lab measured per-partition lag directly (p0=592, p2=858, p1=0 at one sample point) — never a single blended number.',
    why: 'Different partitions can have wildly different lag (a hot key, an unevenly-loaded partition) - averaging or summing without also looking per-partition hides the real problem.',
    production: 'payment-service TOTAL LAG can look moderate while one partition is badly behind - always check per-partition, not just the sum.',
    trap: 'Reporting or alerting on total lag only - PROVEN evidence in this lab shows partitions can be at 0 and 858 simultaneously.',
    memory: 'Lag is the distance between Kafka\'s end and my progress - tracked per partition.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'Producer rate > consumer rate - what happens, and does it mean Kafka is slow?',
    simple: 'Lag increases. It does not mean Kafka is slow.',
    senior:
      'PROVEN: sustained 500 rec/s producer against a ~100 rec/s consumer measured lag climbing 2800->5183->7350; once the producer stopped, lag fell as the consumer caught up. The bottleneck was the consumer\'s processing rate, not the broker.',
    why: 'Kafka just stores what arrives; it has no opinion about whether the consumer is keeping up - that comparison is what "lag" measures.',
    production: 'Before scaling anything, measure producer rate vs consumer processing rate explicitly - PROVEN evidence shows lag is entirely explained by that gap, not broker health.',
    trap: 'Treating high lag as evidence Kafka itself is unhealthy - check consumer throughput first.',
    memory: 'Lag is fundamentally tracked per partition. I don\'t treat lag as proof Kafka is slow.',
  },
  {
    priority: '🔥🔥',
    question: 'What does max.poll.records control, and does raising it always help?',
    simple: 'Maximum records returned by one poll() call. Not always faster.',
    senior:
      'PROVEN: with zero processing cost, max.poll.records=1 vs =500 gave 5495 vs 18 polls, and higher throughput at 500 (fewer poll round-trips). But with real per-record cost, a larger batch multiplies total processing time before the next poll() - PROVEN: 200 records x 10ms measured a 2006ms poll gap, exactly the product.',
    why: 'A bigger batch amortizes per-poll overhead when processing is free, but directly inflates the poll gap when processing is not free - the same knob helps or hurts depending on your workload.',
    production: 'Tune max.poll.records against your actual per-record processing cost, watching the resulting poll gap against max.poll.interval.ms, not against a generic "bigger is faster" assumption.',
    trap: 'Raising max.poll.records to fix throughput without checking whether processing is cheap enough to afford the resulting larger poll gap.',
    memory: 'max.poll.records is a ceiling on batch size, not a throughput dial.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'max.poll.records vs max.poll.interval.ms - and why is the combination dangerous?',
    simple: 'One caps batch size per poll; the other caps time between polls.',
    senior:
      'PROVEN (this session, connecting Phase 6 and Phase 8 evidence): poll gap ≈ max.poll.records x per-record processing time. If that gap exceeds max.poll.interval.ms, the consumer is evicted by its own heartbeat thread even though it never stopped heartbeating (Phase 6 F5: evicted 10.0s into a 15s sleep). A large batch multiplied by slow processing is exactly the failure mode.',
    why: 'These are independent settings that interact multiplicatively - tuning one without considering the other creates an invisible cliff edge.',
    production: 'When lowering max.poll.interval.ms or raising max.poll.records, always re-check the worst-case poll gap this creates against processing time.',
    trap: 'Tuning max.poll.records for throughput without re-checking max.poll.interval.ms headroom - this is precisely how a "performance improvement" causes a rebalance storm.',
    memory: 'large batch x slow processing -> large poll gap -> eviction -> rebalance.',
  },
  {
    priority: '🔥',
    question: 'CPU is low but lag is high - what do you check?',
    simple: 'Not CPU. Check I/O: DB latency, external API latency, downstream throttling.',
    senior:
      'Low CPU with high lag means the consumer is waiting, not computing. Check downstream dependency latency (DB, external API), I/O wait, thread blocking, and only then partition count / consumer count as capacity levers. This directly reuses Phase 6\'s evidence that a consumer can be "alive" (low CPU, heartbeating fine) while functionally stuck.',
    why: 'Kafka client threads spend most of their time either fetching (network I/O) or in your processing code - CPU utilization tells you about compute-bound work, not I/O-bound waiting.',
    production: 'A payment consumer with low CPU and climbing lag almost always points at a slow database query or a throttled downstream API, not at needing more consumer instances.',
    trap: 'Reflexively adding CPU/consumers when the bottleneck is a downstream dependency, not compute capacity.',
    memory: 'I don\'t treat lag as proof Kafka is slow - I compare producer vs consumer rate, then check downstream dependencies before scaling.',
  },
];

export const P9_INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    priority: '🔥🔥🔥',
    question: 'Replicas vs ISR?',
    simple: 'Replicas = configured copies. ISR = copies currently caught up.',
    senior:
      'PROVEN: killing kafka2 left P2\'s Replicas list unchanged at [2,3,1] while its ISR dropped to [3,1] — the replica list describes intended placement and does not change on failure; ISR is the live, currently-eligible-for-failover subset.',
    why: 'A dead or lagging replica is still "configured" - Kafka needs a separate, dynamic signal for "which of these can I actually rely on right now."',
    production: 'Monitoring should alert on ISR shrinking below RF (under-replicated), not on the static replica list, which never changes on its own.',
    trap: 'Treating replication factor as a live health signal - it is a configuration, not a status.',
    memory: 'Replicas are configured copies; ISR are currently caught-up copies.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What happens when the leader broker dies, and who elects the new one?',
    simple: 'An in-sync replica takes over. The controller does the electing.',
    senior:
      'PROVEN: killing kafka2 (P2\'s leader) resulted in kafka3 becoming the new leader — the first still-alive replica in P2\'s ISR. The KRaft controller (in this lab, a role combined with the broker process) performs the election; producers/consumers discover the new leader via a subsequent metadata refresh.',
    why: 'Only an in-sync replica is safe to promote - promoting a replica that was behind risks silently losing the records it never received.',
    production: 'This is why min.insync.replicas and acks=all matter together - they define the durability floor that makes safe leader election possible.',
    trap: 'Assuming leader election is instantaneous and free everywhere - detection + election together take real, measurable time (see Phase 6 for consumer-side failure-detection timing, a related but separate mechanism).',
    memory: 'An ISR member is promoted; the controller decides; clients discover it on next metadata refresh.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'What does min.insync.replicas protect, and why isn\'t acks=all alone enough?',
    simple: 'It sets the minimum ISR size an acks=all write requires to succeed.',
    senior:
      'PROVEN: acks=all succeeded at ISR=2 with min.insync.replicas=2, but was rejected with NOT_ENOUGH_REPLICAS once ISR dropped to 1. acks=all by itself just means "wait for whatever is currently in ISR" - without a floor, ISR could shrink to 1 and acks=all would silently accept a write backed by only one copy.',
    why: 'Without min.insync.replicas, "all" in acks=all is a moving target that can shrink to meaningless durability during an outage.',
    production: 'For payment events: RF=3, min.insync.replicas=2, acks=all — tolerates one broker failure while still requiring 2 real copies for every accepted write.',
    trap: 'Configuring acks=all without also setting min.insync.replicas, assuming "all" always means "multiple."',
    memory: 'acks=all asks for the strongest ack Kafka currently offers; min.insync.replicas sets the floor that makes that ack mean something.',
  },
  {
    priority: '🔥🔥',
    question: 'What is an under-replicated partition - is it broken?',
    simple: 'ISR is smaller than RF. Not automatically broken, but reduced redundancy.',
    senior:
      'PROVEN: after one broker died, all 3 partitions in this lab reported under-replicated (ISR=2 < RF=3), yet acks=all writes continued succeeding — the topic stayed fully available, just with less redundancy than configured. Persistent under-replication should still be investigated (broker/network/disk health) since it means one more failure away from breaching min.insync.replicas.',
    why: 'RF is a target, not a live guarantee - the system is designed to keep serving while temporarily short of it, precisely so a single failure doesn\'t cause an outage.',
    production: 'Alert on under-replicated partitions as a real signal, but "sustained for X minutes" rather than instant-page, since transient blips during rolling restarts are normal.',
    trap: 'Panicking at the first under-replicated-partitions alert as if it were an outage - PROVEN evidence shows the topic kept accepting writes throughout.',
    memory: 'Under-replicated means reduced redundancy, not data loss.',
  },
  {
    priority: '🔥',
    question: 'What happens when a failed broker comes back — does it immediately become leader again?',
    simple: 'It rejoins as a follower. No, leadership does not move back automatically.',
    senior:
      'PROVEN, and a genuinely surprising result from this lab: restarting both failed brokers restored ISR to all 3 in 20 measured seconds, but the surviving broker kept leadership for every partition — the recovered brokers came back purely as followers. Moving leadership back requires a deliberate preferred-leader election (or auto.leader.rebalance.enable in some deployments), not automatic behavior on recovery.',
    why: 'There is no inherent reason to disrupt a currently-stable leader just because a former leader becomes available again - stability is favored over "restoring the original layout."',
    production: 'After a broker outage and recovery, check leader distribution explicitly - it may be skewed onto the survivors until a preferred-leader election is triggered.',
    trap: 'Assuming the cluster "heals back to normal" on its own after a recovered broker rejoins - ISR heals, but leader distribution does not, without an explicit action.',
    memory: 'Recovery restores ISR membership; it does not restore leadership by itself.',
  },
];

export const P10_INTERVIEW_QUESTIONS: InterviewQA[] = [
  {
    priority: '🔥🔥🔥',
    question: 'What is a Kafka transaction, and what does it atomically couple?',
    simple: 'It atomically ties together produced records AND the consumer offset commit.',
    senior:
      'PROVEN (T3): sendOffsetsToTransaction() writes the consumer\'s offset commit inside the SAME transaction as the output records, so both become visible together on commit, or neither does. This is a strictly Kafka-internal guarantee (consume+produce+offset), not a guarantee about anything outside Kafka.',
    why: 'Without this, a consume-process-produce loop has two separate commit points (offset commit, output send) that can succeed/fail independently, reopening exactly the at-least-once/at-most-once gap Phase 5 proved.',
    production: 'A stream-processing hop (read topic A, transform, write topic B) is the canonical use case for Kafka transactions.',
    trap: 'Assuming a "Kafka transaction" is a general-purpose distributed transaction - it only spans Kafka-internal state.',
    memory: 'Kafka transactions atomically combine Kafka output and Kafka offset commits.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'read_committed vs read_uncommitted?',
    simple: 'read_committed hides aborted/in-flight transactional records. read_uncommitted shows everything.',
    senior:
      'PROVEN (T2): the same aborted-transaction partition returned 0 messages under read_committed and both records under read_uncommitted. PROVEN (T4): read_committed on an OPEN (not yet resolved) transaction returned a timeout with 0 messages - it doesn\'t just filter aborted data after the fact, it blocks past the transaction\'s Last-Stable-Offset until resolution.',
    why: 'A consumer needs a way to never see partially-written, possibly-rolled-back data - that is exactly what read_committed provides.',
    production: 'Consumers of a transactional topic should default to read_committed unless they have a specific reason (debugging, monitoring) to see uncommitted data.',
    trap: 'Assuming read_committed just filters out aborted records after the fact - PROVEN it actually blocks reads past an open transaction entirely.',
    memory: 'read_committed hides the mess; read_uncommitted shows it.',
  },
  {
    priority: '🔥🔥',
    question: 'What happens if a consumer crashes mid-transaction, before commit?',
    simple: 'The transaction is fenced on reconnect; its output is permanently invisible; input is reprocessed.',
    senior:
      'PROVEN (T4): a crash after send() but before commit left input CURRENT-OFFSET uncommitted and output permanently unreadable under read_committed. Reconnecting with the same transactional.id silently fenced the zombie transaction (producer epoch bump, no error surfaced) and cleanly reprocessed the input on retry.',
    why: 'The zombie-fencing mechanism (epoch) is what prevents a "resurrected" old producer instance from writing more data into an already-abandoned transaction.',
    production: 'This is what makes transactional consume-process-produce safe to restart after a crash without manual cleanup.',
    trap: 'Assuming a crashed transaction leaves orphaned, later-visible data - PROVEN it never became visible, even well after the retry succeeded.',
    memory: 'A crashed transaction is fenced, not resumed - the retry starts clean.',
  },
  {
    priority: '🔥🔥🔥',
    question: 'Is Kafka EOS the same as database exactly-once?',
    simple: 'No.',
    senior:
      'PROVEN across this lab: Kafka EOS (T1-T4) guarantees exactly-once for the Kafka-internal consume+produce+offset unit only. It has no visibility into an external database. Phase 5 independently proved a consumer can still replay an already-processed record after a crash; Phase 10 T6 (conceptual) shows the DB-succeeds-then-Kafka-commit-fails window is a real, separate risk that Kafka transactions do not cover.',
    why: 'Kafka and an external database are two independent systems with no shared atomicity - "exactly once" inside one of them says nothing about the other.',
    production: 'A payment pipeline still needs a business-keyed idempotency check at the DB boundary even when Kafka transactions are in use for the Kafka-internal hop.',
    trap: 'The single most common EOS interview mistake: assuming "exactly-once" means "the business effect happens exactly once end-to-end."',
    memory: 'Kafka EOS is not database exactly-once.',
  },
  {
    priority: '🔥🔥',
    question: 'What is a Saga, and does Kafka implement it?',
    simple: 'A sequence of local transactions plus compensations. Kafka is the event transport, not the Saga engine.',
    senior:
      'CONCEPTUAL (not executed in this lab): a Saga breaks a distributed operation into local transactions, each publishing an event that triggers the next; if a later step fails, prior steps run compensating actions (e.g. Debit -> Reserve -> Process fails -> Credit back). Kafka carries these events reliably but has no built-in notion of "this is a Saga" or automatic compensation.',
    why: 'True distributed transactions (2PC) across services don\'t scale well and create tight coupling - Sagas trade strict atomicity for eventual consistency plus explicit compensation logic you write yourself.',
    production: 'Order -> Payment -> Inventory -> Notification is a canonical Saga; if Inventory fails, a compensating "RefundPayment" event undoes the Payment step.',
    trap: 'Saying "Kafka implements Saga" - Kafka is the backbone; the Saga logic (steps, compensations) lives in your services.',
    memory: 'Saga uses local transactions plus compensation - Kafka just carries the events.',
  },
  {
    priority: '🔥',
    question: 'How would you design a banking payment pipeline end to end?',
    simple: 'Idempotent producer + RF/ISR durability + Kafka transactions where needed + business idempotency + DB transaction + Saga for cross-service compensation.',
    senior:
      'Combine, at the correct layer for each: acks=all + idempotent producer (Phase 7, producer write path) + RF=3/min.insync.replicas=2 (Phase 9, durability floor) + Kafka transactions for any consume-transform-produce hop (Phase 10, Kafka-internal atomicity) + a payment_id-keyed idempotency check at the database boundary (Phase 5/10, business-layer replay safety) + Saga with explicit compensations for anything spanning multiple services. No single mechanism covers the whole pipeline.',
    why: 'Each layer (producer, broker cluster, Kafka-internal processing, application/DB, cross-service workflow) has its own independent failure mode - a design that only hardens one layer leaves the others exposed.',
    production: 'This is literally the checklist from this lab\'s own Phase 7/9/10 evidence, assembled - not a new invention.',
    trap: 'Presenting any single Kafka feature (transactions, idempotence, acks=all) as "the" solution to exactly-once payments.',
    memory: 'No single Kafka feature makes a banking pipeline exactly-once - durability, atomicity, and idempotency each live at a different layer.',
  },
];
