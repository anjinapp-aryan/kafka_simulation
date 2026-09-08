import { PhaseSelector } from './PhaseSelector';
import { PHASES } from './phases';
import { useAppStore } from './store';
import { TopologyDiagram } from './components/kafka/TopologyDiagram';
import { ConsumerControls } from './components/kafka/ConsumerControls';
import { RebalanceControls } from './components/kafka/RebalanceControls';
import { AssignmentPanel } from './components/kafka/AssignmentPanel';
import { SendRecordPanel } from './components/kafka/SendRecordPanel';
import { PartitionDetailPanel } from './components/kafka/PartitionDetailPanel';
import { OffsetLagPanel } from './components/kafka/OffsetLagPanel';
import { CommitFlowDemo } from './components/kafka/CommitFlowDemo';
import { MetricsPanel } from './components/kafka/MetricsPanel';
import { EvidencePanel } from './components/kafka/EvidencePanel';
import { ConsumerGroupEvidencePanel } from './components/kafka/ConsumerGroupEvidencePanel';
import { InterviewPanel } from './components/kafka/InterviewPanel';
import { QuestionSetPanel } from './components/kafka/QuestionSetPanel';
import { ProducerReliabilityPanel } from './components/kafka/ProducerReliabilityPanel';
import { Phase7EvidencePanel } from './components/kafka/Phase7EvidencePanel';
import { LagSimulatorPanel } from './components/kafka/LagSimulatorPanel';
import { Phase8EvidencePanel } from './components/kafka/Phase8EvidencePanel';
import { ReplicationPanel } from './components/kafka/ReplicationPanel';
import { Phase9EvidencePanel } from './components/kafka/Phase9EvidencePanel';
import { TransactionPanel } from './components/kafka/TransactionPanel';
import { SagaPanel } from './components/kafka/SagaPanel';
import { Phase10EvidencePanel } from './components/kafka/Phase10EvidencePanel';
import { ProductionScenariosPanel } from './components/kafka/ProductionScenariosPanel';
import {
  P3_INTERVIEW_QUESTIONS,
  P7_INTERVIEW_QUESTIONS,
  P8_INTERVIEW_QUESTIONS,
  P9_INTERVIEW_QUESTIONS,
  P10_INTERVIEW_QUESTIONS,
} from './models/interviewQuestions';
import { useInterviewStore, type AppMode } from './interviewStore';
import { InterviewMode } from './components/kafka/InterviewMode';
import { TroubleshootingMode } from './components/kafka/TroubleshootingMode';
import { MemoryMap } from './components/kafka/MemoryMap';
import { ProgressSummary } from './components/kafka/ProgressSummary';
import './App.css';

const QUESTION_SETS: Record<string, typeof P3_INTERVIEW_QUESTIONS> = {
  P3: P3_INTERVIEW_QUESTIONS,
  P7: P7_INTERVIEW_QUESTIONS,
  P8: P8_INTERVIEW_QUESTIONS,
  P9: P9_INTERVIEW_QUESTIONS,
  P10: P10_INTERVIEW_QUESTIONS,
};

function LearnView() {
  const activePhaseId = useAppStore((s) => s.activePhaseId);
  const activePhase = PHASES.find((p) => p.id === activePhaseId) ?? PHASES[0];
  const timeline = useAppStore((s) => s.timeline);
  const hasTopologyVisualization = activePhaseId === 'P1';
  const hasConsumerGroupVisualization = activePhaseId === 'P3';
  const hasProducerReliability = activePhaseId === 'P7';
  const hasLagSimulation = activePhaseId === 'P8';
  const hasReplication = activePhaseId === 'P9';
  const hasTransactions = activePhaseId === 'P10';
  const questionSet = QUESTION_SETS[activePhaseId];
  const hasAnyVisualization =
    hasTopologyVisualization ||
    hasConsumerGroupVisualization ||
    hasProducerReliability ||
    hasLagSimulation ||
    hasReplication ||
    hasTransactions;

  return (
    <div className="app">
      <PhaseSelector />

      <section className="panel panel-visualization">
        <h2>{activePhase.title}</h2>
        {hasTopologyVisualization && (
          <div className="topology-section">
            <ConsumerControls />
            <TopologyDiagram />
            <SendRecordPanel />
            <PartitionDetailPanel />
          </div>
        )}
        {hasConsumerGroupVisualization && (
          <div className="topology-section">
            <p className="placeholder">
              A consumer group is a boundary: partitions belong to the topic, consumers belong to the
              group, and partition <em>ownership</em> is the group's assignment — not a global property
              of the consumer. A different group could independently consume this same topic (proven in
              Phase 4, not repeated here).
            </p>
            <ConsumerControls />
            <RebalanceControls />
            <TopologyDiagram />
            <AssignmentPanel />
            <SendRecordPanel />
            <PartitionDetailPanel />
            <h3>Offset / Commit / Lag</h3>
            <OffsetLagPanel />
            <h3>Commit-Flow Simulator</h3>
            <CommitFlowDemo />
            <p className="placeholder">
              <strong>Consumer alive ≠ consumer healthy.</strong> A crashed process (💥 Kill Consumer
              above) is detected by missed heartbeats. A consumer stuck in slow processing can miss{' '}
              <code>max.poll.interval.ms</code> and be evicted even though it never stopped
              heartbeating — see Interview panel, question 13.
            </p>
          </div>
        )}
        {hasProducerReliability && (
          <div className="topology-section">
            <ProducerReliabilityPanel />
          </div>
        )}
        {hasLagSimulation && (
          <div className="topology-section">
            <LagSimulatorPanel />
          </div>
        )}
        {hasReplication && (
          <div className="topology-section">
            <ReplicationPanel />
          </div>
        )}
        {hasTransactions && (
          <div className="topology-section">
            <TransactionPanel />
            <h3>Saga / Banking (CONCEPTUAL)</h3>
            <SagaPanel />
          </div>
        )}
        {!hasAnyVisualization && (
          <p className="placeholder">Visualization for {activePhase.id} — coming in a later step.</p>
        )}
      </section>

      <section className="panel panel-timeline">
        <h3>Event Timeline</h3>
        {timeline.length === 0 ? (
          <p className="placeholder">No events yet.</p>
        ) : (
          <>
            <span className="evidence-tag evidence-tag-simulation">SIMULATION</span>
            <ol className="timeline-list">
              {timeline
                .slice(-12)
                .reverse()
                .map((e) => (
                  <li key={e.id}>
                    <span className="timeline-time">{e.time}</span> {e.text}
                  </li>
                ))}
            </ol>
          </>
        )}
      </section>

      <section className="panel panel-metrics">
        <h3>Metrics</h3>
        {hasTopologyVisualization || hasConsumerGroupVisualization ? (
          <MetricsPanel />
        ) : (
          <p className="placeholder">No metrics yet.</p>
        )}
      </section>

      <section className="panel panel-interview">
        <h3>Interview Explanation</h3>
        {questionSet ? (
          <QuestionSetPanel questions={questionSet} />
        ) : (
          <InterviewPanel phaseId={activePhaseId} />
        )}
        {hasTopologyVisualization && <EvidencePanel />}
        {hasConsumerGroupVisualization && (
          <>
            <ConsumerGroupEvidencePanel />
            <ProductionScenariosPanel phase="P6" />
          </>
        )}
        {hasProducerReliability && (
          <>
            <Phase7EvidencePanel />
            <ProductionScenariosPanel phase="P7" />
          </>
        )}
        {hasLagSimulation && (
          <>
            <Phase8EvidencePanel />
            <ProductionScenariosPanel phase="P8" />
          </>
        )}
        {hasReplication && (
          <>
            <Phase9EvidencePanel />
            <ProductionScenariosPanel phase="P9" />
          </>
        )}
        {hasTransactions && (
          <>
            <Phase10EvidencePanel />
            <ProductionScenariosPanel phase="P10" />
          </>
        )}
      </section>
    </div>
  );
}

const MODES: { id: AppMode; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'interview', label: 'Interview' },
  { id: 'banking', label: 'Banking' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

function App() {
  const mode = useInterviewStore((s) => s.mode);
  const setMode = useInterviewStore((s) => s.setMode);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Kafka Senior Interview Lab</h1>
        <nav className="mode-nav" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={m.id === mode ? 'mode-btn active' : 'mode-btn'}
              aria-current={m.id === mode ? 'true' : undefined}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>

      {mode === 'learn' && <LearnView />}

      {mode === 'interview' && (
        <div className="app">
          <section className="panel">
            <h2>Interview Mode</h2>
            <InterviewMode />
          </section>
          <section className="panel">
            <h3>Progress</h3>
            <ProgressSummary />
          </section>
          <section className="panel">
            <h3>Memory Map</h3>
            <MemoryMap />
          </section>
        </div>
      )}

      {mode === 'banking' && (
        <div className="app">
          <section className="panel">
            <h2>Banking / Payment Track</h2>
            <p className="placeholder">
              Every question here answers: how would you make this safe for money movement?
            </p>
            <InterviewMode restrictTopic="Banking" />
          </section>
          <section className="panel">
            <h3>Memory Map</h3>
            <MemoryMap />
          </section>
        </div>
      )}

      {mode === 'troubleshooting' && (
        <div className="app">
          <section className="panel">
            <h2>Production Troubleshooting</h2>
            <TroubleshootingMode />
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
