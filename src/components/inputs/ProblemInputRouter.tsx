import React from 'react';
import { InputType } from '../../types';
import { CombatActionBarProps } from './CombatActionBar';
import { CoordinateInput } from './CoordinateInput';
import { DefaultInput } from './DefaultInput';
import { FractionInput } from './FractionInput';
import { MultipleChoiceInput } from './MultipleChoiceInput';
import { RelationshipInput } from './RelationshipInput';

interface Props {
  choices?: string[];
  multiSelectOptions?: string[];
  currentInputType: InputType;
  includeInclusiveRelationship?: boolean;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  fractionInput: { num: string; den: string };
  setFractionInput: React.Dispatch<React.SetStateAction<{ num: string; den: string }>>;
  fractionFocus: 'num' | 'den';
  setFractionFocus: React.Dispatch<React.SetStateAction<'num' | 'den'>>;
  onSubmit: (overrideInput?: string) => void;
  disabled: boolean;
  actionBarProps?: Omit<CombatActionBarProps, 'orientation'>;
}

export const ProblemInputRouter: React.FC<Props> = ({
  choices,
  multiSelectOptions,
  currentInputType,
  includeInclusiveRelationship = false,
  input,
  setInput,
  selectedOptions,
  onToggleOption,
  fractionInput,
  setFractionInput,
  fractionFocus,
  setFractionFocus,
  onSubmit,
  disabled,
  actionBarProps,
}) => {
  if (choices || multiSelectOptions) {
    return (
      <MultipleChoiceInput
        choices={choices}
        multiSelectOptions={multiSelectOptions}
        selectedOptions={selectedOptions}
        onToggleOption={onToggleOption}
        onSelectChoice={(choice) => {
          setInput(choice);
          onSubmit(choice);
        }}
        onSubmitMultiSelect={() => onSubmit()}
        disabled={disabled}
        actionBarProps={actionBarProps}
      />
    );
  }

  if (currentInputType === 'RELATIONSHIP') {
    return (
      <RelationshipInput
        onSelect={(sym) => {
          setInput(sym);
          onSubmit(sym);
        }}
        disabled={disabled}
        includeInclusive={includeInclusiveRelationship}
        actionBarProps={actionBarProps}
      />
    );
  }

  if (currentInputType === 'FRACTION' || currentInputType === 'RATIO') {
    return (
      <FractionInput
        type={currentInputType}
        fractionInput={fractionInput}
        fractionFocus={fractionFocus}
        setFractionFocus={setFractionFocus}
        setFractionInput={setFractionInput}
        onSubmit={() => onSubmit()}
        disabled={disabled}
        actionBarProps={actionBarProps}
      />
    );
  }

  if (currentInputType === 'COORDINATE') {
    return (
      <CoordinateInput
        input={input}
        setInput={setInput}
        onSubmit={() => onSubmit()}
        actionBarProps={actionBarProps}
      />
    );
  }

  return (
    <DefaultInput
      input={input}
      setInput={setInput}
      currentInputType={currentInputType}
      onSubmit={() => onSubmit()}
      disabled={disabled}
      actionBarProps={actionBarProps}
    />
  );
};
