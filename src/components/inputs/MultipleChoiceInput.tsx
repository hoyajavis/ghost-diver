import React from 'react';

interface Props {
  choices?: string[];
  multiSelectOptions?: string[];
  selectedOptions: string[];
  onToggleOption: (option: string) => void;
  onSelectChoice: (choice: string) => void;
  onSubmitMultiSelect: () => void;
  disabled: boolean;
}

export const MultipleChoiceInput: React.FC<Props> = ({
  choices,
  multiSelectOptions,
  selectedOptions,
  onToggleOption,
  onSelectChoice,
  onSubmitMultiSelect,
  disabled,
}) => {
  if (choices) {
    return (
      <div className="flex flex-col gap-2 mt-1">
        {choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (disabled) return;
                onSelectChoice(choice);
              }}
              className="w-full text-left p-2 border border-gb-3 bg-gb-0 hover:bg-gb-2 hover:text-gb-0 transition-colors text-xs flex items-center gap-2 gb-border-sm"
            >
              <span className="font-bold text-neon-cyan">[{letter}]</span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (multiSelectOptions) {
    return (
      <div className="flex flex-col gap-2 mt-1">
        <div className="grid grid-cols-2 gap-2">
          {multiSelectOptions.map((option, idx) => {
            const isSelected = selectedOptions.includes(option);
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onToggleOption(option);
                }}
                className={`p-2 border border-gb-3 transition-colors text-xs font-bold gb-border-sm flex items-center justify-between gap-2 disabled:opacity-40 ${
                  isSelected
                    ? 'bg-neon-cyan text-gb-0'
                    : 'bg-gb-0 text-gb-3 hover:bg-gb-2 hover:text-gb-0'
                }`}
              >
                {idx < 9 && (
                  <span className={isSelected ? 'text-gb-0/80' : 'text-neon-cyan'}>[{idx + 1}]</span>
                )}
                <span className="flex-1 text-center">{option}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSubmitMultiSelect}
          disabled={selectedOptions.length === 0 || disabled}
          className="w-full py-2 bg-gb-0 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-gb-0 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-gb-0 disabled:hover:text-neon-cyan gb-border-sm"
        >
          SUBMIT SELECTION [ENTER]
        </button>
      </div>
    );
  }

  return null;
};
