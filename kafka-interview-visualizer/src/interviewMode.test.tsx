import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useInterviewStore } from './interviewStore';
import { useAppStore } from './store';
import { QUESTION_BANK, questionsByTopic, availableTopics } from './models/questionBank';

function resetAll() {
  useInterviewStore.setState({ mode: 'learn', mastered: {}, difficult: {} });
  useAppStore.setState({ activePhaseId: 'P0' });
}

describe('question bank', () => {
  it('has 50-60 questions as targeted', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(50);
    expect(QUESTION_BANK.length).toBeLessThanOrEqual(60);
  });

  it('uses one normalized priority scheme only', () => {
    const allowed = new Set(['🔥🔥🔥', '🔥🔥', '🔥']);
    for (const q of QUESTION_BANK) expect(allowed.has(q.priority)).toBe(true);
  });

  it('every question has all required senior-answer fields plus follow-ups', () => {
    for (const q of QUESTION_BANK) {
      expect(q.simple.length).toBeGreaterThan(0);
      expect(q.senior.length).toBeGreaterThan(0);
      expect(q.why.length).toBeGreaterThan(0);
      expect(q.production.length).toBeGreaterThan(0);
      expect(q.trap.length).toBeGreaterThan(0);
      expect(q.memory.length).toBeGreaterThan(0);
      expect(q.followUps.length).toBeGreaterThan(0);
      expect(q.evidenceLabel.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = QUESTION_BANK.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filters by topic, and a Banking track exists', () => {
    expect(availableTopics()).toContain('Banking');
    const banking = questionsByTopic('Banking');
    expect(banking.length).toBeGreaterThan(0);
    for (const q of banking) expect(q.topic).toBe('Banking');
  });
});

describe('Interview Mode', () => {
  beforeEach(() => {
    resetAll();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Interview' }));
  });

  it('opens from the mode nav', () => {
    expect(screen.getByRole('heading', { name: 'Interview Mode' })).toBeInTheDocument();
    expect(useInterviewStore.getState().mode).toBe('interview');
  });

  it('hides the answer until REVEAL ANSWER is clicked', () => {
    expect(screen.getByRole('button', { name: 'REVEAL ANSWER' })).toBeInTheDocument();
    expect(screen.queryByText('Senior answer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'REVEAL ANSWER' }));

    expect(screen.getByText('Simple answer')).toBeInTheDocument();
    expect(screen.getByText('Senior answer')).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();
    expect(screen.getByText('Production example')).toBeInTheDocument();
    expect(screen.getByText('Common trap')).toBeInTheDocument();
    expect(screen.getByText('Memory line')).toBeInTheDocument();
  });

  it('shows interviewer follow-up questions after reveal', () => {
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL ANSWER' }));
    expect(screen.getByText('Interviewer may ask next')).toBeInTheDocument();
    expect(screen.getByText(/How would you troubleshoot it in production/)).toBeInTheDocument();
  });

  it('next and previous move through questions and re-hide the answer', () => {
    const first = screen.getByRole('heading', { level: 3, name: /\?/ }).textContent;
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL ANSWER' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next ▶' }));

    const second = screen.getByRole('heading', { level: 3, name: /\?/ }).textContent;
    expect(second).not.toBe(first);
    expect(screen.getByRole('button', { name: 'REVEAL ANSWER' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '◀ Previous' }));
    expect(screen.getByRole('heading', { level: 3, name: /\?/ }).textContent).toBe(first);
  });

  it('topic filter narrows the question set', () => {
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Banking' } });
    const bankingCount = questionsByTopic('Banking').length;
    expect(screen.getByText('1 of ' + bankingCount)).toBeInTheDocument();
  });

  it('priority filter narrows to must-know questions only', () => {
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: '🔥🔥🔥' } });
    const mustKnow = QUESTION_BANK.filter((q) => q.priority === '🔥🔥🔥').length;
    expect(screen.getByText('1 of ' + mustKnow)).toBeInTheDocument();
  });

  it('marking mastered updates progress and persists in the store', () => {
    fireEvent.click(screen.getByRole('button', { name: 'Mark mastered' }));
    expect(screen.getByRole('button', { name: '✓ Mastered' })).toBeInTheDocument();
    expect(Object.values(useInterviewStore.getState().mastered).filter(Boolean).length).toBe(1);
    expect(screen.getByText(/Mastered 1 \//)).toBeInTheDocument();
  });

  it('VIEW PROOF jumps to the backing phase in Learn mode', () => {
    fireEvent.click(screen.getByRole('button', { name: 'REVEAL ANSWER' }));
    const proof = screen.getByRole('button', { name: /VIEW PROOF/ });
    fireEvent.click(proof);
    expect(useInterviewStore.getState().mode).toBe('learn');
    expect(useAppStore.getState().activePhaseId).toBe('P1');
  });
});

describe('Banking track and Troubleshooting mode', () => {
  beforeEach(resetAll);

  it('Banking mode shows only banking questions', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Banking' }));
    expect(screen.getByRole('heading', { name: 'Banking / Payment Track' })).toBeInTheDocument();
    expect(screen.getByText('1 of ' + questionsByTopic('Banking').length)).toBeInTheDocument();
    // topic selector is hidden because the track is already restricted
    expect(screen.queryByLabelText('Topic')).not.toBeInTheDocument();
  });

  it('Troubleshooting mode shows scenarios and only lab-verified commands', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Troubleshooting' }));
    expect(screen.getByRole('heading', { name: 'Production Troubleshooting' })).toBeInTheDocument();
    expect(screen.getAllByText(/kafka-consumer-groups.sh --bootstrap-server/).length).toBeGreaterThan(0);
    expect(screen.getByText(/--under-replicated-partitions/)).toBeInTheDocument();
  });

  it('Learn mode still renders the phase selector (Step 1-8 regression)', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'P0' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Phase navigation' });
    expect(within(nav).getByRole('button', { name: 'P10' })).toBeInTheDocument();
  });
});
