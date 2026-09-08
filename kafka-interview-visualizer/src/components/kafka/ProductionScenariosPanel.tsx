import { PRODUCTION_SCENARIOS, type ProductionScenario } from '../../models/productionScenarios';

function ScenarioCard({ s }: { s: ProductionScenario }) {
  return (
    <li className="scenario-card">
      <div className="interview-label">Symptom</div>
      <p>{s.symptom}</p>
      <div className="interview-label">What I check</div>
      <p>{s.whatICheck}</p>
      <div className="interview-label">Why</div>
      <p>{s.why}</p>
      <div className="interview-label">Root cause</div>
      <p>{s.rootCause}</p>
      <div className="interview-label">Fix</div>
      <p>{s.fix}</p>
      <div className="interview-label">Common trap</div>
      <p>{s.commonTrap}</p>
    </li>
  );
}

export function ProductionScenariosPanel({ phase }: { phase: ProductionScenario['phase'] }) {
  const scenarios = PRODUCTION_SCENARIOS.filter((s) => s.phase === phase);
  if (scenarios.length === 0) return null;
  return (
    <div className="production-scenarios-panel">
      <h4>Production Scenarios</h4>
      <ul className="scenario-list">
        {scenarios.map((s) => (
          <ScenarioCard key={s.symptom} s={s} />
        ))}
      </ul>
    </div>
  );
}
