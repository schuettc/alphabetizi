import { SurveyQuestion } from '../types';

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: 'q1',
    question: 'How would you alphabetize a record by "The Beatles"?',
    options: [
      { id: 'q1_a', text: 'Under "T" for "The"' },
      { id: 'q1_b', text: 'Under "B" for "Beatles"' },
      { id: 'q1_c', text: 'Both ways are acceptable' },
    ],
  },
  {
    id: 'q2',
    question:
      'Where would you file a record by an artist whose name starts with a symbol, like "?uestlove"?',
    options: [
      { id: 'q2_a', text: 'At the beginning, before "A"' },
      { id: 'q2_b', text: 'Under "Q" for "Questlove"' },
      { id: 'q2_c', text: 'At the end, after "Z"' },
    ],
  },
  {
    id: 'q3',
    question: 'How would you alphabetize a record by "AC/DC"?',
    options: [
      { id: 'q3_a', text: 'Under "A"' },
      { id: 'q3_b', text: 'As "ACDC" under "A"' },
      { id: 'q3_c', text: 'As "AC DC" under "A"' },
    ],
  },
  {
    id: 'q4',
    question:
      'Where would you file a record by a non-English artist with non-English characters, like "Björk"?',
    options: [
      { id: 'q4_a', text: 'Under "B" for "Bjork"' },
      { id: 'q4_b', text: 'Under "B" but after all regular "B" names' },
      {
        id: 'q4_c',
        text: 'With proper diacritic placement (ö comes after o in some alphabets)',
      },
    ],
  },
  {
    id: 'q5',
    question:
      'How would you alphabetize compilation albums like "Now That\'s What I Call Music!"?',
    options: [
      { id: 'q5_a', text: 'Under "N" for "Now"' },
      { id: 'q5_b', text: 'In a separate compilation/various artists section' },
      { id: 'q5_c', text: 'Under "V" for "Various Artists"' },
    ],
  },
  {
    id: 'q6',
    question:
      'How would you alphabetize a collaborative album like "Jay-Z and Kanye West"?',
    options: [
      { id: 'q6_a', text: 'Under "J" for "Jay-Z"' },
      { id: 'q6_b', text: 'Under "K" for "Kanye West"' },
      { id: 'q6_c', text: 'File it twice - once under each artist' },
    ],
  },
  {
    id: 'q7',
    question:
      "How would you organize records within a single artist's section?",
    options: [
      { id: 'q7_a', text: 'Chronologically by release date' },
      { id: 'q7_b', text: 'Alphabetically by album title' },
      { id: 'q7_c', text: 'By personal preference/favorites' },
    ],
  },
];
