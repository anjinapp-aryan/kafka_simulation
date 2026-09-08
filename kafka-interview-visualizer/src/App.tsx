import { PhaseSelector } from './PhaseSelector';
import { PHASES } from './phases';
import { useAppStore } from './store';
import './App.css';

function App() {
  const activePhaseId = useAppStore((s) => s.activePhaseId);
  const activePhase = PHASES.find((p) => p.id === activePhaseId) ?? PHASES[0];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kafka Interview Visualizer</h1>
      </header>

      <PhaseSelector />

      <section className="panel panel-visualization">
        <h2>{activePhase.title}</h2>
        <p className="placeholder">Visualization for {activePhase.id} — coming in a later step.</p>
      </section>

      <section className="panel panel-timeline">
        <h3>Event Timeline</h3>
        <p className="placeholder">No events yet.</p>
      </section>

      <section className="panel panel-metrics">
        <h3>Metrics</h3>
        <p className="placeholder">No metrics yet.</p>
      </section>

      <section className="panel panel-interview">
        <h3>Interview Explanation</h3>
        <p className="placeholder">Select a phase to see its interview explanation.</p>
      </section>
    </div>
  );
}

export default App;
