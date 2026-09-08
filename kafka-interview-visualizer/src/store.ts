import { create } from 'zustand';
import { PHASES } from './phases';
import {
  applyAssignment,
  commitPartition,
  createDefaultTopology,
  pollPartition,
  removeConsumerById,
  simulateKeyedRouting,
  simulateUnkeyedRouting,
  type KafkaTopologyState,
} from './models/kafkaTopology';

export interface TimelineEvent {
  id: number;
  time: string;
  text: string;
}

export type CommitFlowMode = 'process-then-commit' | 'commit-then-process';

export interface CommitFlowState {
  mode: CommitFlowMode;
  polled: boolean;
  processed: boolean;
  committed: boolean;
  crashed: boolean;
  resultLabel: string | null;
}

function initialCommitFlow(mode: CommitFlowMode = 'process-then-commit'): CommitFlowState {
  return { mode, polled: false, processed: false, committed: false, crashed: false, resultLabel: null };
}

interface AppState {
  activePhaseId: string;
  setActivePhase: (id: string) => void;

  topology: KafkaTopologyState;
  selectedPartitionId: string | null;
  sendCount: number;
  timeline: TimelineEvent[];
  lastRecordPartitionId: string | null;

  addConsumer: () => void;
  removeConsumer: () => void;
  killConsumer: (id: string, mode: 'graceful' | 'crash') => void;
  selectPartition: (id: string | null) => void;
  sendRecord: (key: string, value: string) => void;
  pollPartitionOffset: (partitionId: string) => void;
  commitPartitionOffset: (partitionId: string) => void;

  commitFlow: CommitFlowState;
  setCommitFlowMode: (mode: CommitFlowMode) => void;
  commitFlowPoll: () => void;
  commitFlowProcess: () => void;
  commitFlowCommit: () => void;
  commitFlowCrash: () => void;
  commitFlowRestart: () => void;
}

let timelineIdCounter = 0;
function pushEvent(text: string): TimelineEvent {
  timelineIdCounter += 1;
  return {
    id: timelineIdCounter,
    time: new Date().toLocaleTimeString(),
    text,
  };
}

const MAX_CONSUMERS = 6;

export const useAppStore = create<AppState>((set, get) => ({
  activePhaseId: PHASES[0].id,
  setActivePhase: (id) => set({ activePhaseId: id }),

  topology: applyAssignment(createDefaultTopology()),
  selectedPartitionId: null,
  sendCount: 0,
  timeline: [],
  lastRecordPartitionId: null,

  addConsumer: () => {
    const state = get();
    const consumers = state.topology.consumerGroup.consumers;
    if (consumers.length >= MAX_CONSUMERS) return;
    const nextId = `C${consumers.length + 1}`;
    const nextTopology = applyAssignment({
      ...state.topology,
      consumerGroup: {
        ...state.topology.consumerGroup,
        consumers: [...consumers, { id: nextId, assignedPartitionIds: [] }],
      },
    });
    const event = pushEvent(`Consumer ${nextId} joined orders-group`);
    set({ topology: nextTopology, timeline: [...state.timeline, event] });
  },

  removeConsumer: () => {
    const state = get();
    const consumers = state.topology.consumerGroup.consumers;
    if (consumers.length <= 1) return;
    const removed = consumers[consumers.length - 1];
    const nextTopology = applyAssignment({
      ...state.topology,
      consumerGroup: {
        ...state.topology.consumerGroup,
        consumers: consumers.slice(0, -1),
      },
    });
    const event = pushEvent(`Consumer ${removed.id} left orders-group`);
    set({ topology: nextTopology, timeline: [...state.timeline, event] });
  },

  /**
   * Removes a specific consumer (not necessarily the last one) and shows the
   * full membership-change -> rebalance -> reassignment ladder. "graceful"
   * and "crash" produce the identical resulting assignment (SIMULATION) but
   * cite different PROVEN Phase 6 timing in the timeline text - this UI does
   * not actually delay the crash path by 44 real seconds (see EvidencePanel
   * for why: that would conflate simulation timing with proven timing).
   */
  killConsumer: (id, mode) => {
    const state = get();
    const consumers = state.topology.consumerGroup.consumers;
    if (consumers.length <= 1 || !consumers.some((c) => c.id === id)) return;

    const before = consumers
      .map((c) => `${c.id}->${c.assignedPartitionIds.join(',') || 'none'}`)
      .join('  ');

    const nextTopology = removeConsumerById(state.topology, id);

    const after = nextTopology.consumerGroup.consumers
      .map((c) => `${c.id}->${c.assignedPartitionIds.join(',') || 'none'}`)
      .join('  ');

    const events =
      mode === 'graceful'
        ? [
            pushEvent(`${id} sent LeaveGroup (graceful)`),
            pushEvent('GROUP MEMBERSHIP CHANGED'),
            pushEvent('REBALANCE (PROVEN: ~3s in this lab for a graceful leave)'),
            pushEvent(`PARTITIONS REASSIGNED — before: ${before}`),
            pushEvent(`NEW ASSIGNMENT — after: ${after}`),
          ]
        : [
            pushEvent(`${id} CRASHED — no LeaveGroup sent`),
            pushEvent('Group coordinator waiting on missed heartbeats'),
            pushEvent('GROUP MEMBERSHIP CHANGED (failure detected)'),
            pushEvent('REBALANCE (PROVEN: ~44s in this lab for an abrupt crash)'),
            pushEvent(`PARTITIONS REASSIGNED — before: ${before}`),
            pushEvent(`NEW ASSIGNMENT — after: ${after}`),
            pushEvent('Committed offsets for the reassigned partitions are UNCHANGED — no data lost'),
          ];

    set({ topology: nextTopology, timeline: [...state.timeline, ...events] });
  },

  selectPartition: (id) => set({ selectedPartitionId: id }),

  sendRecord: (key, value) => {
    const state = get();
    const partitions = state.topology.partitions;
    const trimmedKey = key.trim();
    const partitionIndex = trimmedKey
      ? simulateKeyedRouting(trimmedKey, partitions.length)
      : simulateUnkeyedRouting(state.sendCount, partitions.length);
    const partition = partitions[partitionIndex];
    const offset = state.topology.nextSimulationOffsetByPartition[partition.id] ?? 0;

    const record = {
      simulationOffset: offset,
      key: trimmedKey || null,
      value,
      partitionId: partition.id,
    };

    const nextPartitions = partitions.map((p) =>
      p.id === partition.id ? { ...p, records: [...p.records, record] } : p,
    );

    const owner = state.topology.consumerGroup.consumers.find((c) =>
      c.assignedPartitionIds.includes(partition.id),
    );

    const events = [
      pushEvent(`Producer sent "${value}" (key=${trimmedKey || 'null'})`),
      pushEvent(`Routed to ${partition.id} (simulation offset ${offset})`),
      pushEvent(`Stored in ${partition.id}`),
      pushEvent(
        owner ? `${owner.id} owns ${partition.id}` : `${partition.id} has no active owner`,
      ),
    ];

    set({
      topology: {
        ...state.topology,
        partitions: nextPartitions,
        nextSimulationOffsetByPartition: {
          ...state.topology.nextSimulationOffsetByPartition,
          [partition.id]: offset + 1,
        },
      },
      sendCount: state.sendCount + 1,
      lastRecordPartitionId: partition.id,
      timeline: [...state.timeline, ...events],
    });
  },

  pollPartitionOffset: (partitionId) => {
    const state = get();
    const nextTopology = pollPartition(state.topology, partitionId);
    const p = nextTopology.partitions.find((x) => x.id === partitionId)!;
    const event = pushEvent(`${partitionId}: current position -> ${p.currentPosition}`);
    set({ topology: nextTopology, timeline: [...state.timeline, event] });
  },

  commitPartitionOffset: (partitionId) => {
    const state = get();
    const nextTopology = commitPartition(state.topology, partitionId);
    const p = nextTopology.partitions.find((x) => x.id === partitionId)!;
    const event = pushEvent(`${partitionId}: committed offset -> ${p.committedOffset}`);
    set({ topology: nextTopology, timeline: [...state.timeline, event] });
  },

  commitFlow: initialCommitFlow(),

  setCommitFlowMode: (mode) => set({ commitFlow: initialCommitFlow(mode) }),

  commitFlowPoll: () => {
    const state = get();
    set({ commitFlow: { ...initialCommitFlow(state.commitFlow.mode), polled: true } });
  },

  commitFlowProcess: () => {
    const state = get();
    if (!state.commitFlow.polled || state.commitFlow.crashed) return;
    set({ commitFlow: { ...state.commitFlow, processed: true } });
  },

  commitFlowCommit: () => {
    const state = get();
    if (!state.commitFlow.polled || state.commitFlow.crashed) return;
    set({ commitFlow: { ...state.commitFlow, committed: true } });
  },

  commitFlowCrash: () => {
    const state = get();
    if (!state.commitFlow.polled) return;
    set({ commitFlow: { ...state.commitFlow, crashed: true } });
  },

  commitFlowRestart: () => {
    const state = get();
    const { committed, processed, mode } = state.commitFlow;
    let resultLabel: string;
    if (committed) {
      resultLabel = processed
        ? 'SKIPPED — already committed and already processed (correct)'
        : 'SKIPPED — committed before processing ran: LOSS (record never retried)';
    } else {
      resultLabel = processed
        ? 'REPLAYED — already processed once: DUPLICATE PROCESSING RISK'
        : 'REPLAYED — will be processed now (first real attempt)';
    }
    set({ commitFlow: initialCommitFlow(mode), timeline: [...state.timeline, pushEvent(`Commit-flow restart: ${resultLabel}`)] });
    // Keep the label visible after reset for the UI to render as the outcome of this run.
    set((s) => ({ commitFlow: { ...s.commitFlow, resultLabel } }));
  },
}));
