import { useMemo } from 'react';
import { ReactFlow, Background, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store';
import { kafkaNodeTypes } from './nodes';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 70;
const ROW_SPACING = 130;

function centeredX(index: number, count: number, spacing: number) {
  return index * spacing - ((count - 1) * spacing) / 2;
}

export function TopologyDiagram() {
  const topology = useAppStore((s) => s.topology);
  const selectedPartitionId = useAppStore((s) => s.selectedPartitionId);
  const selectPartition = useAppStore((s) => s.selectPartition);
  const lastRecordPartitionId = useAppStore((s) => s.lastRecordPartitionId);

  const { nodes, edges } = useMemo(() => {
    const partitionSpacing = Math.max(NODE_WIDTH + 20, 180);
    const consumerSpacing = Math.max(NODE_WIDTH + 20, 180);

    const nodes: Node[] = [
      {
        id: 'producer',
        type: 'producer',
        position: { x: 0 - NODE_WIDTH / 2, y: 0 },
        data: { name: topology.producerName },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      {
        id: 'topic',
        type: 'topic',
        position: { x: 0 - NODE_WIDTH / 2, y: ROW_SPACING },
        data: { name: topology.topicName },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      {
        id: 'group-label',
        type: 'groupLabel',
        position: { x: 0 - NODE_WIDTH / 2, y: ROW_SPACING * 3 },
        data: { name: topology.consumerGroup.id },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    ];

    // Visual boundary behind the consumer row: makes it obvious that
    // consumers belong to the GROUP, not directly to partitions/topic.
    const consumerCount = topology.consumerGroup.consumers.length;
    const boundaryWidth = consumerCount * consumerSpacing + 40;
    nodes.push({
      id: 'group-boundary',
      type: 'groupBoundary',
      position: { x: -boundaryWidth / 2, y: ROW_SPACING * 3 + 45 },
      data: { width: boundaryWidth, height: NODE_HEIGHT + 30 },
      draggable: false,
      selectable: false,
      zIndex: -1,
    });

    topology.partitions.forEach((p, i) => {
      nodes.push({
        id: p.id,
        type: 'partition',
        position: {
          x: centeredX(i, topology.partitions.length, partitionSpacing) - NODE_WIDTH / 2,
          y: ROW_SPACING * 2,
        },
        data: {
          id: p.id,
          recordCount: p.records.length,
          selected: p.id === selectedPartitionId,
          onClick: () => selectPartition(p.id === selectedPartitionId ? null : p.id),
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    topology.consumerGroup.consumers.forEach((c, i) => {
      nodes.push({
        id: c.id,
        type: 'consumer',
        position: {
          x: centeredX(i, topology.consumerGroup.consumers.length, consumerSpacing) - NODE_WIDTH / 2,
          y: ROW_SPACING * 4,
        },
        data: {
          id: c.id,
          idle: c.assignedPartitionIds.length === 0,
          assignedPartitionIds: c.assignedPartitionIds,
        },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    const edges: Edge[] = [
      { id: 'e-producer-topic', source: 'producer', target: 'topic' },
      ...topology.partitions.map((p) => ({
        id: `e-topic-${p.id}`,
        source: 'topic',
        target: p.id,
        animated: p.id === lastRecordPartitionId,
      })),
    ];

    for (const consumer of topology.consumerGroup.consumers) {
      for (const partitionId of consumer.assignedPartitionIds) {
        edges.push({
          id: `e-${partitionId}-${consumer.id}`,
          source: partitionId,
          target: consumer.id,
          label: 'owns',
          style: { stroke: 'var(--accent)' },
        });
      }
    }

    return { nodes, edges };
  }, [topology, selectedPartitionId, lastRecordPartitionId, selectPartition]);

  return (
    <div className="topology-diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={kafkaNodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
