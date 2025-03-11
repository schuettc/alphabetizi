import { Question } from '../types/questions';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { useMemo } from 'react';

interface PieChartResultsProps {
  question: Question;
  results: {
    [optionId: string]: number;
    total: number;
  };
  selectedOptionId: string | null;
}

const COLORS = [
  '#2563eb', // blue-600
  '#d946ef', // fuchsia-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
];

// Active shape for the donut chart when a segment is hovered/active
const renderActiveShape = (props: PieSectorDataItem) => {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = '#8884d8',
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke='#fff'
        strokeWidth={2}
      />
    </g>
  );
};

export function PieChartResults({
  question,
  results,
  selectedOptionId,
}: PieChartResultsProps) {
  // Memoize chart data preparation to prevent recalculation on every render
  const chartData = useMemo(() => {
    return question.options
      .map((option) => ({
        id: option.id,
        name: option.text,
        value: results[option.id] || 0,
      }))
      .filter((item) => item.value > 0); // Only include options with votes
  }, [question.options, results]);

  // Memoize the pie chart settings - must be defined before any conditional returns
  const pieSettings = useMemo(
    () => ({
      cx: '50%',
      cy: '50%',
      innerRadius: 50, // Smaller inner radius for mobile
      outerRadius: 80, // Smaller outer radius for mobile
      paddingAngle: 1,
      dataKey: 'value' as const,
    }),
    [],
  );

  // Instead of a useState for activeIndex, compute it directly from selectedOptionId
  const activeIndex = useMemo(() => {
    if (!selectedOptionId) return null;

    // Find the index of the user's selected option in the filtered chart data
    const selectedIndex = chartData.findIndex(
      (item) => item.id === selectedOptionId,
    );
    return selectedIndex >= 0 ? selectedIndex : null;
  }, [chartData, selectedOptionId]);

  // If there are no votes yet, show a message
  if (chartData.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='text-center text-xl md:text-3xl font-semibold'>
          {question.text}
        </h2>
        <p className='text-center text-gray-500'>
          No votes yet for this question.
        </p>
      </div>
    );
  }

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
            width='300'
            height='300'
            loading='lazy'
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

      <div
        className='mx-auto'
        style={{
          height: 'auto',
          minHeight: '300px',
          maxHeight: '380px',
          maxWidth: '600px',
        }}
      >
        <ResponsiveContainer width='100%' height={300}>
          <PieChart>
            <Pie
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={renderActiveShape}
              data={chartData}
              {...pieSettings}
              label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
              labelLine={false}
              strokeWidth={1}
              stroke='#fff'
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  strokeWidth={1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Legend as list below the chart */}
        <div className='grid grid-cols-1 gap-2 mt-4 md:mt-6 max-w-md mx-auto'>
          {chartData.map((entry, index) => {
            const percentage = (
              (entry.value / (results.total || 1)) *
              100
            ).toFixed(1);
            return (
              <div
                key={`legend-${index}`}
                className={`flex items-center justify-between p-2 rounded text-sm md:text-base ${
                  activeIndex === index
                    ? 'bg-gray-100 border border-gray-200'
                    : ''
                }`}
              >
                <div className='flex items-center'>
                  <div
                    className='w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 rounded'
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className='text-sm md:text-base line-clamp-2'>
                    {entry.name}
                  </span>
                </div>
                <div className='text-sm md:text-base font-medium flex items-center gap-1 md:gap-2 ml-2 shrink-0'>
                  <span className='hidden xs:inline'>{entry.value} votes</span>
                  <span className='px-1.5 py-0.5 md:px-2 md:py-1 rounded-full bg-gray-100 whitespace-nowrap'>
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className='text-center text-gray-600 mt-3 md:mt-4 text-sm md:text-base'>
        Total votes: <span className='font-semibold'>{results.total || 0}</span>
      </div>
    </div>
  );
}
