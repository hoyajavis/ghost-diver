// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionConfig, MotionGlobalConfig } from 'motion/react';
import { TrainingSim } from '../TrainingSim';
import {
  COMBO_STEP_ADVANCE_MS,
  MISS_RETRY_MS,
  MISS_REVEAL_MS,
  PROBLEM_ADVANCE_MS,
} from '../../lib/combatLogic';
import { resetMemoryCacheForTests } from '../../lib/storage';
import { MathProblem } from '../../types';

MotionGlobalConfig.skipAnimations = true;

const { generateProblemMock } = vi.hoisted(() => ({
  generateProblemMock: vi.fn(),
}));

vi.mock('../../lib/mathEngine', () => ({
  generateProblem: generateProblemMock,
}));

function makeComboProblem(id = 1): MathProblem {
  return {
    type: 'ATTACK',
    question: `Solve for x: 2x + 4 = ${10 + id * 2}`,
    answer: 3 + id,
    inputType: 'NUMPAD',
    category: 'PROCEDURAL',
    complexity: 'COMBO',
    steps: [
      {
        prompt: `Step 1: Subtract 4 from ${10 + id * 2}. What is 2x?`,
        answer: 6 + id * 2,
        inputType: 'NUMPAD',
        clue: 'Undo +4 by subtracting 4 from both sides.',
        resultLabel: `2x = ${6 + id * 2}`,
      },
      {
        prompt: `Step 2: Divide ${6 + id * 2} by 2. What is x?`,
        answer: 3 + id,
        inputType: 'NUMPAD',
        clue: 'Divide both sides by 2 to isolate x.',
        resultLabel: `x = ${3 + id}`,
      },
    ],
  };
}

function submitNumericKeys(value: string) {
  for (const ch of value) {
    fireEvent.keyDown(window, { key: ch });
  }
  fireEvent.keyDown(window, { key: 'Enter' });
}

beforeEach(() => {
  generateProblemMock.mockReset();
  generateProblemMock.mockReturnValue(makeComboProblem(1));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  resetMemoryCacheForTests();
  window.localStorage.clear();
});

describe('TrainingSim', () => {
  it('renders dialog, variant title, ProblemPromptCard, and ProblemInputRouter', () => {
    const onClose = vi.fn();
    render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={onClose} />
      </MotionConfig>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(/./);
    expect(screen.getByText('Training Sim')).toBeInTheDocument();
    expect(screen.getByText('Solve for x: 2x + 4 = 12')).toBeInTheDocument();
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
    // Numeric keypad submit button rendered via ProblemInputRouter -> DefaultInput -> NumberPad
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('starts COMBO in Combo Chain mode, toggles Direct Strike (click and Shift+D), and toggles Clue banner', () => {
    render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={vi.fn()} />
      </MotionConfig>
    );

    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Subtract 4 from 12. What is 2x?')).toBeInTheDocument();

    // Toggle Clue button reveals Clue banner
    const clueBtn = screen.getByRole('button', { name: /Clue/i });
    expect(clueBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(clueBtn);
    expect(clueBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Clue: Undo +4 by subtracting 4 from both sides.'
    );

    // Toggle Direct Strike via button click
    fireEvent.click(screen.getByRole('button', { name: /Direct Strike/i }));
    expect(screen.queryByText('Step 1/2')).not.toBeInTheDocument();
    expect(screen.getByText(/DIRECT · 1-SHOT/i)).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    // Toggle back to Combo Chain via Shift+D
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();

    // Toggle to Direct Strike via Shift+D
    fireEvent.keyDown(window, { key: 'D', shiftKey: true });
    expect(screen.getByText(/DIRECT · 1-SHOT/i)).toBeInTheDocument();
  });

  it('advances breadcrumbs through combo steps, completes simulation, and loads next problem on Practice Again', () => {
    vi.useFakeTimers();
    generateProblemMock
      .mockReturnValueOnce(makeComboProblem(1))
      .mockReturnValueOnce(makeComboProblem(2));

    render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={vi.fn()} />
      </MotionConfig>
    );

    // Solve Step 1 (2x = 8)
    submitNumericKeys('8');
    expect(screen.getByText('Step Verified')).toBeInTheDocument();
    expect(screen.getByLabelText('Solved steps')).toHaveTextContent('2x = 8');

    act(() => {
      vi.advanceTimersByTime(COMBO_STEP_ADVANCE_MS);
    });

    // Now on Step 2/2
    expect(screen.getByText('Step 2/2')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Divide 8 by 2. What is x?')).toBeInTheDocument();

    // Solve Step 2 (x = 4)
    submitNumericKeys('4');
    act(() => {
      vi.advanceTimersByTime(PROBLEM_ADVANCE_MS);
    });

    expect(screen.getByText('Simulation Complete')).toBeInTheDocument();

    // Click Practice Again to generate the next problem
    fireEvent.click(screen.getByRole('button', { name: /Practice Again/i }));
    expect(generateProblemMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Solve for x: 2x + 4 = 14')).toBeInTheDocument();
    expect(screen.getByText('Step 1/2')).toBeInTheDocument();
  });

  it('shows Incorrect · Try Again on miss 1 and Incorrect · Expected: on miss 2', () => {
    vi.useFakeTimers();
    render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={vi.fn()} />
      </MotionConfig>
    );

    // Miss 1 on Step 1 (expected 8)
    submitNumericKeys('5');
    expect(screen.getByText('Incorrect · Try Again')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MISS_RETRY_MS);
    });

    // Miss 2 on Step 1 reveals expected answer
    submitNumericKeys('6');
    expect(screen.getByText('Incorrect · Expected: 8')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MISS_REVEAL_MS);
    });

    expect(screen.queryByText(/Incorrect/i)).not.toBeInTheDocument();
  });

  it('invokes onClose via close button and Escape key', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={onClose} />
      </MotionConfig>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close training simulator' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    const onCloseEsc = vi.fn();
    render(
      <MotionConfig reducedMotion="always">
        <TrainingSim variantId="1-1" onClose={onCloseEsc} />
      </MotionConfig>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseEsc).toHaveBeenCalledTimes(1);
  });
});
