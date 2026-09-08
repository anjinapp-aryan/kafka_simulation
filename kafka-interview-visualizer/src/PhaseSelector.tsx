import { PHASES } from './phases';
import { useAppStore } from './store';

export function PhaseSelector() {
  const activePhaseId = useAppStore((s) => s.activePhaseId);
  const setActivePhase = useAppStore((s) => s.setActivePhase);

  return (
    <nav className="phase-selector" aria-label="Phase navigation">
      {PHASES.map((phase) => (
        <button
          key={phase.id}
          className={phase.id === activePhaseId ? 'phase-btn active' : 'phase-btn'}
          onClick={() => setActivePhase(phase.id)}
          aria-current={phase.id === activePhaseId ? 'true' : undefined}
        >
          {phase.label}
        </button>
      ))}
    </nav>
  );
}
