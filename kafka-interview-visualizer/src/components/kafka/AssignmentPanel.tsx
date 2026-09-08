import { useAppStore } from '../../store';

export function AssignmentPanel() {
  const consumers = useAppStore((s) => s.topology.consumerGroup.consumers);

  return (
    <div className="assignment-panel">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — assignment shape based on Phase 3 observed Range assignor
      </span>
      <ul className="assignment-list">
        {consumers.map((c) => (
          <li key={c.id}>
            <strong>{c.id}</strong> →{' '}
            {c.assignedPartitionIds.length > 0 ? c.assignedPartitionIds.join(', ') : 'NONE / IDLE'}
          </li>
        ))}
      </ul>
    </div>
  );
}
