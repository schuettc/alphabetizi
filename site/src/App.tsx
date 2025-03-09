export default function App() {
  return (
    <div className='min-h-screen bg-gray-100 p-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='rounded-lg bg-white p-8 shadow-lg'>
          <h1 className='mb-4 text-4xl font-bold'>Record Collection Survey</h1>
          <p className='mb-8 text-lg text-gray-600'>
            Help us understand how music enthusiasts organize their collections.
          </p>

          <h2 className='mb-6 text-2xl font-semibold'>
            When organizing your record collection, where would you put Fiona
            Apple records?
          </h2>

          <div className='space-y-4'>
            <button className='w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left hover:bg-gray-50'>
              Under 'A' for Apple
            </button>
            <button className='w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left hover:bg-gray-50'>
              Under 'F' for Fiona
            </button>
          </div>

          <button className='mt-6 rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600'>
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}
