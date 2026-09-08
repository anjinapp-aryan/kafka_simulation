import { describe, it, expect } from 'vitest';
import {
  createDefaultReplicationState,
  killBroker,
  restartBroker,
  isr,
  isUnderReplicated,
  canWriteAcksAll,
} from './replicationModel';

describe('replicationModel (must reproduce PROVEN Phase 9 evidence exactly)', () => {
  it('default state matches the PROVEN RF=3 topic description', () => {
    const state = createDefaultReplicationState();
    const p0 = state.partitions.find((p) => p.id === 'P0')!;
    const p1 = state.partitions.find((p) => p.id === 'P1')!;
    const p2 = state.partitions.find((p) => p.id === 'P2')!;
    expect(p0.leader).toBe(3);
    expect(p0.replicas).toEqual([3, 1, 2]);
    expect(p1.leader).toBe(1);
    expect(p2.leader).toBe(2);
    expect(isr(state, p0)).toEqual([3, 1, 2]);
  });

  it('killing broker 2 reproduces the PROVEN leader election (P2: 2 -> 3) and unchanged leaders elsewhere', () => {
    const before = createDefaultReplicationState();
    const after = killBroker(before, 2);
    const p0 = after.partitions.find((p) => p.id === 'P0')!;
    const p1 = after.partitions.find((p) => p.id === 'P1')!;
    const p2 = after.partitions.find((p) => p.id === 'P2')!;

    expect(p2.leader).toBe(3); // PROVEN: leader changed 2 -> 3
    expect(p0.leader).toBe(3); // PROVEN: unchanged (2 wasn't its leader)
    expect(p1.leader).toBe(1); // PROVEN: unchanged
  });

  it('killing broker 2 reproduces the PROVEN ISR shrink on every partition', () => {
    const before = createDefaultReplicationState();
    const after = killBroker(before, 2);
    const p0 = after.partitions.find((p) => p.id === 'P0')!;
    const p1 = after.partitions.find((p) => p.id === 'P1')!;
    const p2 = after.partitions.find((p) => p.id === 'P2')!;

    expect(isr(after, p0)).toEqual([3, 1]); // PROVEN: 3,1,2 -> 3,1
    expect(isr(after, p1)).toEqual([1, 3]); // PROVEN: 1,2,3 -> 1,3
    expect(isr(after, p2)).toEqual([3, 1]); // PROVEN: 3,1
    expect(p2.replicas).toEqual([2, 3, 1]); // Replicas list unchanged - proves Replicas != ISR
  });

  it('all partitions become under-replicated after one broker dies, matching PROVEN evidence', () => {
    const after = killBroker(createDefaultReplicationState(), 2);
    for (const p of after.partitions) {
      expect(isUnderReplicated(after, p)).toBe(true);
    }
  });

  it('acks=all still succeeds at ISR=2 with min.insync.replicas=2 (PROVEN)', () => {
    const after = killBroker(createDefaultReplicationState(), 2);
    for (const p of after.partitions) {
      expect(canWriteAcksAll(after, p)).toBe(true);
    }
  });

  it('killing a second broker drops ISR to 1 and acks=all is rejected (PROVEN: NOT_ENOUGH_REPLICAS)', () => {
    let state = createDefaultReplicationState();
    state = killBroker(state, 2);
    state = killBroker(state, 3);
    for (const p of state.partitions) {
      expect(isr(state, p).length).toBe(1);
      expect(canWriteAcksAll(state, p)).toBe(false);
    }
  });

  it('restarting a broker restores ISR but does NOT move leadership back (PROVEN Phase 9 R9)', () => {
    let state = createDefaultReplicationState();
    state = killBroker(state, 2);
    const leaderBeforeRestart = state.partitions.find((p) => p.id === 'P2')!.leader;
    state = restartBroker(state, 2);
    const p2 = state.partitions.find((p) => p.id === 'P2')!;
    expect(isr(state, p2)).toEqual([2, 3, 1]); // ISR restored, all 3 replicas back
    expect(p2.leader).toBe(leaderBeforeRestart); // leadership NOT handed back automatically
    expect(p2.leader).toBe(3);
  });
});
