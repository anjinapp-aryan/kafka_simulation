import { Handle, Position } from '@xyflow/react';

export function ProducerNode({ data }: { data: { name: string } }) {
  return (
    <div className="kafka-node kafka-node-producer">
      <div className="kafka-node-kind">Producer</div>
      <div className="kafka-node-title">{data.name}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function TopicNode({ data }: { data: { name: string } }) {
  return (
    <div className="kafka-node kafka-node-topic">
      <div className="kafka-node-kind">Topic</div>
      <div className="kafka-node-title">{data.name}</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function PartitionNode({
  data,
}: {
  data: { id: string; recordCount: number; selected: boolean; onClick: () => void };
}) {
  return (
    <div
      className={
        'kafka-node kafka-node-partition' + (data.selected ? ' kafka-node-selected' : '')
      }
      onClick={data.onClick}
      role="button"
      tabIndex={0}
      aria-label={`Partition ${data.id}`}
    >
      <div className="kafka-node-kind">Partition</div>
      <div className="kafka-node-title">{data.id}</div>
      <div className="kafka-node-sub">{data.recordCount} record(s)</div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export function GroupLabelNode({ data }: { data: { name: string } }) {
  return (
    <div className="kafka-node kafka-node-group-label">
      <div className="kafka-node-kind">Consumer Group</div>
      <div className="kafka-node-title">{data.name}</div>
    </div>
  );
}

export function ConsumerNode({
  data,
}: {
  data: { id: string; idle: boolean; assignedPartitionIds: string[] };
}) {
  return (
    <div
      className={
        'kafka-node kafka-node-consumer' + (data.idle ? ' kafka-node-idle' : '')
      }
    >
      <div className="kafka-node-kind">Consumer</div>
      <div className="kafka-node-title">{data.id}</div>
      <div className="kafka-node-sub">
        {data.idle ? 'IDLE — 0 partitions' : data.assignedPartitionIds.join(', ')}
      </div>
      <Handle type="target" position={Position.Top} />
    </div>
  );
}

export function GroupBoundaryNode({ data }: { data: { width: number; height: number } }) {
  return (
    <div
      className="kafka-node-group-boundary"
      style={{ width: data.width, height: data.height }}
      aria-hidden="true"
    />
  );
}

export const kafkaNodeTypes = {
  producer: ProducerNode,
  topic: TopicNode,
  partition: PartitionNode,
  groupLabel: GroupLabelNode,
  consumer: ConsumerNode,
  groupBoundary: GroupBoundaryNode,
};
