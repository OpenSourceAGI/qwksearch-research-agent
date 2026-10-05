/**
 * @fileoverview The catalog's shape, borrowed from a university: broad
 * categories (schools), majors (departments) and programs (tracks within a
 * major). Majors carry their MIT department number so ingested MIT records,
 * which are filed by department, land in the right place.
 */
import type { Category } from '../types';

export const EDUCATION_CATEGORIES: Category[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    majors: [
      {
        id: 'computer-science',
        name: 'Computer Science',
        department: '6',
        programs: [
          { id: 'foundations', name: 'Foundations', description: 'Programming and discrete math' },
          { id: 'algorithms-theory', name: 'Algorithms & Theory' },
          { id: 'ai-ml', name: 'AI & Machine Learning' },
          { id: 'systems', name: 'Systems' },
        ],
      },
    ],
  },
  {
    id: 'science',
    name: 'Science',
    majors: [
      {
        id: 'mathematics',
        name: 'Mathematics',
        department: '18',
        programs: [
          { id: 'calculus', name: 'Calculus' },
          { id: 'linear-algebra-probability', name: 'Linear Algebra & Probability' },
        ],
      },
      {
        id: 'physics',
        name: 'Physics',
        department: '8',
        programs: [{ id: 'core-physics', name: 'Core Physics' }],
      },
      {
        id: 'biology-chemistry',
        name: 'Biology & Chemistry',
        department: '7',
        programs: [{ id: 'life-sciences-core', name: 'Life Sciences Core' }],
      },
      {
        id: 'brain-cognitive',
        name: 'Brain & Cognitive Sciences',
        department: '9',
        programs: [{ id: 'brain-mind', name: 'Brain & Mind' }],
      },
    ],
  },
  {
    id: 'social-science',
    name: 'Social Science & Management',
    majors: [
      {
        id: 'economics',
        name: 'Economics',
        department: '14',
        programs: [{ id: 'principles', name: 'Principles' }],
      },
      {
        id: 'finance',
        name: 'Finance',
        department: '15',
        programs: [{ id: 'finance-theory', name: 'Finance Theory' }],
      },
    ],
  },
];
