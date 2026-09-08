import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';

export function RebalanceControls() {
  const consumers = useAppStore((s) => s.topology.consumerGroup.consumers);
  const killConsumer = useAppStore((s) => s.killConsumer);
  const [target, setTarget] = useState(consumers[0]?.id ?? '');

  useEffect(() => {
    if (!consumers.some((c) => c.id === target)) {
      setTarget(consumers[0]?.id ?? '');
    }
  }, [consumers, target]);

  return (
    <div className="rebalance-controls">
      <label>
        Target consumer
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target consumer">
          {consumers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={consumers.length <= 1}
        onClick={() => killConsumer(target, 'graceful')}
      >
        Remove (graceful leave)
      </button>
      <button
        disabled={consumers.length <= 1}
        className="danger-btn"
        onClick={() => killConsumer(target, 'crash')}
      >
        💥 Kill Consumer (crash)
      </button>
    </div>
  );
}
