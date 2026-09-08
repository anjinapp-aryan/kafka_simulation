---
name: run-kafka-lab
description: Start, build, drive, and smoke-test the Kafka learning lab (single-broker KRaft Kafka + Kafbat UI + kafkaplayground Java experiments). Use when asked to run, start, launch, build, test, or verify the Kafka lab, produce/consume against it, or check that Kafka/Kafbat is healthy.
---

# Kafka Learning Lab

Paths below are relative to the repo root (`<repo>/`), not this skill directory.

This is not a single running app — it's a Docker Compose Kafka broker + Kafbat UI, plus a Maven module (`kafkaplayground`) of small standalone Java classes, each run manually to prove one Kafka behavior against the live broker. The driver script wraps the exact sequence a human would type: start the broker, compile, run a producer, run a consumer, cross-check via Kafka CLI.

## Run (agent path)

```bash
bash .claude/skills/run-kafka-lab/driver.sh up      # start Docker Desktop if needed, start Kafka+Kafbat, wait for broker
bash .claude/skills/run-kafka-lab/driver.sh build   # compile kafkaplayground, regenerate classpath file (cp.txt)
bash .claude/skills/run-kafka-lab/driver.sh smoke   # produce 3 tagged records, consume them, print broker-verified evidence
bash .claude/skills/run-kafka-lab/driver.sh status  # list containers + topics
bash .claude/skills/run-kafka-lab/driver.sh down    # stop containers, data preserved
bash .claude/skills/run-kafka-lab/driver.sh reset   # stop containers AND wipe all topic/offset data (destructive)
```

Run these from anywhere — the script resolves paths from its own location. Requires Git Bash (MSYS) on Windows.

`smoke`'s real evidence is its **last block**: a `kafka-consumer-groups.sh --describe` showing `LAG=0` for the freshly-created group, pulled independently of the Java app's own log output. That's the thing to check, not the volume of log lines above it.

Kafbat UI (visual): http://localhost:8090

## Running one specific experiment class directly

After `up` + `build`, invoke any experiment class by hand:

```bash
cd kafkaplayground
java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day02.OrderProducer keyed
java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day03.GroupMemberConsumer C1 orders-group
java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day05.OffsetSemanticsConsumer my-group commit-after-process
```

See each class's file header for its exact argument signature — they differ per experiment (`day02/PollConsumer` vs `day03/GroupMemberConsumer` vs `day05/OffsetSemanticsConsumer` all take different args).

## Run (human path)

`docker compose up -d` from `setup/compose/`, then open http://localhost:8090. Same thing `driver.sh up` does, without the readiness wait or the classpath/build step.

## Gotchas

- **`docker-credential-desktop: executable file not found`** — happens right after Docker Desktop (re)starts, before its `resources/bin` is on PATH for this shell. The driver prepends it itself (`PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"`); if calling `docker compose` directly, do the same.
- **`docker exec kafka /opt/...` rewrites the path to `C:/Program Files/Git/opt/...` and fails** — Git Bash's MSYS path conversion mangles container paths that look like Unix absolute paths. Prefix with `MSYS_NO_PATHCONV=1`. The driver's `kexec` helper already does this.
- **A brand-new consumer group's first `poll()` can take ~3s even with data waiting** — `group.initial.rebalance.delay.ms` defaults to 3000ms so the coordinator waits for other potential joiners before finalizing assignment. A bounded consumer with a short "give up after N empty polls" loop can exit before ever getting assigned. `day05/OffsetSemanticsConsumer` retries polling up to 10× (10s) specifically for this.
- **`grep`-filtering a multi-threaded Kafka client's log output is unreliable** — the consumer/producer JVMs interleave INFO logs from multiple threads (`main`, `kafka-producer-network-thread`, coordinator heartbeat thread); a `grep` meant to show "just the interesting lines" may pass through everything anyway. Verified in `driver.sh smoke`: don't trust the grep to have trimmed anything — read the final `kafka-consumer-groups.sh --describe` block instead, which is unfiltered and is the actual evidence.
- **Every consumer group in this lab is effectively "fresh history from offset ~0"** — because every experiment across every phase produced onto the same 3-partition `orders` topic, any brand-new group with `auto.offset.reset=earliest` (which all the lab's consumers use) will sweep the *entire* accumulated history first, not just what you just produced. This is expected, not a bug — look for your specific tagged values in the output, don't expect a small, clean batch.
- **Docker Desktop stops on machine restart/sleep but leaves containers stopped, not removed** — `driver.sh up` (`docker compose up -d`) brings them back with the bind-mounted `./data` intact; it is not a fresh cluster each time.
- **`suhail50/kafka` (referenced in the top-level `README.md` and `kafka-cluster/docker-compose.yaml`) is `linux/arm64`-only** — fails with "no matching manifest" on an amd64 host. `setup/compose/` (what this skill drives) already uses `apache/kafka:3.8.1` instead; this only matters if you go looking at `kafka-cluster/`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `driver.sh up` hangs at "Waiting for broker..." past ~30s | Docker Desktop engine may still be initializing after a cold start; the script's own `ensure_docker_engine` already waits up to 240s for `docker info` to respond — if it still times out, check `docker info` manually and Docker Desktop's own window for errors |
| `smoke` fails with `Run '... build' first` | Run `driver.sh build` — it needs `kafkaplayground/cp.txt`, generated by `mvn dependency:build-classpath`, which isn't committed |
| `kafka-topics.sh --create` reports the topic already exists | Expected — `smoke` uses `--if-not-exists`; this is not an error |

## Driver

`.claude/skills/run-kafka-lab/driver.sh` — subcommands `up`, `down`, `reset`, `status`, `build`, `smoke`. All verified in this session against the live broker (see command outputs this session: `up` reported both containers `Running` and broker-ready; `build` compiled clean; `smoke` produced 3 `SMOKE-<timestamp>` records and confirmed `LAG=0` for the resulting group via CLI; `status` listed both containers and the `orders`/`__consumer_offsets` topics).
