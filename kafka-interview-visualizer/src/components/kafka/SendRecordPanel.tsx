import { useState } from 'react';
import { useAppStore } from '../../store';

export function SendRecordPanel() {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('Order-001');
  const sendRecord = useAppStore((s) => s.sendRecord);
  const lastRecordPartitionId = useAppStore((s) => s.lastRecordPartitionId);

  return (
    <div className="send-record-panel">
      <label>
        Key
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="null"
          aria-label="Record key"
        />
      </label>
      <label>
        Value
        <input value={value} onChange={(e) => setValue(e.target.value)} aria-label="Record value" />
      </label>
      <button onClick={() => sendRecord(key, value)}>Send</button>
      {lastRecordPartitionId && (
        <p className="placeholder">
          Last record routed to <strong>{lastRecordPartitionId}</strong> —{' '}
          {key.trim() ? 'simulation: same key -> same partition' : 'illustrative producer routing (simplified)'}
        </p>
      )}
    </div>
  );
}
