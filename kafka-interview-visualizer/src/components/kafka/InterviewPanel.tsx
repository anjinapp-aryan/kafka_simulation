import { useState } from 'react';
import { INTERVIEW_CONTENT } from '../../models/interviewContent';

export function InterviewPanel({ phaseId }: { phaseId: string }) {
  const [showWhy, setShowWhy] = useState(false);
  const content = INTERVIEW_CONTENT[phaseId];

  if (!content) {
    return <p className="placeholder">Interview content for {phaseId} — coming in a later step.</p>;
  }

  return (
    <div className="interview-content">
      <div className="interview-block">
        <div className="interview-label">Question</div>
        <p>{content.question}</p>
      </div>
      <div className="interview-block">
        <div className="interview-label">Answer</div>
        <p>{content.answer}</p>
      </div>
      <div className="interview-block interview-memory">
        <div className="interview-label">Memory sentence</div>
        <p>{content.memorySentence}</p>
      </div>
      <div className="interview-block">
        <div className="interview-label">Production example</div>
        <p>{content.productionExample}</p>
      </div>
      <button className="why-btn" onClick={() => setShowWhy((v) => !v)}>
        {showWhy ? 'Hide' : 'Why?'}
      </button>
      {showWhy && (
        <div className="interview-block why-block">
          <div className="interview-label">{content.why.question}</div>
          <p>{content.why.answer}</p>
        </div>
      )}
    </div>
  );
}
