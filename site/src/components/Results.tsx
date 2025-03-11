import { Question } from '../types/questions';

interface ResultsProps {
  question: Question;
  results: {
    [optionId: string]: number;
    total: number;
  };
}

export function Results({ question, results }: ResultsProps) {
  return (
    <div className='space-y-4'>
      <div className='space-y-3 md:space-y-4'>
        {question.options.map((option) => {
          const votes = results[option.id] || 0;
          const percentage = results.total
            ? ((votes / results.total) * 100).toFixed(1)
            : '0';

          return (
            <div key={option.id} className='space-y-1 md:space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-base md:text-lg line-clamp-2'>
                  {option.text}
                </span>
                <span className='font-medium text-sm md:text-base ml-2 shrink-0'>
                  {percentage}%
                </span>
              </div>
              <div className='h-3 md:h-4 w-full overflow-hidden rounded-full bg-gray-100'>
                <div
                  className='h-full bg-gray-900 transition-all duration-500'
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className='text-xs md:text-sm text-gray-500'>
                {votes} {votes === 1 ? 'vote' : 'votes'}
              </p>
            </div>
          );
        })}
      </div>

      <div className='text-center text-gray-600 mt-2 md:mt-4 text-sm md:text-base'>
        Total votes: <span className='font-semibold'>{results.total || 0}</span>
      </div>
    </div>
  );
}
