import { QUESTION_BANK, availableTopics } from '../../models/questionBank';
import { useInterviewStore } from '../../interviewStore';

export function ProgressSummary() {
  const mastered = useInterviewStore((s) => s.mastered);
  const resetProgress = useInterviewStore((s) => s.resetProgress);

  const total = QUESTION_BANK.length;
  const masteredTotal = QUESTION_BANK.filter((q) => mastered[q.id]).length;

  const veryFrequent = QUESTION_BANK.filter((q) => q.priority === '🔥🔥🔥');
  const veryFrequentMastered = veryFrequent.filter((q) => mastered[q.id]).length;

  return (
    <div className="progress-summary">
      <p className="total-lag">
        Overall: {masteredTotal} / {total} mastered
      </p>
      <p className="placeholder">
        Must-know (🔥🔥🔥): {veryFrequentMastered} / {veryFrequent.length}
      </p>
      <ul className="assignment-list">
        {availableTopics().map((t) => {
          const qs = QUESTION_BANK.filter((q) => q.topic === t);
          const done = qs.filter((q) => mastered[q.id]).length;
          return (
            <li key={t}>
              {t}: {done} / {qs.length}
            </li>
          );
        })}
      </ul>
      <button onClick={resetProgress}>Reset progress</button>
    </div>
  );
}
