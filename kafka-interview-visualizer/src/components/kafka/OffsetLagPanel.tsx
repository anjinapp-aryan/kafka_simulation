import { useAppStore } from '../../store';
import { logEndOffset, partitionLag, totalLag } from '../../models/kafkaTopology';

function Ruler({ current, committed, end }: { current: number; committed: number; end: number }) {
  const max = Math.max(end, 1);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="offset-ruler" role="img" aria-label={`current ${current}, committed ${committed}, log end ${end}`}>
      <div className="offset-ruler-track" />
      <div className="offset-marker offset-marker-committed" style={{ left: pct(committed) }} title={`committed offset: ${committed}`} />
      <div className="offset-marker offset-marker-current" style={{ left: pct(current) }} title={`current position: ${current}`} />
      <div className="offset-marker offset-marker-end" style={{ left: pct(end) }} title={`log end offset: ${end}`} />
    </div>
  );
}

export function OffsetLagPanel() {
  const topology = useAppStore((s) => s.topology);
  const pollPartitionOffset = useAppStore((s) => s.pollPartitionOffset);
  const commitPartitionOffset = useAppStore((s) => s.commitPartitionOffset);

  return (
    <div className="offset-lag-panel">
      <p className="placeholder">
        <span className="legend-dot legend-current" /> current position &nbsp;
        <span className="legend-dot legend-committed" /> committed offset &nbsp;
        <span className="legend-dot legend-end" /> log-end offset
      </p>
      {topology.partitions.map((p) => {
        const end = logEndOffset(topology, p.id);
        const lag = partitionLag(topology, p);
        return (
          <div key={p.id} className="offset-row">
            <div className="offset-row-label">{p.id}</div>
            <Ruler current={p.currentPosition} committed={p.committedOffset} end={end} />
            <div className="offset-row-numbers">
              CURRENT {p.currentPosition} | COMMITTED {p.committedOffset} | LOG-END {end} | LAG {lag}
            </div>
            <div className="offset-row-actions">
              <button onClick={() => pollPartitionOffset(p.id)}>Poll</button>
              <button onClick={() => commitPartitionOffset(p.id)}>Commit</button>
            </div>
          </div>
        );
      })}
      <p className="total-lag">
        TOTAL LAG = {totalLag(topology)}{' '}
        <span className="placeholder">(lag is fundamentally tracked per partition — this total is just a sum)</span>
      </p>
    </div>
  );
}
