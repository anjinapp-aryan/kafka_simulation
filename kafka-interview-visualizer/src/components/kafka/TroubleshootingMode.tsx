import { PRODUCTION_SCENARIOS } from '../../models/productionScenarios';

/** Commands actually used in the Phase 0-10 lab - no invented commands. */
const COMMANDS: { label: string; cmd: string; reads: string }[] = [
  {
    label: 'Consumer group state, per-partition lag',
    cmd: 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group <group>',
    reads: 'CURRENT-OFFSET, LOG-END-OFFSET, LAG per partition, plus member/host/client-id.',
  },
  {
    label: 'Group members and their partition assignment',
    cmd: 'kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group <group> --members --verbose',
    reads: 'Which consumer owns which partitions - and which members own zero (idle).',
  },
  {
    label: 'Topic layout: leader, replicas, ISR',
    cmd: 'kafka-topics.sh --bootstrap-server localhost:9092 --topic <topic> --describe',
    reads: 'PartitionCount, ReplicationFactor, and per-partition Leader / Replicas / Isr.',
  },
  {
    label: 'Only the partitions missing replicas',
    cmd: 'kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions',
    reads: 'Partitions where ISR is smaller than the replication factor.',
  },
  {
    label: 'Current log-end offsets (how much data exists)',
    cmd: 'kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic <topic> --time -1',
    reads: 'topic:partition:offset - the end of each partition log.',
  },
  {
    label: 'Read a specific partition/offset to verify content',
    cmd: 'kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic <topic> --partition 0 --offset 5 --max-messages 2 --isolation-level read_committed',
    reads: 'The actual records - use read_committed to exclude aborted transactional data.',
  },
];

export function TroubleshootingMode() {
  return (
    <div className="troubleshooting-mode">
      <p className="placeholder">
        Symptom-first production troubleshooting. Every scenario below cites the Phase 0-10 evidence
        it is based on; the commands are the ones actually used in the lab.
      </p>

      <h3>Scenarios</h3>
      <ul className="scenario-list">
        {PRODUCTION_SCENARIOS.map((s) => (
          <li className="scenario-card" key={s.symptom}>
            <div className="interview-label">Symptom</div>
            <p>{s.symptom}</p>
            <div className="interview-label">First checks</div>
            <p>{s.whatICheck}</p>
            <div className="interview-label">Why</div>
            <p>{s.why}</p>
            <div className="interview-label">Likely root cause</div>
            <p>{s.rootCause}</p>
            <div className="interview-label">Fix</div>
            <p>{s.fix}</p>
            <div className="interview-label">Common trap</div>
            <p>{s.commonTrap}</p>
          </li>
        ))}
      </ul>

      <h3>Kafka commands (used in this lab)</h3>
      <ul className="command-list">
        {COMMANDS.map((c) => (
          <li key={c.label}>
            <div className="interview-label">{c.label}</div>
            <pre className="command-block">{c.cmd}</pre>
            <p className="placeholder">{c.reads}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
