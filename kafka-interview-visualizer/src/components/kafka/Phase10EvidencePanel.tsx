import { PHASE10_PROVEN, PHASE10_LIMITATION_NOTE } from '../../models/phase10Evidence';

export function Phase10EvidencePanel() {
  return (
    <div className="evidence-panel">
      <span className="evidence-tag evidence-tag-proven">PROVEN — Phase 10 (transactions / EOS)</span>
      <ul className="evidence-list">
        {PHASE10_PROVEN.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="placeholder">
        <span className="evidence-tag evidence-tag-conceptual">CONCEPTUAL</span> {PHASE10_LIMITATION_NOTE}
      </p>
    </div>
  );
}
