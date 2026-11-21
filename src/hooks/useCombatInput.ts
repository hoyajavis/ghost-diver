import React, { useEffect } from 'react';
import { InputType } from '../types';
import { resolveRelationshipShortcutKey } from '../lib/inputUtils';

interface UseCombatInputProps {
  showSystemMenu: boolean;
  setShowSystemMenu: (show: boolean) => void;
  feedback: 'IDLE' | 'CORRECT' | 'WRONG';
  isIntro: boolean;
  onSkipIntro?: () => void;
  onToggleDirectStrike?: () => void;
  onTacticalHint?: () => void;
  onFocusScan?: () => void;
  onMeditation?: () => void;
  activeChoices?: string[];
  activeMultiSelectOptions?: string[];
  onToggleOption?: (option: string) => void;
  currentInputType: InputType;
  includeInclusiveRelationship?: boolean;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (overrideInput?: string) => void;
  fractionInput: { num: string; den: string };
  setFractionInput: React.Dispatch<React.SetStateAction<{ num: string; den: string }>>;
  fractionFocus: 'num' | 'den';
  setFractionFocus: React.Dispatch<React.SetStateAction<'num' | 'den'>>;
}

export function useCombatInput({
  showSystemMenu,
  setShowSystemMenu,
  feedback,
  isIntro,
  onSkipIntro,
  onToggleDirectStrike,
  onTacticalHint,
  onFocusScan,
  onMeditation,
  activeChoices,
  activeMultiSelectOptions,
  onToggleOption,
  currentInputType,
  includeInclusiveRelationship = false,
  setInput,
  handleSubmit,
  fractionInput,
  setFractionInput,
  fractionFocus,
  setFractionFocus,
}: UseCombatInputProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (showSystemMenu) {
        if (e.key === 'Escape') setShowSystemMenu(false);
        return;
      }

      if (isIntro) {
        if ((e.key === 'Enter' || e.key === ' ') && onSkipIntro) {
          e.preventDefault();
          onSkipIntro();
        }
        return;
      }

      if (feedback !== 'IDLE') return;

      if (e.shiftKey) {
        const upper = e.key.toUpperCase();
        if (upper === 'D' && onToggleDirectStrike) {
          e.preventDefault();
          onToggleDirectStrike();
          return;
        }
        if (upper === 'H' && onTacticalHint) {
          e.preventDefault();
          onTacticalHint();
          return;
        }
        if (upper === 'S' && onFocusScan) {
          e.preventDefault();
          onFocusScan();
          return;
        }
        if (upper === 'F' && onMeditation) {
          e.preventDefault();
          onMeditation();
          return;
        }
      }

      if (activeChoices && activeChoices.length > 0) {
        if (!e.shiftKey) {
          const key = e.key.toUpperCase();
          const choiceIndex = ['A', 'B', 'C', 'D'].indexOf(key);
          if (choiceIndex !== -1 && choiceIndex < activeChoices.length) {
            setInput(activeChoices[choiceIndex]);
            handleSubmit(activeChoices[choiceIndex]);
            return;
          }
          if (['1', '2', '3', '4'].includes(key)) {
            const numIndex = parseInt(key, 10) - 1;
            if (numIndex < activeChoices.length) {
              setInput(activeChoices[numIndex]);
              handleSubmit(activeChoices[numIndex]);
              return;
            }
          }
        }
        if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (activeMultiSelectOptions && activeMultiSelectOptions.length > 0) {
        if (/^[1-9]$/.test(e.key) && onToggleOption) {
          const optionIndex = parseInt(e.key, 10) - 1;
          if (optionIndex < activeMultiSelectOptions.length) {
            onToggleOption(activeMultiSelectOptions[optionIndex]);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (currentInputType === 'FRACTION' || currentInputType === 'RATIO') {
        const allowedKeyPattern = currentInputType === 'RATIO' ? /^[0-9]$/ : /^[0-9\-]$/;
        if (allowedKeyPattern.test(e.key)) {
          setFractionInput(prev => ({
            ...prev,
            [fractionFocus]: prev[fractionFocus] + e.key
          }));
        } else if (e.key === 'Backspace') {
          setFractionInput(prev => ({
            ...prev,
            [fractionFocus]: prev[fractionFocus].slice(0, -1)
          }));
        } else if (e.key === 'Tab' || e.key === '/' || e.key === ':') {
          e.preventDefault();
          setFractionFocus(prev => prev === 'num' ? 'den' : 'num');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (fractionFocus === 'num' && fractionInput.num.length > 0 && fractionInput.den.length === 0) {
            setFractionFocus('den');
          } else {
            handleSubmit();
          }
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (currentInputType === 'RELATIONSHIP') {
        const resolved = resolveRelationshipShortcutKey(
          e.key,
          e.shiftKey,
          includeInclusiveRelationship
        );
        if (resolved) {
          setInput(resolved);
          handleSubmit(resolved);
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (currentInputType === 'INEQUALITY') {
        if (/^[0-9.<>=\-≤≥]$/.test(e.key)) {
          setInput(prev => prev + e.key);
        } else if (e.key === 'Backspace') {
          setInput(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (currentInputType === 'COORDINATE') {
        if (/^[0-9.,\-]$/.test(e.key)) {
          setInput(prev => prev + e.key);
        } else if (e.key === 'Backspace') {
          setInput(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (/^[0-9.\-]$/.test(e.key)) {
        setInput(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        setShowSystemMenu(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSystemMenu, setShowSystemMenu, feedback, isIntro,
    onSkipIntro, onToggleDirectStrike, onTacticalHint, onFocusScan, onMeditation,
    activeChoices, activeMultiSelectOptions, onToggleOption, currentInputType,
    includeInclusiveRelationship,
    setInput, handleSubmit, fractionInput, setFractionInput, fractionFocus, setFractionFocus
  ]);
}
