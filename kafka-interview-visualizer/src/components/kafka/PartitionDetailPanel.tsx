import { useAppStore } from '../../store';

export function PartitionDetailPanel() {
  const selectedPartitionId = useAppStore((s) => s.selectedPartitionId);
  const topology = useAppStore((s) => s.topology);
  const selectPartition = useAppStore((s) => s.selectPartition);

  if (!selectedPartitionId) {
    return <p className="placeholder">Click a partition to see its records and consumer assignment.</p>;
  }

  const partition = topology.partitions.find((p) => p.id === selectedPartitionId);
  if (!partition) return null;

  const owner = topology.consumerGroup.consumers.find((c) =>
    c.assignedPartitionIds.includes(partition.id),
  );

  return (
    <div className="partition-detail">
      <div className="partition-detail-header">
        <h4>Partition {partition.id}</h4>
        <button onClick={() => selectPartition(null)}>Close</button>
      </div>
      <p>
        Assigned consumer: <strong>{owner ? owner.id : 'none'}</strong>
      </p>
      <p className="placeholder">Records (simulation offsets, not real Kafka offsets):</p>
      {partition.records.length === 0 ? (
        <p className="placeholder">No records sent to this partition yet.</p>
      ) : (
        <ul className="record-list">
          {partition.records.map((r) => (
            <li key={r.simulationOffset}>
              sim-offset {r.simulationOffset} — key={r.key ?? 'null'} — value={r.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
