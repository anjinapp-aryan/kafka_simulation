import { PHASE3_PROVEN_ASSIGNMENTS, PHASE3_SOURCE_NOTE } from '../../models/phase3Evidence';

export function EvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 3</span>
      <ul className="evidence-list">
        {PHASE3_PROVEN_ASSIGNMENTS.map((c) => (
          <li key={c.consumerCount}>
            {c.consumerCount} consumer{c.consumerCount > 1 ? 's' : ''}: {c.assignment}
          </li>
        ))}
      </ul>
      <p className="placeholder">{PHASE3_SOURCE_NOTE}</p>
      <p className="placeholder">
        <span className="evidence-tag evidence-tag-simulation">SIMULATION</span> The interactive
        diagram above reproduces this same assignment shape on demand, but partition routing and
        record content are illustrative, not live broker data.
      </p>
    </div>
  );
}
