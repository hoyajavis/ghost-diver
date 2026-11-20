import React, { useEffect } from 'react';
import { InputType } from '../types';

interface UseCombatInputProps {
  showSystemMenu: boolean;
  setShowSystemMenu: (show: boolean) => void;
  feedback: 'IDLE' | 'CORRECT' | 'WRONG';
  isIntro: boolean;
  activeChoices?: string[];
  activeMultiSelectOptions?: string[];
  onToggleOption?: (option: string) => void;
  currentInputType: InputType;
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
  activeChoices,
  activeMultiSelectOptions,
  onToggleOption,
  currentInputType,
  setInput,
  handleSubmit,
  fractionInput,
  setFractionInput,
  fractionFocus,
  setFractionFocus
}: UseCombatInputProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSystemMenu) {
        if (e.key === 'Escape') setShowSystemMenu(false);
        return;
      }
      if (feedback !== 'IDLE' || isIntro) return;

      if (activeChoices && activeChoices.length > 0) {
        const key = e.key.toUpperCase();
        const choiceIndex = ['A', 'B', 'C', 'D'].indexOf(key);
        if (choiceIndex !== -1 && choiceIndex < activeChoices.length) {
          setInput(activeChoices[choiceIndex]);
          handleSubmit(activeChoices[choiceIndex]);
        } else if (['1', '2', '3', '4'].includes(key)) {
          const numIndex = parseInt(key, 10) - 1;
          if (numIndex < activeChoices.length) {
            setInput(activeChoices[numIndex]);
            handleSubmit(activeChoices[numIndex]);
          }
        } else if (e.key === 'Escape') {
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
          handleSubmit();
        } else if (e.key === 'Escape') {
          setShowSystemMenu(true);
        }
        return;
      }

      if (currentInputType === 'RELATIONSHIP') {
        if (['<', '>', '=', '≤', '≥'].includes(e.key)) {
          setInput(e.key);
          handleSubmit(e.key);
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
    showSystemMenu, setShowSystemMenu, feedback, isIntro, activeChoices,
    activeMultiSelectOptions, onToggleOption, currentInputType, setInput,
    handleSubmit, fractionInput, setFractionInput, fractionFocus, setFractionFocus
  ]);
}
