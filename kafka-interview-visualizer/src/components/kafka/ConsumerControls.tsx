import { useAppStore } from '../../store';

export function ConsumerControls() {
  const addConsumer = useAppStore((s) => s.addConsumer);
  const removeConsumer = useAppStore((s) => s.removeConsumer);
  const consumerCount = useAppStore((s) => s.topology.consumerGroup.consumers.length);

  return (
    <div className="consumer-controls" title="Consumer = one application instance. Consumer Group = logical coordination unit that shares partitions.">
      <button onClick={removeConsumer} disabled={consumerCount <= 1}>
        − Consumer
      </button>
      <span className="consumer-count">{consumerCount} consumer(s)</span>
      <button onClick={addConsumer}>+ Consumer</button>
    </div>
  );
}
