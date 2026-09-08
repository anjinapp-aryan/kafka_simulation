import { useState } from 'react';
import { SAGA_CONCEPTUAL } from '../../models/phase10Evidence';

const STEPS = ['Debit Account', 'Reserve Funds', 'Process Payment'] as const;

export function SagaPanel() {
  const [failAt, setFailAt] = useState<number | null>(2); // Process Payment fails by default

  return (
    <div className="saga-panel">
      <span className="evidence-tag evidence-tag-conceptual">
        CONCEPTUAL — no Saga framework was executed in this lab
      </span>

      <div className="saga-flow">
        {STEPS.map((step, i) => {
          const failed = failAt === i;
          const skipped = failAt !== null && i > failAt;
          return (
            <div key={step} className={'saga-step' + (failed ? ' saga-step-failed' : skipped ? ' saga-step-skipped' : ' saga-step-ok')}>
              {step} {failed ? '✗' : skipped ? '—' : '✓'}
            </div>
          );
        })}
      </div>

      {failAt !== null && (
        <div className="saga-compensation">
          ↓ COMPENSATION: Credit Account back
        </div>
      )}

      <div className="saga-controls">
        <label>
          Fail at step:
          <select
            value={failAt === null ? 'none' : String(failAt)}
            onChange={(e) => setFailAt(e.target.value === 'none' ? null : Number(e.target.value))}
          >
            <option value="none">no failure — all succeed</option>
            {STEPS.map((s, i) => (
              <option key={s} value={i}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h4>Orchestration vs Choreography</h4>
      <div className="two-layer-diagram">
        <div className="layer-box">
          <div className="interview-label">Orchestration</div>
          <div className="placeholder">One Orchestrator explicitly calls Debit → Payment → Notification</div>
        </div>
        <div className="layer-box">
          <div className="interview-label">Choreography</div>
          <div className="placeholder">PaymentCreated → FundsDebited → PaymentCompleted (each service reacts)</div>
        </div>
      </div>

      <ul className="evidence-list">
        {SAGA_CONCEPTUAL.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
