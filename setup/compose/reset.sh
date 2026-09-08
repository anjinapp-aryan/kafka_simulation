#!/bin/sh
# Full reset of the Stage 1 learning lab: removes containers, network, and
# all Kafka log data (topics, partitions, offsets, consumer groups — everything).
# Use this when an experiment needs a genuinely clean broker, not a restart
# (a plain `docker compose stop && docker compose up -d` keeps all data,
# by design, and does not do what this script does).
#
# Usage: run from setup/compose/
#   ./reset.sh

set -e
cd "$(dirname "$0")"

echo "Stopping and removing containers + network..."
docker compose down

echo "Wiping Kafka log data..."
rm -rf ./data/*

echo "Reset complete. Bring the environment back up with:"
echo "  docker compose up -d"
