import { useAppStore } from '../../store';
import { idleConsumerCount, parallelismCeiling } from '../../models/kafkaTopology';

export function MetricsPanel() {
  const topology = useAppStore((s) => s.topology);
  const idle = idleConsumerCount(topology);
  const ceiling = parallelismCeiling(topology);
  const consumerCount = topology.consumerGroup.consumers.length;

  return (
    <dl className="metrics-grid">
      <div>
        <dt>Partitions</dt>
        <dd>{topology.partitions.length}</dd>
      </div>
      <div>
        <dt>Consumers</dt>
        <dd>{consumerCount}</dd>
      </div>
      <div>
        <dt>Assigned</dt>
        <dd>{consumerCount - idle}</dd>
      </div>
      <div>
        <dt>Idle</dt>
        <dd>{idle}</dd>
      </div>
      <div>
        <dt>Parallelism ceiling</dt>
        <dd>{ceiling}</dd>
      </div>
    </dl>
  );
}
