import { CheckCircle, PieChart, BarChart } from 'lucide-react';
import { useState, useEffect, useMemo, memo } from 'react';
import questionsData from './data/questions.json';
import type { Questions, Question } from './types/questions';
import { PieChartResults } from './components/PieChartResults';
import { Results } from './components/Results';
import { SurveyComplete } from './components/SurveyComplete';

// Memoized question option button component to prevent unnecessary re-renders
const QuestionOption = memo(
  ({
    option,
    isSelected,
    onSelect,
    disabled,
  }: {
    option: { id: string; text: string; isOther?: boolean };
    isSelected: boolean;
    onSelect: () => void;
    disabled: boolean;
  }) => (
    <button
      key={option.id}
      onClick={onSelect}
      disabled={disabled}
      className={`relative w-full rounded-2xl border-2 bg-gray-50 p-6 text-left text-xl transition-all hover:bg-gray-100 disabled:opacity-50
      ${isSelected ? 'border-gray-900 bg-gray-100' : 'border-gray-200'}`}
    >
      {option.text}
      {isSelected && (
        <CheckCircle className='absolute right-6 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-900' />
      )}
    </button>
  ),
);

// Type assertion to properly type the imported JSON
const typedQuestionsData = questionsData as Questions;

interface SurveyResults {
  [questionId: string]: {
    [optionId: string]: number;
    total: number;
  };
}

interface SurveyResponse {
  questionId: string;
  selectedOption: string;
}

// Get questions from all groups in a randomized order
const createQuestionSet = () => {
  // Helper to shuffle an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get all groups in a randomized order
  const shuffledGroups = shuffleArray(typedQuestionsData.groups);

  return {
    groups: shuffledGroups,
    totalQuestions: shuffledGroups.reduce(
      (sum, group) => sum + group.questions.length,
      0,
    ),
  };
};

export default function App() {
  const [surveyData, setSurveyData] = useState<{
    groups: typeof typedQuestionsData.groups;
    totalQuestions: number;
  }>({ groups: [], totalQuestions: 0 });
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SurveyResults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPieChart, setIsPieChart] = useState(true);
  const [completedQuestionCount, setCompletedQuestionCount] = useState(0);
  const [isSurveyComplete, setIsSurveyComplete] = useState(false);
  const [allAnsweredQuestions, setAllAnsweredQuestions] = useState<Question[]>(
    [],
  );
  const [userSelections, setUserSelections] = useState<{
    [questionId: string]: string;
  }>({});
  // Store the user's position in the survey so they can return to it
  const [savedSurveyPosition, setSavedSurveyPosition] = useState<{
    groupIndex: number;
    questionIndex: number;
    showingResults: boolean;
  } | null>(null);

  // Initialize questions on component mount
  useEffect(() => {
    // Get all groups in randomized order
    const questionSet = createQuestionSet();
    setSurveyData(questionSet);
  }, []);

  // Calculate current group and question
  const currentGroup = useMemo(() => {
    return surveyData.groups[currentGroupIndex] || null;
  }, [surveyData.groups, currentGroupIndex]);

  const currentQuestion = useMemo(() => {
    if (!currentGroup) return null;
    return currentGroup.questions[currentQuestionIndex] || null;
  }, [currentGroup, currentQuestionIndex]);

  // Randomize options for the current question, keeping "Other" at the end
  const randomizedOptions = useMemo(() => {
    // Return empty array if no questions are loaded yet
    if (!currentQuestion) return [];

    // Get all options from the current question
    const options = currentQuestion.options;

    // Find the "Other" option, if any
    const otherOption = options.find((opt) => opt.isOther);

    // Get all regular options (non-"Other")
    const regularOptions = options.filter((opt) => !opt.isOther);

    // Shuffle the regular options
    const shuffledRegularOptions = [...regularOptions].sort(
      () => 0.5 - Math.random(),
    );

    // Return shuffled options with "Other" at the end, if it exists
    return otherOption
      ? [...shuffledRegularOptions, otherOption]
      : shuffledRegularOptions;
  }, [currentQuestion]);

  // Wait for questions to be loaded
  if (surveyData.groups.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center p-4'>
        <div className='text-center'>
          <h2 className='text-xl font-medium text-gray-900'>Loading...</h2>
          <p className='mt-2 text-gray-600'>
            Please wait while we prepare your survey.
          </p>
        </div>
      </div>
    );
  }

  // Function to fetch results for a specific question
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch results for the current question if it exists
      if (!currentQuestion) {
        setError('No question selected');
        return;
      }

      const questionId = currentQuestion.id;

      // Check if we have cached results for this question that are recent (less than 30 seconds old)
      const cachedResults = sessionStorage.getItem(`results_${questionId}`);
      const cachedTimestamp = sessionStorage.getItem(
        `results_timestamp_${questionId}`,
      );
      const now = Date.now();

      // Use cached results if available and recent
      if (
        cachedResults &&
        cachedTimestamp &&
        now - parseInt(cachedTimestamp) < 30000
      ) {
        const parsedResults = JSON.parse(cachedResults);

        // Update state with cached results
        setResults((prevResults) => ({
          ...prevResults,
          [questionId]: parsedResults[questionId],
        }));

        return parsedResults;
      }

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${baseUrl}/survey?questionId=${questionId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the results for this question
      sessionStorage.setItem(`results_${questionId}`, JSON.stringify(data));
      sessionStorage.setItem(`results_timestamp_${questionId}`, now.toString());

      // Update state with fetched results
      setResults((prevResults) => ({
        ...prevResults,
        ...data,
      }));

      return data;
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Failed to load survey results');
      return {};
    } finally {
      setLoading(false);
    }
  };

  // Create a function to handle option selection and show results
  const handleOptionSelect = async (optionId: string) => {
    // Set the selected option
    setSelectedOption(optionId);

    // If loading is in progress or no current question, don't proceed
    if (loading || !currentQuestion) return;

    // Set loading state
    setLoading(true);

    try {
      // Save the selection
      setUserSelections((prev) => ({
        ...prev,
        [currentQuestion.id]: optionId,
      }));

      // Update the completed question count if it's not already counted
      if (!userSelections[currentQuestion.id]) {
        setCompletedQuestionCount((prev) => prev + 1);
      }

      // Fetch the latest results for this question
      await fetchResults();

      // Show the results instead of auto-advancing
      setShowResults(true);
    } catch (error) {
      console.error('Error handling selection:', error);
      setError('Failed to process your selection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to go to the next question
  const goToNextQuestion = () => {
    // If there are more questions in the current group
    if (currentQuestionIndex < currentGroup!.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
    // Otherwise, move to the next group
    else if (currentGroupIndex < surveyData.groups.length - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      setCurrentQuestionIndex(0);
    }
    // If we've reached the end of all groups, mark survey as complete
    else {
      setIsSurveyComplete(true);
    }

    // Reset states for the next question
    setSelectedOption(null);
    setShowResults(false);
  };

  // Function to reset the survey
  const resetSurvey = () => {
    setCurrentGroupIndex(0);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowResults(false);
    setCompletedQuestionCount(0);
    setIsSurveyComplete(false);
    setAllAnsweredQuestions([]);
    setUserSelections({});
    // We'll keep the results so we can see them in the future
  };

  // Function to fetch all survey results
  const fetchAllResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for recently cached results (cache for 1 minute)
      const cacheKey = 'all_results';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(`${cacheKey}_time`);

      if (cachedData && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge < 60000) {
          // 1 minute cache
          console.log('Using cached results for all questions');
          const parsedData = JSON.parse(cachedData);
          setResults(parsedData);
          return parsedData;
        }
      }

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${baseUrl}/survey`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // If no results returned, generate sample data for demonstration
      if (Object.keys(data).length === 0) {
        const sampleResults = generateSampleResults();

        // Cache the sample results
        localStorage.setItem(cacheKey, JSON.stringify(sampleResults));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

        setResults(sampleResults);
        return sampleResults;
      }

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      setResults(data);
      return data;
    } catch (error) {
      console.error('Error fetching all results:', error);
      setError('Failed to load survey results');

      // Generate sample data in case of error
      const sampleResults = generateSampleResults();
      setResults(sampleResults);
      return sampleResults;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate sample results
  const generateSampleResults = () => {
    const sampleResults: SurveyResults = {};

    // Generate sample results for all questions
    surveyData.groups
      .flatMap((group) => group.questions)
      .forEach((question) => {
        sampleResults[question.id] = {
          total: 0,
        };

        // Add sample votes for each option
        question.options.forEach((option) => {
          // Generate a random number of votes between 0 and 20
          const votes = Math.floor(Math.random() * 20);
          sampleResults[question.id][option.id] = votes;
          sampleResults[question.id].total += votes;
        });
      });

    return sampleResults;
  };

  // Function to view all results and save current position
  const viewAllResults = async () => {
    // Save current position
    setSavedSurveyPosition({
      groupIndex: currentGroupIndex,
      questionIndex: currentQuestionIndex,
      showingResults: showResults,
    });

    // Fetch all results from the database
    await fetchAllResults();

    // Collect all questions from all groups
    const allQuestions = surveyData.groups.flatMap((group) => group.questions);
    setAllAnsweredQuestions(allQuestions);

    // Generate some sample selections if none exist yet
    if (Object.keys(userSelections).length === 0) {
      const sampleSelections: { [questionId: string]: string } = {};

      allQuestions
        .slice(0, Math.min(5, allQuestions.length))
        .forEach((question) => {
          if (question.options.length > 0) {
            const regularOptions = question.options.filter(
              (opt) => !opt.isOther,
            );
            if (regularOptions.length > 0) {
              const randomOption =
                regularOptions[
                  Math.floor(Math.random() * regularOptions.length)
                ];
              sampleSelections[question.id] = randomOption.id;
            }
          }
        });

      setUserSelections(sampleSelections);
    }

    setIsSurveyComplete(true);
  };

  // Function to return to the survey from the results page
  const returnToSurvey = () => {
    if (savedSurveyPosition) {
      setCurrentGroupIndex(savedSurveyPosition.groupIndex);
      setCurrentQuestionIndex(savedSurveyPosition.questionIndex);
      setShowResults(savedSurveyPosition.showingResults);
      setIsSurveyComplete(false);
    } else {
      resetSurvey();
    }
  };

  // Show results page if survey is complete
  if (isSurveyComplete) {
    return (
      <div className='min-h-screen bg-gray-50 py-6 md:py-12'>
        <div className='mx-auto max-w-xl md:max-w-3xl px-4 sm:px-6 lg:px-8'>
          <SurveyComplete
            questions={allAnsweredQuestions}
            results={results}
            onReset={resetSurvey}
            userSelections={userSelections}
            onReturn={returnToSurvey}
            hasSavedPosition={Boolean(savedSurveyPosition)}
          />
        </div>
      </div>
    );
  }

  // Main survey interface
  return (
    <div className='min-h-screen bg-gray-50 py-6 md:py-12'>
      <div className='mx-auto max-w-md md:max-w-xl lg:max-w-2xl px-4 sm:px-6 lg:px-8'>
        <div className='space-y-8'>
          <div className='relative'>
            {/* Progress bar */}
            <div className='h-1.5 w-full bg-gray-200 rounded-full overflow-hidden'>
              <div
                className='h-full bg-blue-600 transition-all duration-300 ease-in-out'
                style={{
                  width: `${
                    (completedQuestionCount / surveyData.totalQuestions) * 100
                  }%`,
                }}
              />
            </div>
            {/* Progress text */}
            <div className='mt-2 text-xs md:text-sm text-gray-600 text-right'>
              {completedQuestionCount} of {surveyData.totalQuestions} questions
              completed
            </div>
          </div>

          {/* Question content */}
          {currentQuestion && (
            <div className='space-y-6'>
              {/* Only show header and image when not showing results to avoid duplication */}
              {!showResults && (
                <div className='space-y-4'>
                  <h2 className='text-xl md:text-2xl font-bold'>
                    {currentQuestion.text}
                  </h2>

                  {/* Display album cover image if available */}
                  {currentQuestion.image && (
                    <div className='flex justify-center mb-4'>
                      <img
                        src={currentQuestion.image.url}
                        alt={currentQuestion.image.alt}
                        width='300'
                        height='300'
                        loading='lazy'
                        className='rounded-lg shadow-md max-h-36 md:max-h-48 object-contain'
                      />
                    </div>
                  )}
                </div>
              )}

              {showResults ? (
                <div className='space-y-6'>
                  {/* Results view */}
                  {isPieChart ? (
                    <PieChartResults
                      question={currentQuestion}
                      results={results[currentQuestion.id] || { total: 0 }}
                      selectedOptionId={selectedOption}
                    />
                  ) : (
                    <Results
                      question={currentQuestion}
                      results={results[currentQuestion.id] || { total: 0 }}
                    />
                  )}

                  {/* Controls for results view */}
                  <div className='flex justify-between items-center pt-4'>
                    <div className='bg-gray-100 rounded-lg p-1 inline-flex'>
                      <button
                        onClick={() => setIsPieChart(true)}
                        className={`p-1.5 md:p-2 rounded-md flex items-center ${
                          isPieChart ? 'bg-white shadow-sm' : 'text-gray-500'
                        }`}
                        aria-label='Pie Chart View'
                        title='Pie Chart View'
                      >
                        <PieChart className='h-4 w-4 md:h-5 md:w-5' />
                      </button>
                      <button
                        onClick={() => setIsPieChart(false)}
                        className={`p-1.5 md:p-2 rounded-md flex items-center ${
                          !isPieChart ? 'bg-white shadow-sm' : 'text-gray-500'
                        }`}
                        aria-label='Bar Chart View'
                        title='Bar Chart View'
                      >
                        <BarChart className='h-4 w-4 md:h-5 md:w-5' />
                      </button>
                    </div>

                    <div className='flex gap-2'>
                      <button
                        onClick={viewAllResults}
                        className='px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm md:text-base'
                      >
                        View All Results
                      </button>
                      <button
                        onClick={goToNextQuestion}
                        className='px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm md:text-base'
                      >
                        Next Question
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Options list */}
                  <div className='space-y-3'>
                    {randomizedOptions.map((option) => (
                      <QuestionOption
                        key={option.id}
                        option={option}
                        isSelected={selectedOption === option.id}
                        onSelect={() => handleOptionSelect(option.id)}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {/* View all results button */}
                  <div className='flex justify-end pt-4'>
                    <button
                      onClick={viewAllResults}
                      disabled={loading}
                      className='px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm md:text-base'
                    >
                      View All Results
                    </button>
                  </div>
                </>
              )}

              {/* Display error if any */}
              {error && (
                <div className='text-red-600 text-sm bg-red-50 p-3 rounded-lg'>
                  Error: {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
