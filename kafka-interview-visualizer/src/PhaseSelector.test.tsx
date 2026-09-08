import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PhaseSelector } from './PhaseSelector';
import { useAppStore } from './store';
import { PHASES } from './phases';

describe('PhaseSelector', () => {
  beforeEach(() => {
    useAppStore.setState({ activePhaseId: PHASES[0].id });
  });

  it('renders a button for every phase', () => {
    render(<PhaseSelector />);
    for (const phase of PHASES) {
      expect(screen.getByRole('button', { name: phase.label })).toBeInTheDocument();
    }
  });

  it('marks P0 active by default', () => {
    render(<PhaseSelector />);
    expect(screen.getByRole('button', { name: 'P0' })).toHaveAttribute('aria-current', 'true');
  });

  it('switches active phase on click and updates the store', () => {
    render(<PhaseSelector />);
    fireEvent.click(screen.getByRole('button', { name: 'P6' }));
    expect(useAppStore.getState().activePhaseId).toBe('P6');
    expect(screen.getByRole('button', { name: 'P6' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'P0' })).not.toHaveAttribute('aria-current');
  });
});
