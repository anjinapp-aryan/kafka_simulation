export interface Phase {
  id: string;
  label: string;
  title: string;
}

export const PHASES: Phase[] = [
  { id: 'P0', label: 'P0', title: 'Kafka Infrastructure' },
  { id: 'P1', label: 'P1', title: 'Producer / Topic / Partition' },
  { id: 'P2', label: 'P2', title: 'Consumer / poll() / Offset' },
  { id: 'P3', label: 'P3', title: 'Consumer Groups' },
  { id: 'P4', label: 'P4', title: 'Partition Assignment' },
  { id: 'P5', label: 'P5', title: 'Offset Commit / Delivery Semantics' },
  { id: 'P6', label: 'P6', title: 'Consumer Failure / Rebalancing' },
  { id: 'P7', label: 'P7', title: 'Producer Reliability' },
  { id: 'P8', label: 'P8', title: 'Performance / Consumer Lag' },
  { id: 'P9', label: 'P9', title: 'Replication / ISR / Broker Failure' },
  { id: 'P10', label: 'P10', title: 'Transactions / EOS / Saga / Banking' },
];
