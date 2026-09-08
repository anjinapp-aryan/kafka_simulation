import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useAppStore } from './store';
import { PHASES } from './phases';

describe('App shell', () => {
  beforeEach(() => {
    useAppStore.setState({ activePhaseId: PHASES[0].id });
  });

  it('shows the P0 title by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: PHASES[0].title })).toBeInTheDocument();
  });

  it('updates the visualization panel title when a phase is selected', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'P9' }));
    const p9 = PHASES.find((p) => p.id === 'P9')!;
    expect(screen.getByRole('heading', { name: p9.title })).toBeInTheDocument();
  });
});
