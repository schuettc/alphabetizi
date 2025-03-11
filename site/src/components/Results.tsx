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
    <div className='space-y-4 md:space-y-6'>
      <h2 className='text-center text-xl md:text-3xl font-semibold'>
        {question.text}
      </h2>

      {/* Display album cover image if available */}
      {question.image && (
        <div className='flex justify-center mb-4 md:mb-6'>
          <img
            src={question.image.url}
            alt={question.image.alt}
            className='rounded-lg shadow-md max-h-36 md:max-h-48 object-contain'
          />
        </div>
      )}

      {/* Display reference links if available */}
      {question.references && question.references.length > 0 && (
        <div className='text-center mb-4 md:mb-6'>
          <p className='text-sm text-gray-500 mb-2'>References:</p>
          <div className='flex flex-wrap justify-center gap-3'>
            {question.references.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 hover:text-blue-800 hover:underline text-sm'
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

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
