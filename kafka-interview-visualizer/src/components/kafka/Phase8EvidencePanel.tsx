import { PHASE8_PROVEN, PHASE8_LIMITATION_NOTE } from '../../models/phase8Evidence';

export function Phase8EvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 8 (performance / lag)</span>
      <ul className="evidence-list">
        {PHASE8_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="placeholder">{PHASE8_LIMITATION_NOTE}</p>
    </div>
  );
}
