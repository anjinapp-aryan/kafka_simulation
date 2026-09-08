// Domain state for the Step 6 replication/ISR simulation. Initial values and
// the kill/restart transition logic were deliberately built to reproduce the
// exact Phase 9 PROVEN evidence (see phase9Evidence.ts) - not invented.

export interface ReplicaPartition {
  id: string;
  replicas: number[]; // configured broker ids, in original order
  leader: number;
}

export interface ReplicationState {
  brokers: Record<number, boolean>; // brokerId -> alive
  partitions: ReplicaPartition[];
  minInsyncReplicas: number;
}

export function createDefaultReplicationState(): ReplicationState {
  return {
    brokers: { 1: true, 2: true, 3: true },
    partitions: [
      { id: 'P0', replicas: [3, 1, 2], leader: 3 },
      { id: 'P1', replicas: [1, 2, 3], leader: 1 },
      { id: 'P2', replicas: [2, 3, 1], leader: 2 },
    ],
    minInsyncReplicas: 2,
  };
}

export function isr(state: ReplicationState, partition: ReplicaPartition): number[] {
  return partition.replicas.filter((b) => state.brokers[b]);
}

/**
 * Kill a broker: it drops out of ISR for every partition; any partition it
 * was leading gets a new leader — the first ALIVE replica in that
 * partition's original replica order. This reproduces the exact Phase 9
 * observation: killing broker 2 (P2's leader) elected broker 3 (first alive
 * replica in P2's [2,3,1] list after removing 2); P0/P1 kept their leaders
 * since broker 2 wasn't leading them.
 */
export function killBroker(state: ReplicationState, brokerId: number): ReplicationState {
  const brokers = { ...state.brokers, [brokerId]: false };
  const partitions = state.partitions.map((p) => {
    if (p.leader !== brokerId) return p;
    const newLeader = p.replicas.find((b) => brokers[b]);
    return newLeader !== undefined ? { ...p, leader: newLeader } : p;
  });
  return { ...state, brokers, partitions };
}

/**
 * Restart a broker: it rejoins ISR wherever it's a configured replica, but
 * PROVEN Phase 9 R9: leadership is NOT automatically handed back — the
 * survivor keeps leading until a manual/preferred-leader election.
 */
export function restartBroker(state: ReplicationState, brokerId: number): ReplicationState {
  return { ...state, brokers: { ...state.brokers, [brokerId]: true } };
}

export function isUnderReplicated(state: ReplicationState, partition: ReplicaPartition): boolean {
  return isr(state, partition).length < partition.replicas.length;
}

/** acks=all succeeds only if the current ISR meets the durability floor. */
export function canWriteAcksAll(state: ReplicationState, partition: ReplicaPartition): boolean {
  return isr(state, partition).length >= state.minInsyncReplicas;
}
