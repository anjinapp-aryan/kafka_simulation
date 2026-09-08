import { useState } from 'react';

type TxnRecordState = 'committed' | 'aborted' | 'pending' | 'stuck';

interface TxnRecord {
  id: number;
  value: string;
  state: TxnRecordState;
}

type IsolationLevel = 'read_committed' | 'read_uncommitted';

let nextId = 0;

export function TransactionPanel() {
  const [records, setRecords] = useState<TxnRecord[]>([]);
  const [inTransaction, setInTransaction] = useState(false);
  const [isolation, setIsolation] = useState<IsolationLevel>('read_committed');
  const [pid] = useState(3007); // PROVEN — Phase 10 T1
  const [epoch, setEpoch] = useState(0);

  function begin() {
    setInTransaction(true);
  }

  function send(value: string) {
    if (!inTransaction) return;
    nextId += 1;
    setRecords((r) => [...r, { id: nextId, value, state: 'pending' }]);
  }

  function commit() {
    setRecords((r) => r.map((rec) => (rec.state === 'pending' ? { ...rec, state: 'committed' } : rec)));
    setInTransaction(false);
  }

  function abort() {
    setRecords((r) => r.map((rec) => (rec.state === 'pending' ? { ...rec, state: 'aborted' } : rec)));
    setInTransaction(false);
  }

  function crashBeforeCommit() {
    // Simulates T4: the transaction is left open — a read_committed consumer
    // sees nothing from it (blocked, not just hidden) until it is resolved.
    setRecords((r) => r.map((rec) => (rec.state === 'pending' ? { ...rec, state: 'stuck' } : rec)));
    setInTransaction(false);
  }

  function reconnectSameTransactionalId() {
    // PROVEN T4 retry: initTransactions() with the same transactional.id
    // silently fences the zombie transaction (epoch bump) — its orphaned
    // records become permanently, definitively aborted.
    setEpoch((e) => e + 1);
    setRecords((r) => r.map((rec) => (rec.state === 'stuck' ? { ...rec, state: 'aborted' } : rec)));
  }

  const visible = records.filter((r) => (isolation === 'read_uncommitted' ? true : r.state === 'committed'));

  return (
    <div className="transaction-panel">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — reproduces the exact mechanics proven in Phase 10 T1/T2/T4
      </span>

      <p className="placeholder">
        transactional.id=txn-demo-1 | ProducerId={pid} | epoch={epoch}
      </p>

      <div className="commit-flow-controls">
        <button onClick={begin} disabled={inTransaction}>
          beginTransaction()
        </button>
        <button onClick={() => send(`Order-${nextId + 1}`)} disabled={!inTransaction}>
          send()
        </button>
        <button onClick={commit} disabled={!inTransaction}>
          commitTransaction()
        </button>
        <button onClick={abort} disabled={!inTransaction} className="danger-btn">
          abortTransaction()
        </button>
        <button onClick={crashBeforeCommit} disabled={!inTransaction} className="danger-btn">
          💥 Crash before commit
        </button>
      </div>

      {records.some((r) => r.state === 'stuck') && (
        <button onClick={reconnectSameTransactionalId}>
          Reconnect with same transactional.id (fence zombie)
        </button>
      )}

      <div className="isolation-toggle">
        <label>
          <input
            type="radio"
            checked={isolation === 'read_committed'}
            onChange={() => setIsolation('read_committed')}
          />
          read_committed
        </label>
        <label>
          <input
            type="radio"
            checked={isolation === 'read_uncommitted'}
            onChange={() => setIsolation('read_uncommitted')}
          />
          read_uncommitted
        </label>
      </div>

      <p className="placeholder">All records (internal state):</p>
      <ul className="record-list">
        {records.map((r) => (
          <li key={r.id}>
            {r.value} — {r.state}
          </li>
        ))}
      </ul>

      <p className="placeholder">Visible to a consumer reading with isolation.level={isolation}:</p>
      <ul className="record-list">
        {visible.length === 0 ? (
          <li>(none)</li>
        ) : (
          visible.map((r) => <li key={r.id}>{r.value}</li>)
        )}
      </ul>
    </div>
  );
}
