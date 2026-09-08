# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A hands-on Kafka learning lab. Java classes under `kafkaplayground` are **experiments**, not an application — each one isolates a single Kafka behavior (partitioning, poll batching, group assignment, commit timing) and is run manually against a live broker, with results cross-checked via Kafka CLI. `kafka_imp_feauture_plan.md` tracks which behaviors have been verified, the numbered test plan (T1–T23), and known gaps.

## Three independent Kafka environments

Never start more than one at a time unless deliberately isolating ports — they collide.

| Environment | Path | Shape | Use for |
|---|---|---|---|
| Single broker + Kafbat UI | `setup/compose/` | 1 broker, KRaft, RF=1, `apache/kafka:3.8.1` | Default. Topics, producers, consumers, groups, offsets, lag |
| 3-broker cluster | `kafka-cluster/` | 3 brokers, KRaft, `offsets.topic.replication.factor=3` | Replication, ISR, leader election, `min.insync.replicas` — impossible on RF=1 |
| Connect/CDC stack | `kafka-connect-example/` | Kafka + 2× Postgres + MinIO + Kafka Connect + 2 Spring services | Debezium CDC, JDBC/S3 sink connectors |

The single-broker and 3-broker environments configure the broker **differently**:
- `setup/compose/` configures via `KAFKA_*` **environment variables** in `docker-compose.yaml`. Its `properties/server.properties` still exists but is **no longer mounted** — editing it has no effect.
- `kafka-cluster/` configures via mounted `properties/serverN.properties` files.

## The listener model (most important architectural detail)

The single-broker setup exposes two listeners on the same broker, and which port a client dials determines which address it gets handed back in the metadata response:

```
port 9092  → listener PLAINTEXT → advertised as localhost:9092  → for host-side Java clients
port 29092 → listener DOCKER    → advertised as kafka:29092     → for containers (Kafbat) on compose_default
```

A container that bootstraps against `localhost:9092` completes the handshake, then fails on reconnect because `localhost` resolves to itself. Kafbat must use `kafka:29092`. The 3-broker cluster uses the same idea with `INTERNAL://kafkaN:9092` and `EXTERNAL://localhost:808N`.

## Commands

Start/stop the default environment (from `setup/compose/`):

```bash
docker compose up -d
docker compose ps
docker compose stop          # keeps all data (bind-mounted ./data)
./reset.sh                   # destroys containers AND wipes all topic/offset data
```

Kafbat UI: http://localhost:8090

Build the experiments:

```bash
cd kafkaplayground
./mvnw.cmd -q compile
./mvnw.cmd -q dependency:build-classpath -Dmdep.outputFile=cp.txt   # regenerate after dependency changes
```

Run a single experiment (preferred over `mvn exec:java` — faster, and gives a real PID for multi-consumer experiments):

```bash
cd kafkaplayground
java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day02.OrderProducer keyed
java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day03.GroupMemberConsumer C1 orders-group
```

Kafka CLI (`MSYS_NO_PATHCONV=1` is **required** on Git Bash or the container path gets rewritten to a Windows path):

```bash
MSYS_NO_PATHCONV=1 docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --topic orders --describe
MSYS_NO_PATHCONV=1 docker exec kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group <g> --members --verbose
MSYS_NO_PATHCONV=1 docker exec kafka /opt/kafka/bin/kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic orders --time -1
```

## Experiment classes

Each `dayNN` package corresponds to a lab phase; later ones build on earlier evidence.

- `day01/Day01KafkaConsumer` — original repo consumer. Subscribes to **`order-events`**, not `orders`; not part of the lab flow.
- `day02/OrderProducer` — args: `t7` | `unkeyed` | `keyed`. Callback logs partition+offset per record.
- `day02/PollConsumer` — args: `<group.id> <auto.offset.reset> [maxEmptyPolls]`. Logs batch size to make `poll()` batching visible.
- `day03/GroupMemberConsumer` — args: `<consumerName> <group.id>`. Long-lived, logs assignment changes via `ConsumerRebalanceListener`. Run several concurrently for group experiments.
- `day04/IdentifiedOrderProducer` — args: `<prefix> <count>`. Traceable records per experiment.
- `day05/OffsetSemanticsConsumer` — args: `<group.id> <mode>` where mode is `no-commit` | `commit-after-process` | `commit-before-crash` | `process-then-crash`. Simulates crashes by controlling whether `commitSync()` runs, not by killing the process.

Consumers that bound their run wait several empty polls before exiting: a brand-new group's first join takes ~3s because of `group.initial.rebalance.delay.ms`, so short exit thresholds race it and see nothing.

## Windows / Git Bash gotchas

- `MSYS_NO_PATHCONV=1` before every `docker exec ... /opt/...` command.
- If `docker compose` fails with `docker-credential-desktop: executable file not found`, prefix with `PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"`.
- `$!` does **not** return a usable Windows PID for backgrounded JVMs. Use `jps -l`, or `Get-CimInstance Win32_Process -Filter "Name='java.exe'"` and match on `CommandLine`. Each launched JVM may show two PIDs (javapath shim + real JVM); kill both.
- Docker Desktop stops on reboot and leaves containers stopped but not removed — `docker compose up -d` restarts them with data intact.

## Git remotes

- `origin` → `suhailgupta/kafka` (upstream this was cloned from; `main` tracks it — do not push lab work here)
- `mine` → `anjinapp-aryan/kafka_simulation` (lab work lives on branch `kafka-learning-lab`)

An automated Java-upgrade tool has previously created `appmod/java-upgrade-*` branches in this repo and stashed uncommitted work when switching to them. Check `git stash list` and `git branch` before assuming files were lost.

## Broker image note

`suhail50/kafka` (referenced in `README.md` and `kafka-cluster/docker-compose.yaml`) publishes **only `linux/arm64`** and fails to pull on amd64 hosts. `setup/compose/` was switched to `apache/kafka:3.8.1` for this reason; `kafka-cluster/` still references it and will need the same treatment before it can run on amd64.
