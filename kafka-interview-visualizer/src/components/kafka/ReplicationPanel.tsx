import { useState } from 'react';
import {
  createDefaultReplicationState,
  killBroker,
  restartBroker,
  isr,
  isUnderReplicated,
  canWriteAcksAll,
  type ReplicationState,
} from '../../models/replicationModel';

export function ReplicationPanel() {
  const [state, setState] = useState<ReplicationState>(createDefaultReplicationState());
  const [writeResult, setWriteResult] = useState<string | null>(null);

  function tryWrite() {
    const results = state.partitions.map(
      (p) => `${p.id}: ${canWriteAcksAll(state, p) ? 'WRITE OK' : 'REJECTED — NOT_ENOUGH_REPLICAS'}`,
    );
    setWriteResult(results.join('  |  '));
  }

  return (
    <div className="replication-panel">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — this model was built to reproduce the exact Phase 9 PROVEN transitions (see Evidence below)
      </span>

      <div className="broker-controls">
        {[1, 2, 3].map((id) => (
          <div key={id} className={'broker-badge' + (state.brokers[id] ? '' : ' broker-dead')}>
            <span>kafka{id}</span>
            <span>{state.brokers[id] ? 'UP' : 'DOWN'}</span>
            {state.brokers[id] ? (
              <button
                className="danger-btn"
                onClick={() => setState((s) => killBroker(s, id))}
                disabled={Object.values(state.brokers).filter(Boolean).length <= 1}
              >
                Kill Broker {id}
              </button>
            ) : (
              <button onClick={() => setState((s) => restartBroker(s, id))}>Restart Broker {id}</button>
            )}
          </div>
        ))}
      </div>

      <table className="replication-table">
        <thead>
          <tr>
            <th>Partition</th>
            <th>Leader</th>
            <th>Replicas</th>
            <th>ISR</th>
            <th>Under-replicated?</th>
          </tr>
        </thead>
        <tbody>
          {state.partitions.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>kafka{p.leader}</td>
              <td>{p.replicas.map((r) => `kafka${r}`).join(', ')}</td>
              <td>{isr(state, p).map((r) => `kafka${r}`).join(', ')}</td>
              <td>{isUnderReplicated(state, p) ? 'YES' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="placeholder">
        <strong>Replicas ≠ ISR:</strong> the Replicas column is the configured copy list and never
        changes on broker failure; the ISR column is who is currently caught up.
      </p>

      <div className="min-isr-test">
        <p className="placeholder">min.insync.replicas = {state.minInsyncReplicas}, acks=all</p>
        <button onClick={tryWrite}>Attempt acks=all write to every partition</button>
        {writeResult && <p className="commit-flow-result">{writeResult}</p>}
      </div>
    </div>
  );
}
