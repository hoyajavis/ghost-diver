// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionConfig, MotionGlobalConfig } from 'motion/react';
import { COLD_OPEN_SLIDES, ColdOpenModal } from '../ColdOpenModal';

MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ColdOpenModal', () => {
  it('renders the 3-slide transmission sequence and calls onComplete after the final slide', () => {
    const onComplete = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <ColdOpenModal slotId={2} onComplete={onComplete} />
      </MotionConfig>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/INCOMING TRANSMISSION · DIVER_02/i)).toBeInTheDocument();
    expect(screen.getByText(COLD_OPEN_SLIDES[0].headline)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next Signal/i }));
    expect(screen.getByText(COLD_OPEN_SLIDES[1].headline)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next Signal/i }));
    expect(screen.getByText(COLD_OPEN_SLIDES[2].headline)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Enter Cradle Bunker/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation (Enter/ArrowRight/ArrowLeft) and immediate skip via Escape or Skip button', () => {
    const onComplete = vi.fn();

    render(
      <MotionConfig reducedMotion="always">
        <ColdOpenModal slotId={1} onComplete={onComplete} />
      </MotionConfig>
    );

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(COLD_OPEN_SLIDES[1].headline)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(COLD_OPEN_SLIDES[0].headline)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
