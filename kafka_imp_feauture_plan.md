# Kafka Learning Lab — Implemented Features, Test Plan & Simulation Improvements

Status as of this document: single-broker KRaft Kafka + Kafbat UI running under `setup/compose`. This file tracks what has actually been built and verified in this repository (not what Kafka can theoretically do), gives a concrete test plan for each feature, and lists what's missing to widen the simulation.

Branch: `kafka-learning-lab`. Environment in use: `setup/compose/docker-compose.yaml`.

---

## 1. Feature Inventory — What Is Actually Implemented

| # | Feature | Status | Where configured | Verified how |
|---|---|---|---|---|
| 1 | Single-broker KRaft Kafka | ✅ Implemented | `setup/compose/docker-compose.yaml` (`kafka1` service, `apache/kafka:3.8.1`) | `docker compose ps` shows `Up`; broker log shows `Kafka Server started` |
| 2 | Dual-listener networking (host + container) | ✅ Implemented | Same file, `KAFKA_LISTENERS` / `KAFKA_ADVERTISED_LISTENERS` env vars | `kafka-broker-api-versions.sh` run independently against `localhost:9092` (from inside container, and from a separate `--network host` container) and `kafka:29092` (from inside container) — both returned API version lists |
| 3 | Kafbat UI integration | ✅ Implemented | `kafbat-ui` service in same compose file | Log line `Metrics updated for cluster: local`; UI reachable at `http://localhost:8090` |
| 4 | Topic creation with explicit partition count | ✅ Implemented (1 topic) | `kafka-topics.sh --create --topic orders --partitions 3` | `kafka-topics.sh --list` returns `orders`; Kafbat Topics view |
| 5 | Consumer group (implicit creation via `group.id`) | ✅ Implemented (1 group, empty state) | `kafka-console-consumer.sh --group payment-service` | `kafka-consumer-groups.sh --list` returns `payment-service`; visible in Kafbat Consumers view |
| 6 | Message production | ❌ Not done | — | Topic `orders` has 0 messages; offsets at 0/0 on all 3 partitions |
| 7 | Message consumption with committed offsets | ❌ Not done | — | No commits exist yet — nothing produced |
| 8 | Consumer lag observation | ❌ Not done | — | Requires #6 + a deliberately slow consumer |
| 9 | Rebalancing (multi-consumer, same group) | ❌ Not done | — | Requires 2+ live consumer processes simultaneously |
| 10 | Producer key → partition assignment | ❌ Not done | — | No Java/CLI producer built yet |
| 11 | Java `KafkaProducer` / `KafkaConsumer` code | ❌ Not written | `kafkaplayground` has a consumer skeleton (`Day01KafkaConsumer.java`) only, no producer | — |
| 12 | acks / retries / idempotent producer | ❌ Not tested | — | Needs #10 first |
| 13 | Replication / ISR / leader election | ❌ Not tested | `kafka-cluster/` exists but is **not started** | Deliberately deferred — single broker can't demonstrate this |
| 14 | Kafka Connect / Debezium CDC | ❌ Not tested | `kafka-connect-example/` exists but is **not started** | Deliberately deferred |
| 15 | Spring Kafka (`KafkaTemplate`, `@KafkaListener`, error handling, DLT) | ❌ Not built | — | Deferred to later session |
| 16 | Kafka Streams | ❌ Not built | — | Deferred to later session |
| 17 | Schema Registry / schema evolution | ❌ Not present | — | No service configured anywhere in repo |

**Honest summary:** infrastructure and topic/partition mechanics are solid and verified. Everything downstream of "a message actually flows through the system" is untested — that's the real gap, not a documentation gap.

---

## 2. Test Plan

Each test below states objective, precondition, exact steps, expected result, and which Kafka concept it proves. Tests are grouped in the order they should be run — later tests assume earlier ones pass.

### 2.1 Infrastructure Tests

**T1 — Broker reachable on both listeners**
- Precondition: `docker compose up -d` completed, both containers `Up`.
- Steps:
  ```
  docker exec kafka /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092
  docker exec kafka /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server kafka:29092
  ```
- Expected: both return a broker API version list, exit code 0.
- Proves: listener/advertised-listener configuration is correct for both host and container clients.

**T2 — Kafbat sees live cluster state**
- Steps: open `http://localhost:8090`, check Brokers tab.
- Expected: 1 broker, node id `1`, status not offline.
- Proves: Kafbat's `KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:29092` is correctly resolving via Docker DNS.

**T3 — State survives container restart**
- Steps: `docker compose stop` then `docker compose up -d`, then `kafka-topics.sh --list`.
- Expected: previously created topics still present.
- Proves: the bind-mounted `./data` volume is the actual persistence mechanism, not container lifetime.

### 2.2 Topic & Partition Tests

**T4 — Topic creation with explicit partition count**
- Steps: `kafka-topics.sh --create --topic <name> --partitions N`
- Expected: `Created topic <name>.`; `--describe` shows N partitions, each with Leader=1, Replicas=[1], Isr=[1] (single broker).
- Proves: partition count is caller-controlled, not automatic.

**T5 — Partition count cannot shrink**
- Steps: attempt `kafka-topics.sh --alter --topic orders --partitions 2` (fewer than current 3).
- Expected: command fails with an explicit error.
- Proves: partition count is monotonic — an architectural decision, not a runtime dial. (Not yet run — add to backlog.)

**T6 — Partition count can grow, but changes key→partition mapping**
- Steps: `kafka-topics.sh --alter --topic orders --partitions 5`, then re-run a keyed producer test (T9) with the same keys as before.
- Expected: some keys now land on different partition numbers than before the change.
- Proves: default partitioner's key→partition mapping is a function of *current* partition count — increasing partitions breaks the "same key always same partition" guarantee for existing keys. (Not yet run — add to backlog.)

### 2.3 Producer Tests (backlog — none run yet)

**T7 — Basic produce/consume round trip**
- Steps: produce N messages via `kafka-console-producer.sh --topic orders`; consume via `kafka-console-consumer.sh --topic orders --from-beginning`.
- Expected: all N messages read back, in the order sent per partition.
- Proves: basic write path (`ProducerRecord` → partition → append) and read path (`poll()` → `ConsumerRecord`) both function.

**T8 — Unkeyed messages spread round-robin (or sticky-batch) across partitions**
- Steps: produce 20 unkeyed messages, inspect partition distribution in Kafbat.
- Expected: messages distributed across all 3 partitions, not concentrated on one.
- Proves: default partitioner behavior without a key.

**T9 — Keyed messages are sticky to one partition**
- Steps: produce `customer-101→A`, `customer-102→B`, `customer-101→C`, `customer-103→D`; check partition per key in Kafbat.
- Expected: both `customer-101` messages land on the same partition; different keys may or may not share a partition, but a given key is always consistent.
- Proves: `hash(key) % partitions` determinism, and *why* it matters (per-key ordering guarantee).

**T10 — acks=0 vs acks=1 vs acks=all latency/durability trade-off**
- Steps: produce the same batch of messages three times, once per `acks` value, measuring producer-side latency each time; for `acks=all`, kill the broker mid-send (single broker → send should fail/block, since there's no replica to satisfy `acks=all` once the leader itself is gone — actually with RF=1, acks=all behaves like acks=1, this is itself worth observing and documenting as a limitation of the single-broker environment).
- Expected: `acks=0` fastest but no delivery confirmation; `acks=1` confirms once leader writes; `acks=all` on a single-broker (RF=1) cluster is observably *no different* from `acks=1` — a discovery worth documenting, not assuming.
- Proves: acks trade-off, and the specific limitation that single-broker setups can't demonstrate `acks=all`'s real value (needs replication factor ≥ 2 — see Section 3).

**T11 — Idempotent producer prevents duplicate on retry**
- Steps: enable `enable.idempotence=true`, force a retry (e.g. via a transient network blip or broker restart mid-send), then check for duplicate offsets/messages.
- Expected: no duplicate messages despite retry.
- Proves: idempotent producer's sequence-number deduplication at the broker.

### 2.4 Consumer & Consumer Group Tests

**T12 — Consumer group created implicitly on first connect**
- Status: ✅ already run this session (`payment-service` group, confirmed via `kafka-consumer-groups.sh --list`).
- Proves: groups are a side effect of consumption, not a provisioned resource.

**T13 — Partitions split across multiple consumers in same group**
- Steps: start 3 consumers with `--group orders-group` against the 3-partition `orders` topic; check partition ownership in Kafbat.
- Expected: each consumer owns exactly 1 partition, no overlap.
- Proves: group coordinator's partition assignment.

**T14 — 4th consumer in a 3-partition group sits idle**
- Steps: start a 4th consumer in the same group.
- Expected: 4th consumer shown as a group member but with zero partitions assigned.
- Proves: partition count is the hard ceiling on consumer parallelism within one group — cannot be worked around by adding more consumers.

**T15 — Two independent groups read the same topic independently**
- Steps: run `payment-service` and `analytics-service` groups against `orders` simultaneously, produce messages, verify both groups receive every message independently.
- Expected: both groups' offsets advance independently; one group's commits don't affect the other's read position.
- Proves: Kafka's group isolation model — the direct answer to the standing interview question from the previous session.

### 2.5 Offset & Lag Tests

**T16 — Manual commit vs auto-commit offset-loss scenario**
- Steps: two consumers, one `enable.auto.commit=true` (interval 5s), one manual `commitSync()` after processing; kill each mid-batch (after processing but before the next commit boundary), restart, observe replay/loss.
- Expected: auto-commit consumer may re-read already-processed messages (if killed before its next auto-commit fires) or skip unprocessed ones (if auto-commit fired before processing finished); manual-commit consumer resumes exactly where it left off.
- Proves: commit strategy directly determines at-least-once vs at-most-once risk windows.

**T17 — Lag = log end offset − committed offset, observed live**
- Steps: fast producer loop + consumer with artificial `Thread.sleep(5000)` per record; watch Kafbat's lag column climb, then stop the producer and watch lag drain to 0.
- Expected: lag visibly increases while producer > consumer rate, drains once producer stops.
- Proves: lag is a *derived*, real-time metric, not a static config value.

### 2.6 Rebalancing Tests

**T18 — Consumer death triggers rebalance and partition reassignment**
- Steps: 3 consumers on 3 partitions, kill one process (not graceful shutdown — `kill -9` equivalent), observe group state in Kafbat.
- Expected: group briefly shows `PreparingRebalance` / `CompletingRebalance`, then `Stable` with the dead consumer's partition reassigned to a survivor.
- Proves: `session.timeout.ms` / heartbeat-based failure detection and the rebalance protocol.

**T19 — Slow processing (not death) also triggers rebalance if `max.poll.interval.ms` exceeded**
- Steps: set `max.poll.interval.ms=10000`, add processing time >10s per `poll()` batch.
- Expected: consumer gets kicked from the group even though its process is alive and heartbeating — a distinct failure mode from T18.
- Proves: liveness (heartbeat) and progress (poll interval) are tracked separately — a common interview trap.

### 2.7 Reliability Tests — require `kafka-cluster` (not started yet)

**T20 — Leader election on broker failure**
- Precondition: switch to `kafka-cluster/docker-compose.yaml` (3 brokers), create a topic with RF=3.
- Steps: kill the leader broker's container, observe new leader election via `kafka-topics.sh --describe`.
- Expected: a surviving broker becomes leader within seconds; ISR shrinks by 1.
- Proves: leader election mechanics, the actual value of `acks=all` (finally demonstrable with RF≥2).

**T21 — `min.insync.replicas` blocks writes when ISR too small**
- Steps: set `min.insync.replicas=2` on a RF=3 topic, kill 2 of 3 brokers, attempt a produce with `acks=all`.
- Expected: produce fails/blocks with `NotEnoughReplicasException`.
- Proves: the durability-vs-availability trade-off `min.insync.replicas` encodes.

### 2.8 Kafka Connect / CDC Tests — require `kafka-connect-example` (not started yet)

**T22 — Debezium captures a row insert as a Kafka message**
- Precondition: switch to `kafka-connect-example`, register `debezium-orders-source.json`.
- Steps: `POST /api/orders` on order-service, check `orders-server.public.orders` topic for the resulting message.
- Expected: message appears within seconds of the DB commit.
- Proves: CDC log-based capture (WAL tailing), not polling.

**T23 — JDBC sink and S3 sink both receive the same event independently**
- Steps: after T22, check `analytics-db.order_events` table and MinIO bucket `orders-events`.
- Expected: both populated from the same source event, independently, matching the multi-group-consumption pattern from T15 but at the connector level.

---

## 3. Improvements Needed to Widen the Simulation

These are gaps discovered empirically this session, not theoretical wishlist items.

### 3.1 Fix the broken base image (real defect, already worked around)
`setup/compose` originally pointed at `suhail50/kafka`, which publishes **only `linux/arm64`** — confirmed via `docker manifest inspect`, fails outright on any amd64 host. Already worked around by switching to `apache/kafka:3.8.1` in this branch. Recommend either: (a) keep the `apache/kafka` image permanently and update `README.md` + `setup/image/DockerFile` references accordingly, or (b) if the custom image is wanted for other reasons, rebuild it as a multi-arch manifest (`docker buildx build --platform linux/amd64,linux/arm64`) and republish. Leaving this unresolved means anyone else cloning the repo on a non-ARM machine hits the same failure blind.

### 3.2 No repeatable reset mechanism
State persists across `docker compose stop/up` (bind-mounted `./data`), which is good for continuity but bad for experiments that need a clean slate (e.g. re-running T4 partition-count tests, or T20 leader-election tests that leave a cluster in a modified state). Add a `reset.sh` (or documented command) that does `docker compose down -v && rm -rf ./data/*` for a genuine clean start, separate from a normal stop/start.

### 3.3 No producer exists anywhere in the repo
Confirmed earlier in this session — `kafkaplayground` has a consumer skeleton only. Every producer-side test (T7–T11) is currently blocked on this. This is the single highest-priority code gap: a ~40-line `OrderProducer.java` unblocks 5 of the 23 tests above immediately.

### 3.4 No scripted verification — every test above is manual
For a "test plan" to be re-runnable rather than a one-time manual checklist, worth adding a small shell script (`setup/compose/verify.sh`) that runs T1–T4 (the infrastructure + topic tests) non-interactively and exits non-zero on failure — useful as a smoke test every time the environment is brought up, catching regressions like the image-platform issue in 3.1 automatically instead of discovering them mid-experiment.

### 3.5 No metrics/observability beyond Kafbat's UI
Kafbat shows point-in-time state well but nothing time-series (lag *trend* over the course of T17, for instance, is only visible by watching the UI live, not reviewable after the fact). If deeper performance work is wanted later (Session 6 acks/throughput testing, Session 13-equivalent perf testing), consider adding a JMX exporter + lightweight Prometheus, matching the pattern already used in `kafka-connect-example`'s absence of one — but treat this as a Stage 6 concern, not urgent now.

### 3.6 Single-broker environment structurally cannot prove several "completed" claims
Section 2.3's T10 note applies broadly: `acks=all`, `min.insync.replicas`, ISR shrink/grow, and leader election are **impossible to meaningfully test** until `kafka-cluster` (3-broker) is brought up. This isn't a gap to fix in `setup/compose` — it's correctly out of scope there — but it means Section 1's "implemented" list will plateau until that environment is deliberately started for Stage 3, per the existing session plan.

---

## 4. Immediate Next Actions (ordered)

1. Write `OrderProducer.java` in `kafkaplayground` (unblocks T7–T11).
2. Run T7–T9 (basic produce/consume, key→partition) — natural continuation of Experiment 1/2 already in progress.
3. Run T13–T15 (consumer group scaling, idle 4th consumer, independent groups) — Experiment 3 from the session plan.
4. Run T16–T17 (commit strategy, lag) — Experiment 4.
5. Run T18–T19 (rebalancing) — Experiment 5.
6. Only after 1–5: switch to `kafka-cluster` for T20–T21 (Stage 3, replication/ISR).
7. Only after Stage 3: switch to `kafka-connect-example` for T22–T23 (Stage 5, CDC).
8. Address Section 3.1 (image fix) and 3.2 (reset script) opportunistically — neither blocks learning, both reduce friction.
