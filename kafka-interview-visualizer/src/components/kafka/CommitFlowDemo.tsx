import { useAppStore } from '../../store';

export function CommitFlowDemo() {
  const commitFlow = useAppStore((s) => s.commitFlow);
  const setMode = useAppStore((s) => s.setCommitFlowMode);
  const poll = useAppStore((s) => s.commitFlowPoll);
  const process = useAppStore((s) => s.commitFlowProcess);
  const commit = useAppStore((s) => s.commitFlowCommit);
  const crash = useAppStore((s) => s.commitFlowCrash);
  const restart = useAppStore((s) => s.commitFlowRestart);

  return (
    <div className="commit-flow-demo">
      <span className="evidence-tag evidence-tag-simulation">
        SIMULATION — reproduces Phase 5 failure-window mechanics
      </span>

      <div className="commit-flow-mode">
        <label>
          <input
            type="radio"
            name="commit-flow-mode"
            checked={commitFlow.mode === 'process-then-commit'}
            onChange={() => setMode('process-then-commit')}
          />
          Mode A — Process → Commit (at-least-once)
        </label>
        <label>
          <input
            type="radio"
            name="commit-flow-mode"
            checked={commitFlow.mode === 'commit-then-process'}
            onChange={() => setMode('commit-then-process')}
          />
          Mode B — Commit → Process (at-most-once)
        </label>
      </div>

      <p className="placeholder">Record: PAY-1001</p>

      <div className="commit-flow-controls">
        <button onClick={poll} disabled={commitFlow.polled}>
          Poll
        </button>
        <button
          onClick={process}
          disabled={!commitFlow.polled || commitFlow.crashed || commitFlow.processed}
        >
          Process
        </button>
        <button
          onClick={commit}
          disabled={!commitFlow.polled || commitFlow.crashed || commitFlow.committed}
        >
          Commit
        </button>
        <button onClick={crash} disabled={!commitFlow.polled || commitFlow.crashed} className="danger-btn">
          💥 Crash
        </button>
        <button onClick={restart} disabled={!commitFlow.crashed}>
          Restart
        </button>
      </div>

      <ul className="commit-flow-status">
        <li>Polled: {commitFlow.polled ? 'YES' : 'no'}</li>
        <li>Processed: {commitFlow.processed ? 'YES' : 'no'}</li>
        <li>Committed: {commitFlow.committed ? 'YES' : 'no'}</li>
        <li>Crashed: {commitFlow.crashed ? '💥 YES' : 'no'}</li>
      </ul>

      {commitFlow.resultLabel && (
        <p className="commit-flow-result">
          Restart result: <strong>{commitFlow.resultLabel}</strong>
        </p>
      )}
    </div>
  );
}
