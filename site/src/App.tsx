import { PieChart, BarChart } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import questionsData from './data/questions.json';
import type { Questions, Question } from './types/questions';
import { PieChartResults } from './components/PieChartResults';
import { Results } from './components/Results';
import { SurveyComplete } from './components/SurveyComplete';
import { QuestionHeader } from './components/QuestionHeader';
import { QuestionOptions } from './components/QuestionOptions';
import { apiService } from './services/api';

// Type assertion to properly type the imported JSON
const typedQuestionsData = questionsData as Questions;

interface SurveyResults {
  [questionId: string]: {
    [optionId: string]: number;
    total: number;
  };
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

      // Use the proxy in development
      console.log('Fetching results for question:', questionId);
      const url = `/survey?questionId=${questionId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received results:', data);

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
      // Save the selection to local state
      setUserSelections((prev) => ({
        ...prev,
        [currentQuestion.id]: optionId,
      }));

      // Update the completed question count if it's not already counted
      if (!userSelections[currentQuestion.id]) {
        setCompletedQuestionCount((prev) => prev + 1);
      }

      // Submit the user's answer to the backend
      console.log(
        'Submitting answer for current question',
        currentQuestion.id,
        optionId,
      );
      const response = await apiService.submitAnswer({
        questionId: currentQuestion.id,
        selectedOptionId: optionId,
      });

      if (!response.success) {
        console.error(
          'Failed to submit answer:',
          response.error || response.message,
        );
        // Continue anyway to show results
      } else {
        console.log('Answer submitted successfully');

        // Clear cache for this question to ensure we get fresh results
        sessionStorage.removeItem(`results_${currentQuestion.id}`);
        sessionStorage.removeItem(`results_timestamp_${currentQuestion.id}`);
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

      // Submit any unsaved user selections before fetching results
      if (Object.keys(userSelections).length > 0) {
        // Get the questions that have been answered
        const answeredQuestions = Object.keys(userSelections);

        // Check if there are any unsaved selections that need to be submitted
        if (answeredQuestions.length > 0) {
          console.log('Submitting user selections before fetching all results');

          // Submit each answer individually
          for (const questionId of answeredQuestions) {
            const selectedOptionId = userSelections[questionId];
            console.log('Submitting answer for', questionId, selectedOptionId);

            const result = await apiService.submitAnswer({
              questionId,
              selectedOptionId,
            });

            if (!result.success) {
              console.warn(
                `Failed to submit answer for question ${questionId}:`,
                result.error || result.message,
              );
            }
          }

          // Clear all caches to ensure we get fresh results
          localStorage.removeItem('all_results');
          localStorage.removeItem('all_results_time');
        }
      }

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

      // Use the proxy in development
      console.log('Fetching all survey results');
      const url = '/survey';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received all results:', data);

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
            <div className='space-y-4'>
              {/* Question header with standardized height */}
              <QuestionHeader question={currentQuestion} />

              {/* Fixed height container for consistent content area */}
              <div className='min-h-[350px] transition-all duration-300 pt-2'>
                {showResults ? (
                  <div>
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
                  </div>
                ) : (
                  <div>
                    {/* Options selection */}
                    <QuestionOptions
                      question={currentQuestion}
                      options={randomizedOptions}
                      selectedOption={selectedOption}
                      onSelect={handleOptionSelect}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              {/* Controls - consistent positioning for both views */}
              <div className='flex justify-between items-center pt-4 border-t border-gray-100'>
                {showResults && (
                  <div className='bg-gray-100 rounded-lg p-1 inline-flex'>
                    <button
                      onClick={() => setIsPieChart(true)}
                      className={`p-0.5 md:p-1 rounded-md flex items-center ${
                        isPieChart ? 'bg-white shadow-sm' : 'text-gray-500'
                      }`}
                      aria-label='Pie Chart View'
                      title='Pie Chart View'
                    >
                      <PieChart className='h-3.5 w-3.5 md:h-4 md:w-4' />
                    </button>
                    <button
                      onClick={() => setIsPieChart(false)}
                      className={`p-0.5 md:p-1 rounded-md flex items-center ${
                        !isPieChart ? 'bg-white shadow-sm' : 'text-gray-500'
                      }`}
                      aria-label='Bar Chart View'
                      title='Bar Chart View'
                    >
                      <BarChart className='h-3.5 w-3.5 md:h-4 md:w-4' />
                    </button>
                  </div>
                )}

                <div className='flex gap-2 ml-auto'>
                  <button
                    onClick={viewAllResults}
                    disabled={loading && !showResults}
                    className='px-2 py-0.5 md:px-3 md:py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs md:text-sm'
                  >
                    View All Results
                  </button>
                  {showResults && (
                    <button
                      onClick={goToNextQuestion}
                      className='px-2 py-0.5 md:px-3 md:py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-xs md:text-sm'
                    >
                      Next Question
                    </button>
                  )}
                </div>
              </div>

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
