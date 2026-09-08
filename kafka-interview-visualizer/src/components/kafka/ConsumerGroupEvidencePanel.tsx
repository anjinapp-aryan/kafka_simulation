import { PHASE3_PROVEN_ASSIGNMENTS, PHASE3_SOURCE_NOTE } from '../../models/phase3Evidence';
import { PHASE5_PROVEN, PHASE6_PROVEN, PHASE5_6_TIMING_NOTE } from '../../models/phase5And6Evidence';

export function ConsumerGroupEvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 3 (assignment)</span>
      <ul className="evidence-list">
        {PHASE3_PROVEN_ASSIGNMENTS.map((c) => (
          <li key={c.consumerCount}>
            {c.consumerCount} consumer{c.consumerCount > 1 ? 's' : ''}: {c.assignment}
          </li>
        ))}
      </ul>
      <p className="placeholder">{PHASE3_SOURCE_NOTE}</p>

      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 6 (failure / rebalance)</span>
      <ul className="evidence-list">
        {PHASE6_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="placeholder">{PHASE5_6_TIMING_NOTE}</p>

      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 5 (offsets / commits)</span>
      <ul className="evidence-list">
        {PHASE5_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <p className="placeholder">
        <span className="evidence-tag evidence-tag-simulation">SIMULATION</span> Everything above this
        line was observed against the live broker. The interactive controls in this tab (assignment,
        rebalance, offsets, commit-flow) reproduce the same shapes on demand but are not themselves
        live Kafka behavior.
      </p>
    </div>
  );
}
