// Domain state for the Step 2 topology simulation. Deliberately independent
// of React Flow's node/edge shape - the diagram is derived FROM this, never
// the other way around.

export interface SimulatedRecord {
  simulationOffset: number; // NOT a real Kafka offset - see README note below
  key: string | null;
  value: string;
  partitionId: string;
}

export interface KafkaPartition {
  id: string; // "P0" | "P1" | "P2"
  index: number;
  records: SimulatedRecord[];
  currentPosition: number; // in-memory consumer progress (SIMULATION)
  committedOffset: number; // durable restart bookmark (SIMULATION)
}

export interface KafkaConsumer {
  id: string; // "C1", "C2", ...
  assignedPartitionIds: string[];
}

export interface KafkaConsumerGroup {
  id: string;
  consumers: KafkaConsumer[];
}

export interface KafkaTopologyState {
  producerName: string;
  topicName: string;
  partitions: KafkaPartition[];
  consumerGroup: KafkaConsumerGroup;
  nextSimulationOffsetByPartition: Record<string, number>;
}

export function createDefaultTopology(): KafkaTopologyState {
  const partitions: KafkaPartition[] = [
    { id: 'P0', index: 0, records: [], currentPosition: 0, committedOffset: 0 },
    { id: 'P1', index: 1, records: [], currentPosition: 0, committedOffset: 0 },
    { id: 'P2', index: 2, records: [], currentPosition: 0, committedOffset: 0 },
  ];
  return {
    producerName: 'OrderProducer',
    topicName: 'orders',
    partitions,
    consumerGroup: {
      id: 'orders-group',
      consumers: [
        { id: 'C1', assignedPartitionIds: [] },
        { id: 'C2', assignedPartitionIds: [] },
        { id: 'C3', assignedPartitionIds: [] },
      ],
    },
    nextSimulationOffsetByPartition: { P0: 0, P1: 0, P2: 0 },
  };
}

/**
 * Range-style assignment: contiguous partition blocks, extras go to the
 * earliest consumers. This is a SIMULATION that reproduces the exact
 * outcomes proven in Phase 3 (1/2/3/4 consumers over 3 partitions) - it is
 * not the Kafka RangeAssignor source, just the same resulting shape.
 */
export function assignPartitions(
  partitionIds: string[],
  consumerIds: string[],
): Record<string, string[]> {
  const assignment: Record<string, string[]> = {};
  for (const c of consumerIds) assignment[c] = [];

  if (consumerIds.length === 0) return assignment;

  const perConsumer = Math.floor(partitionIds.length / consumerIds.length);
  const extra = partitionIds.length % consumerIds.length;

  let partitionCursor = 0;
  consumerIds.forEach((consumerId, i) => {
    const count = perConsumer + (i < extra ? 1 : 0);
    for (let n = 0; n < count; n++) {
      assignment[consumerId].push(partitionIds[partitionCursor]);
      partitionCursor++;
    }
  });

  return assignment;
}

export function applyAssignment(topology: KafkaTopologyState): KafkaTopologyState {
  const partitionIds = topology.partitions.map((p) => p.id);
  const consumerIds = topology.consumerGroup.consumers.map((c) => c.id);
  const assignment = assignPartitions(partitionIds, consumerIds);
  return {
    ...topology,
    consumerGroup: {
      ...topology.consumerGroup,
      consumers: topology.consumerGroup.consumers.map((c) => ({
        ...c,
        assignedPartitionIds: assignment[c.id] ?? [],
      })),
    },
  };
}

export function idleConsumerCount(topology: KafkaTopologyState): number {
  return topology.consumerGroup.consumers.filter((c) => c.assignedPartitionIds.length === 0)
    .length;
}

export function parallelismCeiling(topology: KafkaTopologyState): number {
  return topology.partitions.length;
}

/**
 * SIMULATION ONLY - a deterministic string hash mod partition count.
 * This mirrors Kafka's promise ("same key -> same partition") but does NOT
 * reproduce the real client's murmur2-based partitioner. Labeled as such
 * everywhere it is shown in the UI.
 */
export function simulateKeyedRouting(key: string, partitionCount: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % partitionCount;
}

/**
 * SIMULATION ONLY - simplified round-robin for unkeyed records. Phase 1's
 * real evidence (proven, see Evidence panel) showed sticky-per-batch
 * behavior instead; this UI does not attempt to reproduce that fidelity and
 * is labeled "Illustrative" wherever shown.
 */
export function simulateUnkeyedRouting(sendCount: number, partitionCount: number): number {
  return sendCount % partitionCount;
}

// ---- Step 3: offsets, lag, rebalance/failure -------------------------------

export function logEndOffset(topology: KafkaTopologyState, partitionId: string): number {
  return topology.nextSimulationOffsetByPartition[partitionId] ?? 0;
}

/** LAG = LOG-END - COMMITTED, tracked per partition (never a single global number). */
export function partitionLag(topology: KafkaTopologyState, partition: KafkaPartition): number {
  return logEndOffset(topology, partition.id) - partition.committedOffset;
}

export function totalLag(topology: KafkaTopologyState): number {
  return topology.partitions.reduce((sum, p) => sum + partitionLag(topology, p), 0);
}

/** SIMULATION: poll advances current position up to the log end. */
export function pollPartition(topology: KafkaTopologyState, partitionId: string): KafkaTopologyState {
  const end = logEndOffset(topology, partitionId);
  return {
    ...topology,
    partitions: topology.partitions.map((p) =>
      p.id === partitionId ? { ...p, currentPosition: end } : p,
    ),
  };
}

/** SIMULATION: commit moves the durable bookmark up to the current position. */
export function commitPartition(topology: KafkaTopologyState, partitionId: string): KafkaTopologyState {
  return {
    ...topology,
    partitions: topology.partitions.map((p) =>
      p.id === partitionId ? { ...p, committedOffset: p.currentPosition } : p,
    ),
  };
}

/**
 * Remove one consumer BY ID (unlike a simple pop of the last consumer) and
 * reassign remaining partitions among the remaining consumers, preserving
 * their original ids. Used for both graceful "kill" and crash simulation -
 * the resulting reassignment shape is identical; only the timeline wording
 * and the cited Phase 6 evidence differ (see store.ts).
 */
export function removeConsumerById(
  topology: KafkaTopologyState,
  consumerId: string,
): KafkaTopologyState {
  const remaining = topology.consumerGroup.consumers.filter((c) => c.id !== consumerId);
  return applyAssignment({
    ...topology,
    consumerGroup: { ...topology.consumerGroup, consumers: remaining },
  });
}
