import { Question } from '../types/questions';

interface QuestionHeaderProps {
  question: Question;
}

export function QuestionHeader({ question }: QuestionHeaderProps) {
  return (
    <div className='w-full flex flex-col h-[280px]'>
      {/* Question text with fixed height */}
      <div className='flex-none h-[80px] flex items-center justify-center'>
        <h2 className='text-xl md:text-2xl font-bold text-center line-clamp-3 max-w-[90%]'>
          {question.text}
        </h2>
      </div>

      {/* Album cover container with fixed square dimensions and centered */}
      <div className='flex-none h-[180px] flex justify-center items-center'>
        <div className='w-[180px] h-[180px] flex-none flex justify-center'>
          {question.image ? (
            <div className='w-[180px] h-[180px] overflow-hidden rounded-lg shadow-md'>
              <img
                src={question.image.url}
                alt={question.image.alt}
                className='w-full h-full object-contain'
                loading='lazy'
              />
            </div>
          ) : (
            // Empty space placeholder
            <div className='w-[180px] h-[180px]'></div>
          )}
        </div>
      </div>

      {/* References with fixed height */}
      <div className='flex-none h-[50px] overflow-y-auto'>
        {question.references && question.references.length > 0 ? (
          <div className='text-center'>
            <p className='text-sm text-gray-500 mb-1'>References:</p>
            <div className='flex flex-wrap justify-center gap-2 px-4'>
              {question.references.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:text-blue-800 hover:underline text-sm line-clamp-1'
                >
                  {link.title}
                </a>
              ))}
            </div>
          </div>
        ) : (
          // Empty space when no references
          <div className='h-[50px]'></div>
        )}
      </div>
    </div>
  );
}
