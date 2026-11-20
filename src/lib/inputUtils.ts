import { InputType, MathProblem, MathStep } from '../types';

export function hasProblemSteps(problem: MathProblem): problem is MathProblem & { steps: MathStep[] } {
  return Array.isArray(problem.steps) && problem.steps.length > 0;
}

export function getCurrentStep(problem: MathProblem, hintStepIndex: number | null): MathStep | null {
  if (hintStepIndex === null || !hasProblemSteps(problem)) {
    return null;
  }
  return problem.steps[hintStepIndex] ?? null;
}

export function getExpectedAnswer(problem: MathProblem, hintStepIndex: number | null): string {
  const currentStep = getCurrentStep(problem, hintStepIndex);
  return currentStep ? currentStep.answer.toString() : problem.answer.toString();
}

export function getActiveChoices(problem: MathProblem, currentStep: MathStep | null): string[] | undefined {
  if (currentStep) {
    return currentStep.choices;
  }
  return problem.choices;
}

export function getActiveMultiSelectOptions(
  problem: MathProblem,
  currentStep: MathStep | null
): string[] | undefined {
  if (currentStep) {
    // Only reuse multi-select options if the step expects comma-separated options from that pool
    if (problem.multiSelectOptions && currentStep.answer.toString().includes(',')) {
      return problem.multiSelectOptions;
    }
    return undefined;
  }
  return problem.multiSelectOptions;
}

export function getRequireSimplified(problem: MathProblem, currentStep: MathStep | null): boolean {
  if (currentStep) {
    return Boolean(currentStep.requireSimplified);
  }
  return Boolean(problem.requireSimplified);
}

export function inferInputType(problem: MathProblem, currentStep: MathStep | null): InputType {
  if (currentStep) {
    if (currentStep.inputType) return currentStep.inputType;
    const expected = currentStep.answer.toString();
    if (expected.includes('/')) return 'FRACTION';
    if (expected.includes(':')) return 'RATIO';
    if (expected.includes(',')) return 'COORDINATE';
    if (['<', '>', '=', '≤', '≥'].includes(expected)) return 'RELATIONSHIP';
    if (
      expected.includes('<') ||
      expected.includes('>') ||
      expected.includes('≤') ||
      expected.includes('≥')
    ) {
      return 'INEQUALITY';
    }
    return 'NUMPAD';
  }
  return problem.inputType ?? 'NUMPAD';
}
