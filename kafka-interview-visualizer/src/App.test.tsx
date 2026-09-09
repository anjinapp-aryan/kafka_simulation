import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useAppStore } from './store';
import { PHASES } from './phases';
import { applyAssignment, createDefaultTopology } from './models/kafkaTopology';

function resetStore() {
  useAppStore.setState({
    activePhaseId: PHASES[0].id,
    topology: applyAssignment(createDefaultTopology()),
    selectedPartitionId: null,
    sendCount: 0,
    timeline: [],
    lastRecordPartitionId: null,
    commitFlow: { mode: 'process-then-commit', polled: false, processed: false, committed: false, crashed: false, resultLabel: null },
  });
}

describe('App shell (Step 1 regression)', () => {
  beforeEach(resetStore);

  it('shows the P0 title by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: PHASES[0].title })).toBeInTheDocument();
  });

  it('switches phase title on selection', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P9' }));
    const p9 = PHASES.find((p) => p.id === 'P9')!;
    expect(screen.getByRole('heading', { name: p9.title })).toBeInTheDocument();
  });
});

describe('P1 topology visualization (Step 2)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P1' }));
  });

  it('shows the producer, topic, and 3 partitions by default', () => {
    expect(screen.getByText('OrderProducer')).toBeInTheDocument();
    expect(screen.getByText('orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partition P0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partition P1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partition P2' })).toBeInTheDocument();
  });

  it('starts with 3 consumers, one partition each, zero idle', () => {
    expect(screen.getByText('3 consumer(s)')).toBeInTheDocument();
    const metrics = screen.getByText('Idle').closest('div')!;
    expect(within(metrics).getByText('0')).toBeInTheDocument();
  });

  it('going to 1 consumer assigns it all 3 partitions', () => {
    fireEvent.click(screen.getByRole('button', { name: '− Consumer' }));
    fireEvent.click(screen.getByRole('button', { name: '− Consumer' }));
    expect(screen.getByText('1 consumer(s)')).toBeInTheDocument();
    expect(screen.getByText('P0, P1, P2')).toBeInTheDocument();
  });

  it('adding a 4th consumer produces exactly one idle consumer, ceiling stays 3', () => {
    fireEvent.click(screen.getByRole('button', { name: '+ Consumer' }));
    expect(screen.getByText('4 consumer(s)')).toBeInTheDocument();
    expect(screen.getByText('IDLE — 0 partitions')).toBeInTheDocument();
    const ceiling = screen.getByText('Parallelism ceiling').closest('div')!;
    expect(within(ceiling).getByText('3')).toBeInTheDocument();
  });

  it('sending a record updates the timeline and metrics stay consistent', () => {
    fireEvent.click(screen.getByText('Send'));
    expect(screen.getByText(/Producer sent "Order-001"/)).toBeInTheDocument();
    expect(screen.getAllByText('SIMULATION').length).toBeGreaterThan(0);
  });

  it('clicking a partition opens its detail panel', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Partition P0' }));
    expect(screen.getByRole('heading', { name: 'Partition P0' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Partition P0' })).not.toBeInTheDocument();
  });

  it('interview panel shows question, answer, memory sentence, and production example', () => {
    expect(screen.getByText(/How does Kafka distribute work/)).toBeInTheDocument();
    expect(screen.getByText(/Partitions are the work units/)).toBeInTheDocument();
    expect(screen.getByText(/3 partitions \+ 10 consumers/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    expect(screen.getByText(/only one owner inside the same consumer group/)).toBeInTheDocument();
  });

  it('shows PROVEN Phase 3 evidence distinct from simulation', () => {
    expect(screen.getByText('PROVEN — Phase 3')).toBeInTheDocument();
    expect(screen.getByText(/C1 -> \[0,1\]\s+C2 -> \[2\]/)).toBeInTheDocument();
  });
});

describe('P3 consumer group visualization (Step 3)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P3' }));
  });

  it('shows the assignment panel matching the default 3-consumer/3-partition shape', () => {
    const assignment = screen.getByText('SIMULATION — assignment shape based on Phase 3 observed Range assignor').closest('div')!;
    expect(within(assignment).getByText(/C1/)).toBeInTheDocument();
    expect(within(assignment).getByText(/P0/)).toBeInTheDocument();
  });

  it('killing C2 (crash) reassigns to C1->P0,P1 and C3->P2, logged in the timeline', () => {
    fireEvent.change(screen.getByLabelText('Target consumer'), { target: { value: 'C2' } });
    fireEvent.click(screen.getByRole('button', { name: '💥 Kill Consumer (crash)' }));

    expect(useAppStore.getState().topology.consumerGroup.consumers.map((c) => c.id)).toEqual([
      'C1',
      'C3',
    ]);
    expect(screen.getByText(/C2 CRASHED/)).toBeInTheDocument();
    expect(screen.getByText(/PROVEN: ~44s in this lab/)).toBeInTheDocument();
  });

  it('graceful removal cites the ~3s proven figure, not the crash figure', () => {
    fireEvent.change(screen.getByLabelText('Target consumer'), { target: { value: 'C2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove (graceful leave)' }));
    expect(screen.getByText(/PROVEN: ~3s in this lab/)).toBeInTheDocument();
  });

  it('offset panel: poll moves current position, commit closes the lag', () => {
    // Send a record so P0 (unkeyed, first send routes to index 0) has a
    // non-zero log-end offset to poll toward.
    fireEvent.click(screen.getByText('Send'));
    const offsetPanel = screen.getByText(/current position/).closest('.offset-lag-panel') as HTMLElement;
    const [pollP0] = within(offsetPanel).getAllByRole('button', { name: 'Poll' });
    fireEvent.click(pollP0);
    const [commitP0] = within(offsetPanel).getAllByRole('button', { name: 'Commit' });
    fireEvent.click(commitP0);

    const p0 = useAppStore.getState().topology.partitions.find((p) => p.id === 'P0')!;
    expect(p0.currentPosition).toBe(1);
    expect(p0.committedOffset).toBe(1);
  });

  it('commit-flow Mode A (process then commit), crash before commit -> replay with duplicate risk', () => {
    const demo = screen.getByText('Record: PAY-1001').closest('.commit-flow-demo') as HTMLElement;
    fireEvent.click(within(demo).getByRole('button', { name: 'Poll' }));
    fireEvent.click(within(demo).getByRole('button', { name: 'Process' }));
    fireEvent.click(within(demo).getByRole('button', { name: '💥 Crash' }));
    fireEvent.click(within(demo).getByRole('button', { name: 'Restart' }));
    expect(useAppStore.getState().commitFlow.resultLabel).toMatch(/REPLAYED.*DUPLICATE PROCESSING RISK/);
  });

  it('commit-flow Mode B (commit then process), crash before process -> skip with loss', () => {
    const demo = screen.getByText('Record: PAY-1001').closest('.commit-flow-demo') as HTMLElement;
    fireEvent.click(within(demo).getByLabelText(/Mode B/));
    fireEvent.click(within(demo).getByRole('button', { name: 'Poll' }));
    fireEvent.click(within(demo).getByRole('button', { name: 'Commit' }));
    fireEvent.click(within(demo).getByRole('button', { name: '💥 Crash' }));
    fireEvent.click(within(demo).getByRole('button', { name: 'Restart' }));
    expect(useAppStore.getState().commitFlow.resultLabel).toMatch(/SKIPPED.*LOSS/);
  });

  it('renders the 15-question interview set with expandable senior detail', () => {
    expect(screen.getByText('What is a consumer group?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('What is a consumer group?'));
    expect(screen.getByText(/group coordinator assigns each partition/)).toBeInTheDocument();
  });

  it('evidence panel shows Phase 3, 5, and 6 PROVEN sections, clearly separated from SIMULATION', () => {
    expect(screen.getByText('PROVEN — Phase 3 (assignment)')).toBeInTheDocument();
    expect(screen.getByText('PROVEN — Phase 5 (offsets / commits)')).toBeInTheDocument();
    expect(screen.getByText('PROVEN — Phase 6 (failure / rebalance)')).toBeInTheDocument();
    expect(screen.getByText(/reproduce the same shapes on demand but are not themselves/)).toBeInTheDocument();
  });
});

function goToPhase(id: string) {
  fireEvent.click(screen.getByRole('button', { name: id }));
}

describe('consumer id generation (regression: duplicate React keys)', () => {
  beforeEach(resetStore);

  it('adding a consumer after killing a middle one never reuses an existing id', () => {
    const store = useAppStore.getState();
    // start C1,C2,C3 -> kill C2 -> C1,C3 -> add -> must NOT be another C3
    store.killConsumer('C2', 'crash');
    useAppStore.getState().addConsumer();

    const ids = useAppStore.getState().topology.consumerGroup.consumers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['C1', 'C3', 'C4']);
  });

  it('ids stay unique across repeated kill/add cycles', () => {
    for (let i = 0; i < 3; i++) {
      const consumers = useAppStore.getState().topology.consumerGroup.consumers;
      useAppStore.getState().killConsumer(consumers[0].id, 'graceful');
      useAppStore.getState().addConsumer();
      const ids = useAppStore.getState().topology.consumerGroup.consumers.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('P7 producer reliability (Step 4)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    goToPhase('P7');
  });

  it('idempotence + acks!=all is rejected with the exact PROVEN ConfigException text', () => {
    fireEvent.change(screen.getByDisplayValue('all — ISR acknowledgement'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Record' }));
    const result = document.querySelector('.producer-send-result') as HTMLElement;
    expect(within(result).getByText(/Must set acks to all in order to use the idempotent producer/)).toBeInTheDocument();
  });

  it('acks=0 with idempotence off returns offset=-1, hasOffset=false', () => {
    fireEvent.click(screen.getByLabelText('enable.idempotence')); // turn off
    fireEvent.change(screen.getByDisplayValue('all — ISR acknowledgement'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Record' }));
    const result = document.querySelector('.producer-send-result') as HTMLElement;
    expect(result.textContent).toMatch(/offset=-1.*hasOffset=false/);
  });

  it('shows PROVEN Phase 7 evidence and a production scenario', () => {
    expect(screen.getByText('PROVEN — Phase 7 (producer reliability)')).toBeInTheDocument();
    expect(screen.getByText(/A payment producer occasionally throws a timeout/)).toBeInTheDocument();
  });
});

describe('P8 lag simulator (Step 5)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    goToPhase('P8');
  });

  it('producer rate > consumer rate increases total lag on tick', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Tick (+1s)' }));
    expect(screen.getByText(/Producer rate > consumer rate -> lag will keep climbing/)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL LAG = \d/)).toBeInTheDocument();
  });

  it('shows PROVEN Phase 8 evidence', () => {
    expect(screen.getByText('PROVEN — Phase 8 (performance / lag)')).toBeInTheDocument();
  });
});

describe('P9 replication panel (Step 6)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    goToPhase('P9');
  });

  it('killing broker 2 reproduces the PROVEN leader change on P2 (2 -> 3) in the UI', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Kill Broker 2' }));
    const rows = screen.getAllByRole('row');
    const p2Row = rows.find((r) => within(r).queryByText('P2'));
    expect(within(p2Row!).getByText('kafka3')).toBeInTheDocument();
  });

  it('killing two brokers causes acks=all to be rejected (PROVEN: NOT_ENOUGH_REPLICAS)', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Kill Broker 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kill Broker 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Attempt acks=all write to every partition' }));
    expect(screen.getByText(/REJECTED — NOT_ENOUGH_REPLICAS/)).toBeInTheDocument();
  });
});

describe('P10 transactions + saga (Step 7/8)', () => {
  beforeEach(() => {
    resetStore();
    render(<App />);
    goToPhase('P10');
  });

  it('abort makes the record invisible under read_committed but visible under read_uncommitted', () => {
    fireEvent.click(screen.getByRole('button', { name: 'beginTransaction()' }));
    fireEvent.click(screen.getByRole('button', { name: 'send()' }));
    fireEvent.click(screen.getByRole('button', { name: 'abortTransaction()' }));

    expect(screen.getByText('(none)')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('read_uncommitted'));
    expect(screen.getByText('Order-1')).toBeInTheDocument();
  });

  it('crash before commit blocks read_committed until fenced, then the retry stays permanently invisible', () => {
    fireEvent.click(screen.getByRole('button', { name: 'beginTransaction()' }));
    fireEvent.click(screen.getByRole('button', { name: 'send()' }));
    fireEvent.click(screen.getByRole('button', { name: '💥 Crash before commit' }));
    expect(screen.getByText('(none)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Reconnect with same transactional.id/ }));
    fireEvent.click(screen.getByLabelText('read_uncommitted'));
    // Even under read_uncommitted, the fenced record shows as "aborted" - never "committed".
    expect(screen.queryByText('committed')).not.toBeInTheDocument();
  });

  it('Saga panel shows CONCEPTUAL label and a compensation step on default failure', () => {
    expect(screen.getByText(/CONCEPTUAL — no Saga framework was executed/)).toBeInTheDocument();
    expect(screen.getByText(/COMPENSATION: Credit Account back/)).toBeInTheDocument();
  });
});
