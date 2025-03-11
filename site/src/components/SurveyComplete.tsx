import { Question } from '../types/questions';
import { Results } from './Results';
import { PieChartResults } from './PieChartResults';
import { useState, useMemo, useCallback } from 'react';
import {
  PieChart,
  BarChart,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
} from 'lucide-react';

interface SurveyCompleteProps {
  questions: Question[];
  results: {
    [questionId: string]: {
      [optionId: string]: number;
      total: number;
    };
  };
  onReset: () => void;
  userSelections: {
    [questionId: string]: string;
  };
  onReturn: () => void;
  hasSavedPosition: boolean;
}

export function SurveyComplete({
  questions,
  results,
  onReset,
  userSelections,
  onReturn,
  hasSavedPosition,
}: SurveyCompleteProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'pie' | 'bar'>('pie');

  // Memoize the filtered questions to prevent recalculation on every render
  const questionsWithResults = useMemo(
    () =>
      questions.filter(
        (question) => results[question.id] && results[question.id].total > 0,
      ),
    [questions, results],
  );

  // Memoize the current question
  const currentQuestion = useMemo(
    () => questionsWithResults[selectedQuestionIndex],
    [questionsWithResults, selectedQuestionIndex],
  );

  // Memoize the insights to prevent expensive calculations on every render
  const insights = useMemo(() => {
    if (questionsWithResults.length === 0) return [];

    const insightResults = [];

    // Find questions with most agreement
    const questionsWithUserSelections = questionsWithResults.filter(
      (question) => userSelections[question.id],
    );

    const agreementScores = questionsWithUserSelections.map((question) => {
      const questionResults = results[question.id];
      const userSelection = userSelections[question.id];

      if (!questionResults || !userSelection) return { question, score: 0 };

      // Calculate what percentage of other users selected the same option as the user
      const totalVotes = questionResults.total;
      const userOptionVotes = questionResults[userSelection] || 0;

      // Agreement score is the percentage of users who selected the same option
      const agreementScore = totalVotes > 0 ? userOptionVotes / totalVotes : 0;

      return { question, score: agreementScore };
    });

    // Sort by agreement score (highest first)
    const sortedByAgreement = [...agreementScores].sort(
      (a, b) => b.score - a.score,
    );

    // Get the question with highest agreement
    if (sortedByAgreement.length > 0 && sortedByAgreement[0].score > 0.5) {
      const topAgreement = sortedByAgreement[0];
      const userSelection = userSelections[topAgreement.question.id];
      const selectedOption = topAgreement.question.options.find(
        (o) => o.id === userSelection,
      );

      insightResults.push({
        title: 'Sorting you and others most agree upon',
        text: `${Math.round(
          topAgreement.score * 100,
        )}% of respondents also put "${topAgreement.question.text}" under "${
          selectedOption?.text || userSelection
        }"`,
        icon: <ThumbsUp className='h-5 w-5 text-green-500' />,
      });
    }

    // Get the question with lowest agreement (most disagreement)
    if (sortedByAgreement.length > 0) {
      const bottomAgreement = sortedByAgreement[sortedByAgreement.length - 1];
      // Only show if there's significant disagreement (less than 40% agreement)
      if (bottomAgreement.score < 0.4) {
        const userSelection = userSelections[bottomAgreement.question.id];
        const selectedOption = bottomAgreement.question.options.find(
          (o) => o.id === userSelection,
        );

        insightResults.push({
          title: 'Sorting you and others most disagree on',
          text: `Only ${Math.round(
            bottomAgreement.score * 100,
          )}% of respondents put "${bottomAgreement.question.text}" under "${
            selectedOption?.text || userSelection
          }"`,
          icon: <ThumbsDown className='h-5 w-5 text-red-500' />,
        });
      }
    }

    return insightResults;
  }, [questionsWithResults, results, userSelections]);

  // Memoize handler functions
  const toggleViewMode = useCallback((mode: 'pie' | 'bar') => {
    setViewMode(mode);
  }, []);

  if (questionsWithResults.length === 0) {
    return (
      <div className='text-center p-8'>
        <h2 className='text-2xl font-bold mb-4'>Survey Complete!</h2>
        <p className='text-gray-600'>No results have been collected yet.</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 md:space-y-8'>
      <div className='flex flex-col sm:flex-row justify-between items-center gap-4'>
        <h2 className='text-xl md:text-2xl font-bold text-center sm:text-left'>
          Survey Complete!
        </h2>
        <div className='flex gap-2 w-full sm:w-auto justify-center sm:justify-end'>
          {hasSavedPosition && (
            <button
              onClick={onReturn}
              className='flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-blue-50 rounded-lg hover:bg-blue-100 text-blue-700 text-sm md:text-base'
            >
              <ArrowLeft className='h-3.5 w-3.5 md:h-4 md:w-4' />
              Return to Survey
            </button>
          )}
          <button
            onClick={onReset}
            className='flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-800 text-sm md:text-base'
          >
            <RefreshCw className='h-3.5 w-3.5 md:h-4 md:w-4' />
            Reset Survey
          </button>
        </div>
      </div>
      <p className='text-gray-600 text-center text-sm md:text-base'>
        Thank you for participating! Here are the results for your responses.
      </p>

      {/* Insights section */}
      {insights.length > 0 && (
        <div className='bg-blue-50 border border-blue-100 rounded-lg p-3 md:p-4'>
          <h3 className='text-base md:text-lg font-semibold text-blue-800 mb-2'>
            Insights
          </h3>
          <div className='space-y-2 md:space-y-3'>
            {insights.map((insight, index) => (
              <div key={index} className='flex items-start gap-2 md:gap-3'>
                <div className='mt-0.5 shrink-0'>{insight.icon}</div>
                <div>
                  <h4 className='font-medium text-blue-700 text-sm md:text-base'>
                    {insight.title}
                  </h4>
                  <p className='text-blue-600 text-xs md:text-sm'>
                    {insight.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation controls */}
      <div className='flex justify-between items-center'>
        <button
          onClick={() =>
            setSelectedQuestionIndex((prev) => Math.max(0, prev - 1))
          }
          disabled={selectedQuestionIndex === 0}
          className='px-2 py-1.5 md:px-4 md:py-2 bg-gray-200 rounded-lg disabled:opacity-50 text-sm md:text-base'
        >
          Previous
        </button>

        <div className='text-center'>
          <span className='font-medium text-sm md:text-base'>
            Question {selectedQuestionIndex + 1} of{' '}
            {questionsWithResults.length}
          </span>
        </div>

        <button
          onClick={() =>
            setSelectedQuestionIndex((prev) =>
              Math.min(questionsWithResults.length - 1, prev + 1),
            )
          }
          disabled={selectedQuestionIndex === questionsWithResults.length - 1}
          className='px-2 py-1.5 md:px-4 md:py-2 bg-gray-200 rounded-lg disabled:opacity-50 text-sm md:text-base'
        >
          Next
        </button>
      </div>

      {/* View mode toggle */}
      <div className='flex justify-end mb-2 md:mb-4'>
        <div className='bg-gray-100 rounded-lg p-1 inline-flex'>
          <button
            onClick={() => toggleViewMode('pie')}
            className={`p-1.5 md:p-2 rounded-md flex items-center ${
              viewMode === 'pie' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
            aria-label='Pie Chart View'
            title='Pie Chart View'
          >
            <PieChart className='h-4 w-4 md:h-5 md:w-5' />
          </button>
          <button
            onClick={() => toggleViewMode('bar')}
            className={`p-1.5 md:p-2 rounded-md flex items-center ${
              viewMode === 'bar' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
            aria-label='Bar Chart View'
            title='Bar Chart View'
          >
            <BarChart className='h-4 w-4 md:h-5 md:w-5' />
          </button>
        </div>
      </div>

      {/* Results view */}
      <div className='p-3 md:p-4 border border-gray-200 rounded-lg'>
        {viewMode === 'pie' ? (
          <PieChartResults
            question={currentQuestion}
            results={results[currentQuestion.id] || { total: 0 }}
            selectedOptionId={userSelections[currentQuestion.id] || null}
          />
        ) : (
          <Results
            question={currentQuestion}
            results={results[currentQuestion.id] || { total: 0 }}
          />
        )}
      </div>
    </div>
  );
}
