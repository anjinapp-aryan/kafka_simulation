import { useState } from 'react';

type Acks = '0' | '1' | 'all';

interface SendResult {
  acks: Acks;
  idempotent: boolean;
  offset: number;
  hasOffset: boolean;
  rejected: boolean;
  rejectionReason: string | null;
  pid: number | null;
  epoch: number | null;
  sequence: number | null;
}

const IDEMPOTENT_PID = 3007; // PROVEN — Phase 7: "ProducerId set to 3007 with epoch 0"

export function ProducerReliabilityPanel() {
  const [acks, setAcks] = useState<Acks>('all');
  const [idempotent, setIdempotent] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [nextSequence, setNextSequence] = useState(0);
  const [lastResult, setLastResult] = useState<SendResult | null>(null);
  const [retrySimStep, setRetrySimStep] = useState(0);

  function send() {
    if (idempotent && acks !== 'all') {
      setLastResult({
        acks,
        idempotent,
        offset: -1,
        hasOffset: false,
        rejected: true,
        rejectionReason:
          'ConfigException: Must set acks to all in order to use the idempotent producer. Otherwise we cannot guarantee idempotence.',
        pid: null,
        epoch: null,
        sequence: null,
      });
      return;
    }

    if (acks === '0') {
      setLastResult({
        acks,
        idempotent,
        offset: -1,
        hasOffset: false,
        rejected: false,
        rejectionReason: null,
        pid: idempotent ? IDEMPOTENT_PID : null,
        epoch: idempotent ? 0 : null,
        sequence: idempotent ? nextSequence : null,
      });
      if (idempotent) setNextSequence((n) => n + 1);
      return;
    }

    const offset = nextOffset;
    setNextOffset((n) => n + 1);
    const sequence = idempotent ? nextSequence : null;
    if (idempotent) setNextSequence((n) => n + 1);
    setLastResult({
      acks,
      idempotent,
      offset,
      hasOffset: true,
      rejected: false,
      rejectionReason: null,
      pid: idempotent ? IDEMPOTENT_PID : null,
      epoch: idempotent ? 0 : null,
      sequence,
    });
  }

  const retrySteps = [
    'Attempt 1: Connection could not be established',
    'Attempt 2 (+104ms): Connection could not be established',
    'Attempt 3 (+152ms): Connection could not be established',
    'Attempt 4 (+255ms): Connection could not be established',
    '... (pattern continues, exponential backoff)',
    'Terminal: TimeoutException after 6185ms total (delivery.timeout.ms exceeded)',
  ];

  return (
    <div className="producer-reliability-panel">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — offsets/sequence numbers are per-click, not live broker state
      </span>

      <div className="producer-config-grid">
        <label>
          acks
          <select value={acks} onChange={(e) => setAcks(e.target.value as Acks)}>
            <option value="0">0 — no acknowledgement</option>
            <option value="1">1 — leader acknowledgement</option>
            <option value="all">all — ISR acknowledgement</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={idempotent}
            onChange={(e) => setIdempotent(e.target.checked)}
          />
          enable.idempotence
        </label>
      </div>

      <button onClick={send}>Send Record</button>

      {lastResult && (
        <div className="producer-send-result">
          {lastResult.rejected ? (
            <p className="commit-flow-result">
              REJECTED: <code>{lastResult.rejectionReason}</code>
            </p>
          ) : (
            <p>
              acks={lastResult.acks} → offset={lastResult.offset} hasOffset={String(lastResult.hasOffset)}
              {lastResult.pid !== null && (
                <>
                  {' '}
                  | PID={lastResult.pid} epoch={lastResult.epoch} sequence={lastResult.sequence}
                </>
              )}
            </p>
          )}
        </div>
      )}

      <h4>Producer Idempotence vs Business Idempotency</h4>
      <div className="two-layer-diagram">
        <div className="layer-box">
          <div className="interview-label">Producer Idempotence</div>
          <div className="placeholder">Producer → Kafka (PID + epoch + sequence dedup)</div>
        </div>
        <div className="layer-box">
          <div className="interview-label">Business Idempotency</div>
          <div className="placeholder">Kafka → Application → DB (payment_id check)</div>
        </div>
      </div>
      <p className="placeholder">These are separate layers — enabling one does not enable the other.</p>

      <h4>Retry / Timeout (PROVEN — Phase 7, unreachable broker)</h4>
      <button onClick={() => setRetrySimStep((s) => Math.min(s + 1, retrySteps.length))}>
        Step retry simulation
      </button>
      <ol className="retry-steps">
        {retrySteps.slice(0, retrySimStep).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
