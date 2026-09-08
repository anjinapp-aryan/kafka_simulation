import { useMemo, useState } from 'react';
import { QUESTION_BANK, availableTopics, type BankQuestion, type Topic } from '../../models/questionBank';
import { useInterviewStore } from '../../interviewStore';
import { useAppStore } from '../../store';

type PriorityFilter = 'All' | '🔥🔥🔥' | '🔥🔥' | '🔥';

/** Interview Mode: one question at a time, answer hidden until revealed. */
export function InterviewMode({ restrictTopic }: { restrictTopic?: Topic }) {
  const [topic, setTopic] = useState<Topic | 'All'>(restrictTopic ?? 'All');
  const [priority, setPriority] = useState<PriorityFilter>('All');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const mastered = useInterviewStore((s) => s.mastered);
  const difficult = useInterviewStore((s) => s.difficult);
  const toggleMastered = useInterviewStore((s) => s.toggleMastered);
  const toggleDifficult = useInterviewStore((s) => s.toggleDifficult);
  const setMode = useInterviewStore((s) => s.setMode);
  const setActivePhase = useAppStore((s) => s.setActivePhase);

  const effectiveTopic = restrictTopic ?? topic;

  const questions = useMemo(() => {
    let list: BankQuestion[] = QUESTION_BANK;
    if (effectiveTopic !== 'All') list = list.filter((q) => q.topic === effectiveTopic);
    if (priority !== 'All') list = list.filter((q) => q.priority === priority);
    return list;
  }, [effectiveTopic, priority]);

  const current = questions[Math.min(index, Math.max(questions.length - 1, 0))];

  function go(delta: number) {
    setRevealed(false);
    setIndex((i) => {
      const next = i + delta;
      if (next < 0) return questions.length - 1;
      if (next >= questions.length) return 0;
      return next;
    });
  }

  function changeFilter(fn: () => void) {
    fn();
    setIndex(0);
    setRevealed(false);
  }

  const masteredCount = questions.filter((q) => mastered[q.id]).length;

  function openProof(phase: string) {
    setActivePhase(phase);
    setMode('learn');
  }

  return (
    <div className="interview-mode">
      <div className="interview-filters">
        {!restrictTopic && (
          <label>
            Topic
            <select
              value={topic}
              onChange={(e) => changeFilter(() => setTopic(e.target.value as Topic | 'All'))}
              aria-label="Topic"
            >
              <option value="All">All topics</option>
              {availableTopics().map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Priority
          <select
            value={priority}
            onChange={(e) => changeFilter(() => setPriority(e.target.value as PriorityFilter))}
            aria-label="Priority"
          >
            <option value="All">All priorities</option>
            <option value="🔥🔥🔥">🔥🔥🔥 must know</option>
            <option value="🔥🔥">🔥🔥 should know</option>
            <option value="🔥">🔥 advanced</option>
          </select>
        </label>
        <span className="interview-progress">
          Mastered {masteredCount} / {questions.length}
        </span>
      </div>

      {!current ? (
        <p className="placeholder">No questions match this filter.</p>
      ) : (
        <div className="interview-card">
          <div className="interview-card-meta">
            <span className="qa-priority">{current.priority}</span>
            <span className="interview-topic-badge">{current.topic}</span>
            <span className="placeholder">
              {index + 1} of {questions.length}
            </span>
          </div>

          <h3 className="interview-question">{current.question}</h3>

          {!revealed ? (
            <button className="reveal-answer-btn" onClick={() => setRevealed(true)}>
              REVEAL ANSWER
            </button>
          ) : (
            <div className="qa-details">
              <div>
                <div className="interview-label">Simple answer</div>
                <p>{current.simple}</p>
              </div>
              <div>
                <div className="interview-label">Senior answer</div>
                <p>{current.senior}</p>
              </div>
              <div>
                <div className="interview-label">Why?</div>
                <p>{current.why}</p>
              </div>
              <div>
                <div className="interview-label">Production example</div>
                <p>{current.production}</p>
              </div>
              <div>
                <div className="interview-label">Common trap</div>
                <p>{current.trap}</p>
              </div>
              <div className="interview-memory">
                <div className="interview-label">Memory line</div>
                <p>{current.memory}</p>
              </div>
              <div>
                <div className="interview-label">Interviewer may ask next</div>
                <ul className="record-list">
                  {current.followUps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="connected-evidence">
                <div className="interview-label">Connected evidence</div>
                <p>{current.evidenceLabel}</p>
                {current.evidencePhase && (
                  <button onClick={() => openProof(current.evidencePhase!)}>
                    VIEW PROOF ({current.evidencePhase})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="interview-actions">
            <button onClick={() => go(-1)}>◀ Previous</button>
            <button onClick={() => go(1)}>Next ▶</button>
            <button
              className={mastered[current.id] ? 'marked' : ''}
              onClick={() => toggleMastered(current.id)}
            >
              {mastered[current.id] ? '✓ Mastered' : 'Mark mastered'}
            </button>
            <button
              className={difficult[current.id] ? 'marked' : ''}
              onClick={() => toggleDifficult(current.id)}
            >
              {difficult[current.id] ? '★ Difficult' : 'Mark difficult'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
