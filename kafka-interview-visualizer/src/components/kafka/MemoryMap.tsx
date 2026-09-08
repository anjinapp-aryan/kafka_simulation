const MAP = [
  'PRODUCER',
  '   |  acks + retries + idempotence          -> Phase 7',
  '   v',
  'KAFKA',
  '   |  partitions + RF + ISR                 -> Phase 1 / 9',
  '   v',
  'CONSUMER GROUP',
  '   |  poll + process + commit               -> Phase 3 / 5 / 6',
  '   v',
  'BUSINESS EFFECT',
  '   |  payment_id idempotency                -> Phase 10',
  '   v',
  'DATABASE',
].join('\n');

const LINKS = [
  ['Producer reliability', 'Phase 7'],
  ['Consumer reliability', 'Phase 5 / 6'],
  ['Performance and lag', 'Phase 8'],
  ['Broker durability', 'Phase 9'],
  ['Kafka EOS', 'Phase 10'],
  ['Business exactly-once effect', 'Idempotency + DB transaction (CONCEPTUAL)'],
];

export function MemoryMap() {
  return (
    <div className="memory-map">
      <pre className="memory-map-diagram">{MAP}</pre>
      <ul className="assignment-list">
        {LINKS.map(([concept, phase]) => (
          <li key={concept}>
            <strong>{concept}</strong> - {phase}
          </li>
        ))}
      </ul>
    </div>
  );
}
