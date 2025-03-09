'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  label: string;
}

interface SurveyQuestionProps {
  question: string;
  options: Option[];
}

export default function SurveyQuestion({
  question,
  options,
}: SurveyQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedOption) {
      // Here you would typically send the data to your backend
      console.log('Submitted answer:', selectedOption);
      setSubmitted(true);

      // Reset for next question (in a real app, you might load a new question)
      setTimeout(() => {
        setSelectedOption(null);
        setSubmitted(false);
      }, 2000);
    }
  };

  return (
    <Card className='shadow-lg'>
      <CardContent className='pt-6'>
        <h2 className='text-2xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100'>
          {question}
        </h2>

        <div className='space-y-4 mb-8'>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={cn(
                'w-full p-6 text-left rounded-lg border-2 transition-all duration-200 flex items-center',
                'hover:border-primary hover:bg-primary/5',
                selectedOption === option.id
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700',
              )}
            >
              <div className='flex-1 text-xl font-medium'>{option.label}</div>
              {selectedOption === option.id && (
                <CheckCircle className='h-6 w-6 text-primary' />
              )}
            </button>
          ))}
        </div>

        <div className='flex justify-center'>
          <Button
            size='lg'
            disabled={!selectedOption || submitted}
            onClick={handleSubmit}
            className='px-8 py-6 text-lg h-auto'
          >
            {submitted ? 'Thank you!' : 'Submit Answer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
