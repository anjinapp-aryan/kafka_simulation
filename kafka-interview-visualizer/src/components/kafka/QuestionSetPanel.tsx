import { useState } from 'react';
import type { InterviewQA } from '../../models/interviewQuestions';

function QuestionCard({ qa }: { qa: InterviewQA }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="qa-card">
      <button className="qa-card-header" onClick={() => setExpanded((v) => !v)}>
        <span className="qa-priority">{qa.priority}</span>
        <span className="qa-question">{qa.question}</span>
      </button>
      <p className="qa-simple">{qa.simple}</p>
      {!expanded && (
        <button className="reveal-answer-btn" onClick={() => setExpanded(true)}>
          Reveal Answer
        </button>
      )}
      {expanded && (
        <div className="qa-details">
          <div>
            <div className="interview-label">Senior answer</div>
            <p>{qa.senior}</p>
          </div>
          <div>
            <div className="interview-label">Why?</div>
            <p>{qa.why}</p>
          </div>
          <div>
            <div className="interview-label">Production example</div>
            <p>{qa.production}</p>
          </div>
          <div>
            <div className="interview-label">Common trap</div>
            <p>{qa.trap}</p>
          </div>
          <div className="interview-memory">
            <div className="interview-label">Memory sentence</div>
            <p>{qa.memory}</p>
          </div>
        </div>
      )}
    </li>
  );
}

export function QuestionSetPanel({ questions }: { questions: InterviewQA[] }) {
  return (
    <ul className="qa-list">
      {questions.map((qa) => (
        <QuestionCard key={qa.question} qa={qa} />
      ))}
    </ul>
  );
}
