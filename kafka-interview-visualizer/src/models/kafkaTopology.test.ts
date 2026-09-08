import { describe, it, expect } from 'vitest';
import {
  assignPartitions,
  createDefaultTopology,
  applyAssignment,
  idleConsumerCount,
  simulateKeyedRouting,
  logEndOffset,
  partitionLag,
  totalLag,
  pollPartition,
  commitPartition,
  removeConsumerById,
} from './kafkaTopology';

const P = ['P0', 'P1', 'P2'];

describe('assignPartitions (mirrors Phase 3 proven evidence)', () => {
  it('1 consumer gets all 3 partitions', () => {
    expect(assignPartitions(P, ['C1'])).toEqual({ C1: ['P0', 'P1', 'P2'] });
  });

  it('2 consumers split 2/1', () => {
    expect(assignPartitions(P, ['C1', 'C2'])).toEqual({ C1: ['P0', 'P1'], C2: ['P2'] });
  });

  it('3 consumers get one each', () => {
    expect(assignPartitions(P, ['C1', 'C2', 'C3'])).toEqual({
      C1: ['P0'],
      C2: ['P1'],
      C3: ['P2'],
    });
  });

  it('4th consumer is idle', () => {
    const result = assignPartitions(P, ['C1', 'C2', 'C3', 'C4']);
    expect(result.C4).toEqual([]);
    expect(result.C1).toEqual(['P0']);
    expect(result.C2).toEqual(['P1']);
    expect(result.C3).toEqual(['P2']);
  });
});

describe('applyAssignment + idleConsumerCount', () => {
  it('default topology (3 consumers) has zero idle', () => {
    const topology = applyAssignment(createDefaultTopology());
    expect(idleConsumerCount(topology)).toBe(0);
  });

  it('adding a 4th consumer produces exactly one idle consumer', () => {
    const base = createDefaultTopology();
    const withFour = applyAssignment({
      ...base,
      consumerGroup: {
        ...base.consumerGroup,
        consumers: [...base.consumerGroup.consumers, { id: 'C4', assignedPartitionIds: [] }],
      },
    });
    expect(idleConsumerCount(withFour)).toBe(1);
  });
});

describe('simulateKeyedRouting', () => {
  it('same key always routes to the same partition', () => {
    const first = simulateKeyedRouting('customer-101', 3);
    for (let i = 0; i < 10; i++) {
      expect(simulateKeyedRouting('customer-101', 3)).toBe(first);
    }
  });

  it('result is always a valid partition index', () => {
    for (const key of ['a', 'customer-101', 'PAY-1001', '']) {
      const idx = simulateKeyedRouting(key, 3);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(3);
    }
  });
});

describe('Step 3: offsets and lag', () => {
  it('a fresh topology has zero current/committed/log-end/lag everywhere', () => {
    const topology = createDefaultTopology();
    for (const p of topology.partitions) {
      expect(p.currentPosition).toBe(0);
      expect(p.committedOffset).toBe(0);
      expect(logEndOffset(topology, p.id)).toBe(0);
      expect(partitionLag(topology, p)).toBe(0);
    }
    expect(totalLag(topology)).toBe(0);
  });

  it('producing (log-end advance) without polling increases lag', () => {
    let topology = createDefaultTopology();
    topology = {
      ...topology,
      nextSimulationOffsetByPartition: { ...topology.nextSimulationOffsetByPartition, P0: 10 },
    };
    const p0 = topology.partitions.find((p) => p.id === 'P0')!;
    expect(logEndOffset(topology, 'P0')).toBe(10);
    expect(partitionLag(topology, p0)).toBe(10);
  });

  it('poll moves current position to the log end, not committed', () => {
    let topology = createDefaultTopology();
    topology = {
      ...topology,
      nextSimulationOffsetByPartition: { ...topology.nextSimulationOffsetByPartition, P0: 8 },
    };
    topology = pollPartition(topology, 'P0');
    const p0 = topology.partitions.find((p) => p.id === 'P0')!;
    expect(p0.currentPosition).toBe(8);
    expect(p0.committedOffset).toBe(0);
    expect(partitionLag(topology, p0)).toBe(8); // committed hasn't moved yet
  });

  it('commit moves committed offset to current position and closes the lag', () => {
    let topology = createDefaultTopology();
    topology = {
      ...topology,
      nextSimulationOffsetByPartition: { ...topology.nextSimulationOffsetByPartition, P0: 8 },
    };
    topology = pollPartition(topology, 'P0');
    topology = commitPartition(topology, 'P0');
    const p0 = topology.partitions.find((p) => p.id === 'P0')!;
    expect(p0.committedOffset).toBe(8);
    expect(partitionLag(topology, p0)).toBe(0);
  });

  it('total lag sums per-partition lag, matching the worked example from the spec', () => {
    let topology = createDefaultTopology();
    topology = {
      ...topology,
      nextSimulationOffsetByPartition: { P0: 10, P1: 20, P2: 15 },
      partitions: [
        { ...topology.partitions[0], committedOffset: 8 },
        { ...topology.partitions[1], committedOffset: 20 },
        { ...topology.partitions[2], committedOffset: 10 },
      ],
    };
    expect(totalLag(topology)).toBe(2 + 0 + 5);
  });
});

describe('Step 3: removeConsumerById (kill / graceful leave)', () => {
  it('killing C2 out of C1/C2/C3 reassigns exactly to C1->P0,P1 and C3->P2', () => {
    const topology = applyAssignment(createDefaultTopology());
    const after = removeConsumerById(topology, 'C2');
    const byId = Object.fromEntries(after.consumerGroup.consumers.map((c) => [c.id, c.assignedPartitionIds]));
    expect(byId.C1).toEqual(['P0', 'P1']);
    expect(byId.C3).toEqual(['P2']);
    expect(byId.C2).toBeUndefined();
  });

  it('surviving consumers keep their original ids (not renumbered)', () => {
    const topology = applyAssignment(createDefaultTopology());
    const after = removeConsumerById(topology, 'C1');
    const ids = after.consumerGroup.consumers.map((c) => c.id);
    expect(ids).toEqual(['C2', 'C3']);
  });
});
