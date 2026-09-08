import type { InterviewQA } from './interviewQuestions';
import {
  P3_INTERVIEW_QUESTIONS,
  P7_INTERVIEW_QUESTIONS,
  P8_INTERVIEW_QUESTIONS,
  P9_INTERVIEW_QUESTIONS,
  P10_INTERVIEW_QUESTIONS,
} from './interviewQuestions';

export const TOPICS = [
  'Kafka Fundamentals',
  'Consumer Groups',
  'Offsets',
  'Rebalancing',
  'Reliability',
  'Performance & Lag',
  'Replication & ISR',
  'Transactions & EOS',
  'Idempotency',
  'Saga',
  'Banking',
  'Production Troubleshooting',
] as const;

export type Topic = (typeof TOPICS)[number];

/** A question plus the metadata Interview Mode needs: topic, the lab phase
 *  whose evidence backs it, and the follow-ups an interviewer asks next. */
export interface BankQuestion extends InterviewQA {
  id: string;
  topic: Topic;
  /** Phase tab id whose evidence/visualisation backs this answer, or null if conceptual. */
  evidencePhase: string | null;
  evidenceLabel: string;
  followUps: string[];
}

const DEFAULT_FOLLOW_UPS = [
  'Why does Kafka behave that way?',
  'What happens if it fails?',
  'How would you troubleshoot it in production?',
  'What would you configure differently for a payment system?',
];

function attach(
  questions: InterviewQA[],
  topic: Topic,
  evidencePhase: string | null,
  evidenceLabel: string,
  idPrefix: string,
): BankQuestion[] {
  return questions.map((q, i) => ({
    ...q,
    id: idPrefix + '-' + i,
    topic,
    evidencePhase,
    evidenceLabel,
    followUps: DEFAULT_FOLLOW_UPS,
  }));
}

// --- Existing 37 questions, wrapped with metadata (originals untouched) ---

const P3_BANK = attach(
  P3_INTERVIEW_QUESTIONS,
  'Consumer Groups',
  'P3',
  'Phase 3/5/6 - assignment, offsets, rebalancing',
  'p3',
);
const P7_BANK = attach(P7_INTERVIEW_QUESTIONS, 'Reliability', 'P7', 'Phase 7 - producer reliability', 'p7');
const P8_BANK = attach(P8_INTERVIEW_QUESTIONS, 'Performance & Lag', 'P8', 'Phase 8 - performance / lag', 'p8');
const P9_BANK = attach(P9_INTERVIEW_QUESTIONS, 'Replication & ISR', 'P9', 'Phase 9 - replication / ISR', 'p9');
const P10_BANK = attach(
  P10_INTERVIEW_QUESTIONS,
  'Transactions & EOS',
  'P10',
  'Phase 10 - transactions / EOS',
  'p10',
);

/** Metadata-only refinement: some questions belong to a more specific topic
 *  than their source phase. Answers are never modified. */
function retopic(bank: BankQuestion[], match: string, topic: Topic): BankQuestion[] {
  return bank.map((q) => (q.question.includes(match) ? { ...q, topic } : q));
}

const P3_RETOPICED: BankQuestion[] = (
  [
    ['committed offset', 'Offsets'],
    ['Current offset vs committed', 'Offsets'],
    ['duplicate messages', 'Offsets'],
    ['crashes before commit', 'Offsets'],
    ['crashes after commit', 'Offsets'],
    ['consumer lag', 'Performance & Lag'],
    ['What is a rebalance', 'Rebalancing'],
    ['consumer crashes', 'Rebalancing'],
    ['detects consumer failure', 'Rebalancing'],
    ['session.timeout.ms', 'Rebalancing'],
    ['constantly rebalancing', 'Production Troubleshooting'],
  ] as [string, Topic][]
).reduce((bank, [m, t]) => retopic(bank, m, t), P3_BANK);

const P10_RETOPICED = retopic(retopic(P10_BANK, 'Saga', 'Saga'), 'banking payment pipeline', 'Banking');

// --- New questions filling real gaps: fundamentals, ordering, banking, DLQ, troubleshooting ---

export const NEW_QUESTIONS: BankQuestion[] = [
  {
    id: 'f-1',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 1 - producer / topic / partition',
    priority: '🔥🔥🔥',
    question: 'What is Kafka, in one sentence a senior engineer would use?',
    simple: 'A distributed, replicated, append-only commit log that decouples producers from consumers.',
    senior:
      'Kafka is a distributed commit log: producers append records to partitioned, replicated logs, and consumers read at their own pace by tracking an offset. It is not a queue that deletes on read - retention is time/size based, which is exactly what allows many independent consumer groups to read the same data.',
    why: 'The "log, not queue" framing explains almost every other Kafka behaviour: replay, multiple consumer groups, per-partition ordering, and offset-based consumption.',
    production: 'An orders topic feeds payment, fraud and analytics services independently - each with its own group and its own position in the same log.',
    trap: 'Describing Kafka as "a message queue" - that framing wrongly implies messages are consumed and removed.',
    memory: 'Kafka is a replicated log, not a queue - reading never removes.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'f-2',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 1 - partitions on a 3-partition topic',
    priority: '🔥🔥🔥',
    question: 'Why does Kafka use partitions?',
    simple: 'Partitions are the unit of parallelism and of ordering.',
    senior:
      'A single log can only be appended to and consumed in order by one chain. Partitioning splits a topic into multiple independent ordered logs so writes and reads scale horizontally - at the price of ordering being guaranteed only within a partition, never across them.',
    why: 'Without partitions, topic throughput would be capped at what one log and one consumer per group can handle.',
    production: 'orders with 3 partitions lets 3 payment-service instances process concurrently; PROVEN in Phase 3 that a 4th instance adds nothing.',
    trap: 'Assuming Kafka guarantees global ordering across a topic - it only guarantees it per partition.',
    memory: 'Partitions buy parallelism; the price is ordering only per partition.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'f-3',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 1 - keyed vs unkeyed routing proven',
    priority: '🔥🔥🔥',
    question: 'How does a producer choose a partition, and why does the key matter?',
    simple: 'With a key: a deterministic hash of the key. Without: a sticky, per-batch choice.',
    senior:
      'A keyed record is routed by a hash of the key bytes, so every record for that key lands in the same partition and stays ordered. PROVEN in Phase 1: both customer-101 records landed on partition 0. Unkeyed records use a sticky per-batch partitioner - PROVEN: 20 unkeyed records all went to one partition in a single batch, not per-record round-robin.',
    why: 'Ordering is a per-partition property, so the only way to order events for one entity is to force them onto one partition - which is what keying does.',
    production: 'Key payment events by account_id so all events for one account are processed in order by one consumer.',
    trap: 'Believing unkeyed records are round-robined per record - PROVEN otherwise: sticky batching sent all 20 to one partition.',
    memory: 'Same key -> same partition -> ordered. No key -> no ordering promise.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'f-4',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 1 - offsets observed directly in the log',
    priority: '🔥🔥',
    question: 'What exactly is an offset?',
    simple: 'A position within one partition - not a message id, not a count.',
    senior:
      'An offset is a monotonically increasing position in a single partition log, meaningful only together with (topic, partition). PROVEN in Phase 1: non-data leader-epoch bookkeeping consumed offset numbers, so the first real record sat at offset 2, not 0 - offsets are positions, not a message counter.',
    why: 'Offsets are how each consumer group tracks its own independent progress without the broker holding per-consumer state.',
    production: 'kafka-consumer-groups.sh --describe shows CURRENT-OFFSET / LOG-END-OFFSET per partition; lag is the difference.',
    trap: 'Treating an offset as a global sequence number across the topic, or as "the Nth message".',
    memory: 'Offset = position in one partition. Always partition-scoped.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'f-5',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 2 - poll() batching proven',
    priority: '🔥🔥🔥',
    question: 'What does poll() actually do?',
    simple: 'Fetches a batch of records from all assigned partitions, and proves the consumer is progressing.',
    senior:
      'poll() is not "get one message". PROVEN in Phase 2: a single poll() returned 49 records spanning all 3 assigned partitions. It also drives group membership - the poll loop is what proves progress (max.poll.interval.ms), separately from the background heartbeat thread that proves liveness.',
    why: 'Batching amortises network round-trips; tying progress to poll() is how Kafka detects a consumer that is alive but stuck.',
    production: 'A consumer blocking 60s inside processing never calls poll(), and gets evicted even though its heartbeat thread is healthy.',
    trap: 'Thinking poll() returns one record, or that it commits anything - it does neither.',
    memory: 'poll() = batched fetch + proof of progress.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'ord-1',
    topic: 'Kafka Fundamentals',
    evidencePhase: 'P1',
    evidenceLabel: 'Phase 1 - per-partition ordering',
    priority: '🔥🔥',
    question: 'How do you guarantee ordering in Kafka?',
    simple: 'Key by the entity you need ordered, so it stays on one partition.',
    senior:
      'Ordering is guaranteed only within a partition, so you key by the ordering domain (account_id, payment_id). Two caveats a senior should add: max.in.flight.requests.per.connection > 1 without idempotence can reorder on retry (idempotence makes up to 5 in-flight safe), and increasing partition count later re-hashes keys, breaking ordering continuity for existing keys.',
    why: 'A partition is a single append-only log with one leader - the only place Kafka can cheaply guarantee sequence.',
    production: 'For money movement, key by account_id so debits and credits for one account are never reordered across consumers.',
    trap: 'Saying "Kafka guarantees ordering" without the per-partition qualifier, or forgetting repartitioning breaks key->partition stability.',
    memory: 'Order lives in a partition. The key picks the partition. Repartitioning breaks the mapping.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-1',
    topic: 'Banking',
    evidencePhase: 'P10',
    evidenceLabel: 'Phase 5 + Phase 10 - replay window and idempotency check',
    priority: '🔥🔥🔥',
    question: 'A payment event was processed twice. Why, and how do you prevent it?',
    simple: 'It processed, then crashed before committing the offset. Prevent it with a payment_id idempotency check.',
    senior:
      'This is the at-least-once failure window, PROVEN in Phase 5: process-then-commit, crash before commit, restart replays a record whose side effect already ran. Kafka cannot know the application already did the work. The fix is business idempotency - a durable uniquely-keyed record (payment_id) checked before the side effect, PROVEN in Phase 10 T7.',
    why: 'The offset commit and the database side effect are separate systems with no shared atomicity - a crash between them is always possible.',
    production: 'INSERT payment_id with a unique constraint inside the DB transaction, so a replay becomes a no-op instead of a second charge.',
    trap: 'Answering "enable the idempotent producer" - PROVEN that only dedupes producer retries, never consumer replay.',
    memory: 'Kafka can replay the event; the business layer must make replay harmless.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-2',
    topic: 'Banking',
    evidencePhase: 'P7',
    evidenceLabel: 'Phase 7 - producer timeout / retry behaviour',
    priority: '🔥🔥🔥',
    question: 'The payment producer got a timeout. Was the event lost?',
    simple: 'Not necessarily - a timeout means "no confirmation", not "no write".',
    senior:
      'The broker may have durably written the record with only the acknowledgement lost. PROVEN in Phase 7: a producer retried 10 times with exponential backoff before a terminal TimeoutException at 6185ms. With enable.idempotence=true the automatic retry is safe (PID + epoch + sequence dedup); without it, a manual retry can create a genuine duplicate.',
    why: 'Lost acknowledgement is indistinguishable from failed write on the client side - only broker-side dedup state resolves it.',
    production: 'Never blind-retry a payment send without idempotence; verify the actual outcome before compensating.',
    trap: 'Treating a producer timeout as proof of loss and re-sending - that deliberately manufactures duplicates.',
    memory: 'Timeout = unknown outcome, not failure. Idempotence makes the retry safe.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-3',
    topic: 'Banking',
    evidencePhase: 'P9',
    evidenceLabel: 'Phase 9 - RF=3 / min.insync.replicas=2 proven',
    priority: '🔥🔥🔥',
    question: 'What Kafka configuration would you require for money movement?',
    simple: 'acks=all, enable.idempotence=true, RF=3, min.insync.replicas=2, plus business idempotency.',
    senior:
      'Producer: acks=all with enable.idempotence=true (which forces acks=all, retries=MAX, in-flight<=5). Topic/broker: RF=3 with min.insync.replicas=2 - PROVEN in Phase 9 to tolerate one broker loss and to correctly reject writes with NOT_ENOUGH_REPLICAS when ISR falls to 1. Consumer: manual commit after processing, plus a business idempotency key. Kafka transactions only where there is a Kafka-to-Kafka hop.',
    why: 'Each setting closes a different failure window: write durability, retry safety, broker-loss survival, and consumer replay safety.',
    production: 'Rejecting a write when durability is below the floor is far better than silently accepting an under-replicated payment event.',
    trap: 'Setting acks=all without min.insync.replicas - "all" can shrink to a single replica and still be satisfied.',
    memory: 'acks=all + idempotence + RF=3 + min.insync=2 + business idempotency.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-4',
    topic: 'Banking',
    evidencePhase: null,
    evidenceLabel: 'CONCEPTUAL - DLQ design, not executed in this lab',
    priority: '🔥🔥',
    question: 'How do you handle a payment event that repeatedly fails processing?',
    simple: 'Bounded retries, then route it to a dead-letter topic and commit the offset.',
    senior:
      'Retry in place a bounded number of times with backoff for transient failures. For a poison message, publish it to a DLQ topic with the original key, headers, failure reason and attempt count, then commit the offset so the partition is not blocked. A DLQ consumer or ops process replays it after the defect is fixed. Ordering caveat: moving a record to a DLQ breaks per-key ordering for that entity, which matters for money movement.',
    why: 'Without a DLQ, one unprocessable record blocks its whole partition indefinitely - head-of-line blocking that stalls every later record for those keys.',
    production: 'payments -> payments.DLQ with headers x-error, x-attempts, x-original-offset; alert on DLQ depth.',
    trap: 'Retrying forever in place (blocks the partition) or dropping the record silently (loses money events).',
    memory: 'Bounded retry, then DLQ - never block a partition forever, never drop silently.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-5',
    topic: 'Banking',
    evidencePhase: null,
    evidenceLabel: 'CONCEPTUAL - Outbox pattern, documented not executed',
    priority: '🔥🔥',
    question: 'The DB transaction committed but publishing to Kafka failed. How do you fix this class of bug?',
    simple: 'The Outbox pattern - write the event inside the same DB transaction, publish it asynchronously.',
    senior:
      'You cannot atomically commit a database transaction and a Kafka publish - separate systems, no shared atomicity. The Outbox pattern makes the event part of the same local DB transaction (an outbox table), then a relay (poller or CDC) publishes it to Kafka and marks it sent. Publication becomes at-least-once, which consumers already handle via idempotency.',
    why: 'It converts an impossible distributed-atomicity problem into a local-atomicity problem plus a retryable delivery problem.',
    production: 'payments and payment_outbox written in one transaction; Debezium or a poller ships outbox rows to Kafka.',
    trap: 'Claiming Kafka transactions solve this - PROVEN in Phase 10 that they never span an external database.',
    memory: 'Outbox: commit the event with the data, publish it after.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'bank-6',
    topic: 'Banking',
    evidencePhase: null,
    evidenceLabel: 'CONCEPTUAL - disaster recovery design',
    priority: '🔥',
    question: 'How would you design Kafka disaster recovery for a payments platform?',
    simple: 'Multi-AZ RF=3 first; cross-region async mirroring with a documented RPO.',
    senior:
      'Within a region: RF=3 spread across availability zones with min.insync.replicas=2, so a zone loss is survivable without data loss. Across regions: asynchronous mirroring (MirrorMaker 2 or equivalent) - it is async, so accept a non-zero RPO and design reconciliation into the payment flow. Consumer offsets must be mirrored/translated too, or failover resumes at the wrong position.',
    why: 'Synchronous cross-region replication would put inter-region latency into every acks=all write - normally unacceptable for payment throughput.',
    production: 'Document RPO/RTO explicitly and rehearse failover, including offset translation for consumer groups.',
    trap: 'Assuming cross-region mirroring is synchronous and therefore lossless - it is not.',
    memory: 'Multi-AZ for zero loss; cross-region is async with a real RPO.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'tr-1',
    topic: 'Production Troubleshooting',
    evidencePhase: 'P8',
    evidenceLabel: 'Phase 8 - lag measured rising and draining',
    priority: '🔥🔥🔥',
    question: 'Consumer lag jumped from 0 to 500,000. What do you check first?',
    simple: 'Compare producer rate against consumer rate before touching anything.',
    senior:
      'In order: (1) did producer rate spike, or did consumer throughput drop? (2) per-partition lag - uniform, or one hot partition? (3) downstream DB/API latency (low CPU with high lag means I/O wait). (4) rebalance frequency and consumer errors. (5) only then partition and consumer count as capacity levers. PROVEN in Phase 8 that lag is purely the integral of the rate difference.',
    why: 'Lag is a symptom; the same number can mean traffic growth, a slow dependency, or a rebalance loop - each with a different fix.',
    production: 'kafka-consumer-groups.sh --describe --group payment-service-group shows CURRENT/LOG-END/LAG per partition.',
    trap: 'Answering "add more consumers" first - PROVEN useless beyond partition count, and irrelevant if a slow DB is the bottleneck.',
    memory: 'Lag is a symptom. Compare rates, check per-partition, check downstream - then scale.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'tr-2',
    topic: 'Production Troubleshooting',
    evidencePhase: 'P3',
    evidenceLabel: 'Phase 6 - F5 eviction proven (alive but not polling)',
    priority: '🔥🔥🔥',
    question: 'A consumer is alive but the group keeps rebalancing. What is happening?',
    simple: 'Processing exceeds max.poll.interval.ms, so it is evicted between polls.',
    senior:
      'PROVEN in Phase 6: a consumer sleeping 15s with max.poll.interval.ms=10000 was evicted by its own heartbeat thread at exactly 10.0s, commitSync then failed, it rejoined, re-consumed the same records and looped forever. Check per-batch processing duration against max.poll.interval.ms, remembering max.poll.records multiplies it.',
    why: 'Heartbeat proves the process is alive; poll frequency proves progress. Only the second signal fails here.',
    production: 'Reduce max.poll.records, speed up the downstream call, or move heavy work off the poll thread before raising max.poll.interval.ms.',
    trap: 'Raising max.poll.interval.ms as the first fix - it hides the symptom and delays real failure detection.',
    memory: 'Consumer alive != consumer healthy. Rebalance loops are usually processing-time problems.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'tr-3',
    topic: 'Production Troubleshooting',
    evidencePhase: 'P9',
    evidenceLabel: 'Phase 9 - under-replicated partitions observed',
    priority: '🔥🔥',
    question: 'Monitoring reports UnderReplicatedPartitions > 0. Is Kafka down?',
    simple: 'No - it means reduced redundancy, not unavailability.',
    senior:
      'ISR is smaller than the replication factor. PROVEN in Phase 9: after one broker died, all partitions were under-replicated yet acks=all writes kept succeeding because ISR (2) still met min.insync.replicas (2). Investigate broker health, disk, network and replication lag - and treat it as urgent, because one more failure breaches the durability floor and writes start failing.',
    why: 'RF is a target; ISR is the live reality. The system is designed to keep serving while temporarily short of the target.',
    production: 'kafka-topics.sh --describe --under-replicated-partitions lists exactly which partitions are affected.',
    trap: 'Paging it as a full outage - or ignoring it, since sustained under-replication is one failure away from write rejection.',
    memory: 'Under-replicated = less redundancy, still serving. Fix before the next failure.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'tr-4',
    topic: 'Production Troubleshooting',
    evidencePhase: 'P8',
    evidenceLabel: 'Phase 3 + Phase 8 - partition parallelism ceiling',
    priority: '🔥🔥',
    question: 'There are 3 partitions and 10 consumer instances, and lag is still growing. What now?',
    simple: 'Seven are idle. Add partitions or fix processing speed - not more consumers.',
    senior:
      'PROVEN in Phase 3: with 3 partitions the 4th and later consumers are group members with zero partitions. Scaling instances past 3 adds nothing for this topic. Real options: increase partition count (accepting that key->partition mapping changes for existing keys), reduce per-record processing time, or fix the downstream bottleneck.',
    why: 'A partition has exactly one owner per group, so partition count is a hard ceiling on parallel consumption.',
    production: 'Size partition count for peak required parallelism up front - growing it later breaks per-key ordering continuity.',
    trap: 'Auto-scaling consumer pods on lag alone - it burns money without increasing throughput past the ceiling.',
    memory: 'Partitions are the ceiling; consumers are just capacity under it.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
  {
    id: 'idem-1',
    topic: 'Idempotency',
    evidencePhase: 'P7',
    evidenceLabel: 'Phase 7 + Phase 10 - both layers proven separately',
    priority: '🔥🔥🔥',
    question: 'Explain the difference between producer idempotence and business idempotency.',
    simple: 'Producer idempotence protects Producer->Kafka. Business idempotency protects Kafka->App->DB.',
    senior:
      'Producer idempotence is broker-side dedup of retried sends using PID + epoch + per-partition sequence (PROVEN Phase 7: ProducerId 3007, epoch 0). It knows nothing about consumer replay. Business idempotency is an application/database concern - a durable uniquely-keyed check (payment_id) so re-processing the same event produces no second side effect (PROVEN Phase 10 T7).',
    why: 'They protect two different hops with two different failure modes; neither mechanism can see the other hop.',
    production: 'A payment pipeline needs both: enable.idempotence=true on the producer AND a payment_id uniqueness constraint in the DB.',
    trap: 'Saying "we enabled idempotence so duplicates are impossible" - the single most common exactly-once mistake.',
    memory: 'Producer idempotence != business idempotency. Different hops, different fixes.',
    followUps: DEFAULT_FOLLOW_UPS,
  },
];

export const QUESTION_BANK: BankQuestion[] = [
  ...NEW_QUESTIONS,
  ...P3_RETOPICED,
  ...P7_BANK,
  ...P8_BANK,
  ...P9_BANK,
  ...P10_RETOPICED,
];

export function questionsByTopic(topic: Topic | 'All'): BankQuestion[] {
  return topic === 'All' ? QUESTION_BANK : QUESTION_BANK.filter((q) => q.topic === topic);
}

export function availableTopics(): Topic[] {
  return TOPICS.filter((t) => QUESTION_BANK.some((q) => q.topic === t));
}
