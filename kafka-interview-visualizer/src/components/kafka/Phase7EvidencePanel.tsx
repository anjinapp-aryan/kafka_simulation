import { PHASE7_PROVEN, PHASE7_LIMITATION_NOTE } from '../../models/phase7Evidence';

export function Phase7EvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 7 (producer reliability)</span>
      <ul className="evidence-list">
        {PHASE7_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="placeholder">{PHASE7_LIMITATION_NOTE}</p>
    </div>
  );
}
