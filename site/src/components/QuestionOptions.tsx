import { Question } from '../types/questions';
import { memo } from 'react';
import { CheckCircle } from 'lucide-react';

interface OptionProps {
  option: { id: string; text: string; isOther?: boolean };
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

// Memoized question option button component to prevent unnecessary re-renders
const QuestionOption = memo(
  ({ option, isSelected, onSelect, disabled }: OptionProps) => (
    <button
      key={option.id}
      onClick={onSelect}
      disabled={disabled}
      className={`relative w-full rounded-2xl border-2 bg-gray-50 py-2.5 md:py-3 px-4 md:px-5 text-left text-lg md:text-xl transition-all hover:bg-gray-100 disabled:opacity-50
      ${isSelected ? 'border-gray-900 bg-gray-100' : 'border-gray-200'}`}
    >
      {option.text}
      {isSelected && (
        <CheckCircle className='absolute right-4 md:right-5 top-1/2 h-5 w-5 md:h-6 md:w-6 -translate-y-1/2 text-gray-900' />
      )}
    </button>
  ),
);

interface QuestionOptionsProps {
  question: Question;
  options: { id: string; text: string; isOther?: boolean }[];
  selectedOption: string | null;
  onSelect: (optionId: string) => void;
  disabled: boolean;
}

export function QuestionOptions({
  options,
  selectedOption,
  onSelect,
  disabled,
}: QuestionOptionsProps) {
  return (
    <div className='space-y-3'>
      {options.map((option) => (
        <QuestionOption
          key={option.id}
          option={option}
          isSelected={selectedOption === option.id}
          onSelect={() => onSelect(option.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
