#!/bin/bash
# Driver for the Kafka learning lab (setup/compose + kafkaplayground).
# Run from anywhere; paths are resolved relative to this script.
# Requires: Git Bash (MSYS) on Windows, Docker Desktop, Maven wrapper in kafkaplayground.
set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
COMPOSE_DIR="$REPO_ROOT/setup/compose"
APP_DIR="$REPO_ROOT/kafkaplayground"
DOCKER_BIN="/c/Program Files/Docker/Docker/resources/bin"

cmd="${1:-help}"

ensure_docker_engine() {
  if docker info >/dev/null 2>&1; then return; fi
  echo "Docker engine not responding, starting Docker Desktop..."
  powershell -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" >/dev/null 2>&1
  for i in $(seq 1 24); do
    docker info >/dev/null 2>&1 && { echo "Docker engine ready after ${i}0s"; return; }
    sleep 10
  done
  echo "TIMEOUT waiting for Docker engine" >&2
  exit 1
}

kexec() {
  MSYS_NO_PATHCONV=1 docker exec kafka /opt/kafka/bin/"$@"
}

case "$cmd" in
  up)
    ensure_docker_engine
    cd "$COMPOSE_DIR"
    PATH="$DOCKER_BIN:$PATH" docker compose up -d
    echo "Waiting for broker..."
    for i in $(seq 1 15); do
      kexec kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1 && { echo "Broker ready."; break; }
      sleep 2
    done
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo "Kafbat UI: http://localhost:8090"
    ;;

  down)
    cd "$COMPOSE_DIR"
    PATH="$DOCKER_BIN:$PATH" docker compose stop
    echo "Stopped (data preserved in ./data). Use 'reset' to wipe."
    ;;

  reset)
    cd "$COMPOSE_DIR"
    PATH="$DOCKER_BIN:$PATH" ./reset.sh
    ;;

  status)
    cd "$COMPOSE_DIR"
    docker compose ps --format "table {{.Name}}\t{{.Status}}"
    echo "--- topics ---"
    kexec kafka-topics.sh --bootstrap-server localhost:9092 --list
    ;;

  build)
    cd "$APP_DIR"
    ./mvnw.cmd -q compile
    ./mvnw.cmd -q dependency:build-classpath -Dmdep.outputFile=cp.txt
    echo "Compiled. Classpath written to cp.txt"
    ;;

  smoke)
    # End-to-end proof of life: ensures topic exists, produces 3 identifiable
    # records, consumes them back with a fresh group, and prints partition/
    # offset evidence pulled independently from the broker (not just app logs).
    cd "$COMPOSE_DIR"
    kexec kafka-topics.sh --bootstrap-server localhost:9092 --topic orders --create --partitions 3 --if-not-exists
    cd "$APP_DIR"
    [ -f cp.txt ] || { echo "Run '$0 build' first"; exit 1; }
    TAG="SMOKE-$(date +%s)"
    echo "Producing 3 records with prefix $TAG ..."
    java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day04.IdentifiedOrderProducer "$TAG" 3 2>&1 | grep "value="
    echo "Consuming with fresh group smoke-verify ..."
    java -cp "target/classes;$(cat cp.txt)" com.suhail.kafkaplayground.day05.OffsetSemanticsConsumer "smoke-verify-$TAG" commit-after-process 2>&1 | grep -E "$TAG|COMMITTED"
    echo "--- broker-side confirmation (independent of the app log above) ---"
    kexec kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group "smoke-verify-$TAG"
    ;;

  *)
    echo "Usage: $0 {up|down|reset|status|build|smoke}"
    echo "  up     - start Docker Desktop if needed, start Kafka+Kafbat, wait for broker"
    echo "  down   - stop containers, keep data"
    echo "  reset  - stop containers AND wipe all topic/offset data"
    echo "  status - list containers and topics"
    echo "  build  - compile kafkaplayground, regenerate classpath file"
    echo "  smoke  - produce+consume a real batch, print broker-verified evidence"
    ;;
esac
