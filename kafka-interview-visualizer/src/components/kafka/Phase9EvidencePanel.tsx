import { PHASE9_PROVEN, PHASE9_LIMITATION_NOTE } from '../../models/phase9Evidence';

export function Phase9EvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 9 (replication / ISR / broker failure)</span>
      <ul className="evidence-list">
        {PHASE9_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="placeholder">{PHASE9_LIMITATION_NOTE}</p>
    </div>
  );
}
