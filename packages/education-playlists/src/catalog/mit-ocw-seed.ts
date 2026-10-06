/**
 * @fileoverview The bundled seed catalog: MIT OpenCourseWare courses, grouped
 * the way MIT groups them (by department), into one preset playlist per
 * program.
 *
 * This is a hand-curated starting point, not an ingestion. Each course page
 * URL is the canonical `ocw.mit.edu/courses/<slug>/` address, and every item
 * says so in its provenance (`curated_seed`, `verified: false`) until an
 * ingestion run replaces it. The intended sources, in order of authority:
 *
 * 1. `mitodl/ocw_oer_export` — MIT's own exporter over the MIT Learn API:
 *    title, canonical URL, level, description, topics, instructors, term.
 * 2. The MIT OCW YouTube course dataset (Kaggle, `jorgoose`) — course playlist
 *    and per-lecture video URLs, for real `video` items with exact durations.
 * 3. Community awesome-lists, kept as `community_list` items in their own
 *    playlists rather than merged into the official records.
 *
 * Until (2) is ingested, a course's "lecture videos" item searches MIT OCW's
 * own YouTube channel for the course instead of guessing a playlist id.
 *
 * Time estimates are rough on purpose: lecture count × typical session length
 * for videos, and the term's problem-set/reading load for courseware.
 */
import type { CourseLevel, Playlist, PlaylistItem, Provenance } from '../types';

const OCW = 'https://ocw.mit.edu/courses/';
const OCW_YOUTUBE_SEARCH = 'https://www.youtube.com/@mitocw/search?query=';

/** One OCW course and the numbers its time estimates are derived from. */
export interface SeedCourse {
  number: string;
  title: string;
  /** The path segment after `/courses/`. */
  slug: string;
  level: CourseLevel;
  /** Recorded lectures; 0 for a course that publishes no lecture video. */
  lectures: number;
  lectureMinutes: number;
  /** Hours of problem sets, readings and exams over the term. */
  studyHours: number;
  description: string;
}

const seedProvenance = (note: string): Provenance => ({
  provider: 'mit_ocw',
  method: 'curated_seed',
  verified: false,
  note,
});

/** The items a course contributes to a playlist: its lectures, then its courseware. */
function courseItems(course: SeedCourse): PlaylistItem[] {
  const base = {
    courseNumber: course.number,
    institution: 'MIT',
    level: course.level,
  };
  const id = course.slug;
  const items: PlaylistItem[] = [];

  if (course.lectures > 0) {
    items.push({
      ...base,
      id: `${id}#videos`,
      title: `${course.number} ${course.title}: lecture videos`,
      url: `${OCW_YOUTUBE_SEARCH}${encodeURIComponent(`${course.number} ${course.title}`)}`,
      kind: 'video_playlist',
      minutes: course.lectures * course.lectureMinutes,
      estimate: 'rough',
      estimateBasis: `about ${course.lectures} lectures × ${course.lectureMinutes} min`,
      description: course.description,
      provenance: seedProvenance(
        "Searches MIT OCW's YouTube channel; replaced by per-lecture URLs once the OCW YouTube dataset is ingested.",
      ),
    });
  }

  items.push({
    ...base,
    id: `${id}#courseware`,
    title: `${course.number} ${course.title}: notes, problem sets and exams`,
    url: `${OCW}${course.slug}/`,
    kind: 'courseware',
    minutes: course.studyHours * 60,
    estimate: 'rough',
    estimateBasis: `about ${course.studyHours} h of problem sets and readings`,
    description: course.description,
    provenance: seedProvenance('Canonical OCW course page, curated by hand.'),
  });

  return items;
}

const c = (
  number: string,
  title: string,
  slug: string,
  level: CourseLevel,
  lectures: number,
  lectureMinutes: number,
  studyHours: number,
  description: string,
): SeedCourse => ({ number, title, slug, level, lectures, lectureMinutes, studyHours, description });

/** The seed courses, keyed by course number. */
export const MIT_OCW_SEED_COURSES: Record<string, SeedCourse> = Object.fromEntries(
  [
    // Computer science (Course 6)
    c('6.0001', 'Introduction to Computer Science and Programming in Python', '6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016', 'introductory', 12, 50, 30, 'Programming in Python for people with little or no experience: computation, abstraction, recursion, objects, and algorithmic complexity.'),
    c('6.0002', 'Introduction to Computational Thinking and Data Science', '6-0002-introduction-to-computational-thinking-and-data-science-fall-2016', 'introductory', 15, 50, 30, 'Using computation to solve problems: optimization, graphs, simulation, statistics and machine learning basics, in Python.'),
    c('6.042J', 'Mathematics for Computer Science', '6-042j-mathematics-for-computer-science-spring-2015', 'introductory', 25, 80, 60, 'Discrete math for computer science: proofs, induction, number theory, graphs, counting and discrete probability.'),
    c('6.006', 'Introduction to Algorithms', '6-006-introduction-to-algorithms-spring-2020', 'intermediate', 21, 50, 60, 'Data structures and algorithms: sorting, hashing, graph search, shortest paths and dynamic programming.'),
    c('6.046J', 'Design and Analysis of Algorithms', '6-046j-design-and-analysis-of-algorithms-spring-2015', 'advanced', 24, 80, 60, 'Algorithm design techniques: divide and conquer, amortization, randomization, network flow, and approximation.'),
    c('18.404J', 'Theory of Computation', '18-404j-theory-of-computation-fall-2020', 'advanced', 25, 75, 50, 'Automata, computability and complexity: what can be computed, and how efficiently.'),
    c('6.034', 'Artificial Intelligence', '6-034-artificial-intelligence-fall-2010', 'intermediate', 23, 50, 40, 'Representations and methods of AI: search, constraints, learning, and knowledge representation.'),
    c('6.036', 'Introduction to Machine Learning', '6-036-introduction-to-machine-learning-fall-2020', 'intermediate', 13, 90, 40, 'Principles and algorithms of machine learning: linear models, neural networks, and reinforcement learning.'),
    c('18.065', 'Matrix Methods in Data Analysis, Signal Processing, and Machine Learning', '18-065-matrix-methods-in-data-analysis-signal-processing-and-machine-learning-spring-2018', 'advanced', 36, 50, 40, 'Linear algebra for deep learning and data analysis: SVD, low-rank approximation, optimization, and neural nets.'),
    c('6.004', 'Computation Structures', '6-004-computation-structures-spring-2017', 'intermediate', 25, 50, 50, 'How computers work: digital logic, processor design, memory hierarchy, and operating-system support.'),
    c('6.033', 'Computer System Engineering', '6-033-computer-system-engineering-spring-2018', 'advanced', 26, 80, 50, 'Designing large computer systems: networking, fault tolerance, distributed systems, and security.'),
    c('6.172', 'Performance Engineering of Software Systems', '6-172-performance-engineering-of-software-systems-fall-2018', 'advanced', 23, 80, 60, 'Building fast, scalable software: work and span, caching, parallelism, and measurement.'),
    // Mathematics (Course 18)
    c('18.01', 'Single Variable Calculus', '18-01-single-variable-calculus-fall-2006', 'introductory', 39, 50, 60, 'Differentiation and integration of functions of one variable, with applications.'),
    c('18.02', 'Multivariable Calculus', '18-02-multivariable-calculus-fall-2007', 'introductory', 35, 50, 60, 'Vectors, partial derivatives, multiple integrals, and vector calculus.'),
    c('18.03', 'Differential Equations', '18-03-differential-equations-spring-2010', 'intermediate', 33, 50, 50, 'Ordinary differential equations: first-order and linear equations, Laplace transforms, and systems.'),
    c('18.06', 'Linear Algebra', '18-06-linear-algebra-spring-2010', 'introductory', 34, 45, 50, 'Matrix theory and linear algebra: systems of equations, vector spaces, determinants, eigenvalues, and positive definite matrices.'),
    c('18.05', 'Introduction to Probability and Statistics', '18-05-introduction-to-probability-and-statistics-spring-2014', 'introductory', 0, 0, 60, 'Probability, random variables, Bayesian and frequentist statistics, taught through readings and class problems.'),
    // Physics (Course 8)
    c('8.01SC', 'Classical Mechanics', '8-01sc-classical-mechanics-fall-2016', 'introductory', 35, 45, 60, 'Newtonian mechanics: kinematics, forces, energy, momentum, rotation, and gravitation.'),
    c('8.02', 'Physics II: Electricity and Magnetism', '8-02-physics-ii-electricity-and-magnetism-spring-2007', 'introductory', 36, 50, 50, 'Electric and magnetic fields, circuits, induction, and electromagnetic waves.'),
    c('8.04', 'Quantum Physics I', '8-04-quantum-physics-i-spring-2013', 'advanced', 24, 80, 60, 'Wave mechanics: the Schrödinger equation, one-dimensional potentials, and the hydrogen atom.'),
    // Biology (Course 7), chemistry (Course 5), brain and cognitive sciences (Course 9)
    c('7.016', 'Introductory Biology', '7-016-introductory-biology-fall-2018', 'introductory', 35, 50, 40, 'Biochemistry, genetics, molecular biology, and cell biology, with an emphasis on how they connect.'),
    c('7.012', 'Introduction to Biology', '7-012-introduction-to-biology-fall-2004', 'introductory', 35, 50, 30, 'Fundamental principles of biochemistry, genetics, molecular biology, and cell biology.'),
    c('5.111SC', 'Principles of Chemical Science', '5-111sc-principles-of-chemical-science-fall-2014', 'introductory', 36, 50, 40, 'Atomic structure, bonding, thermodynamics, kinetics, and chemical equilibrium.'),
    c('9.13', 'The Human Brain', '9-13-the-human-brain-spring-2019', 'introductory', 23, 80, 30, 'How the brain gives rise to perception, language, and thought, and how we know.'),
    c('9.00SC', 'Introduction to Psychology', '9-00sc-introduction-to-psychology-fall-2011', 'introductory', 24, 50, 30, 'Survey of the scientific study of human nature: perception, memory, emotion, and social behavior.'),
    // Economics (Course 14) and management (Course 15)
    c('14.01SC', 'Principles of Microeconomics', '14-01sc-principles-of-microeconomics-fall-2011', 'introductory', 26, 50, 40, 'How consumers and firms make choices, and how markets set prices.'),
    c('14.02', 'Principles of Macroeconomics', '14-02-principles-of-macroeconomics-spring-2014', 'introductory', 25, 80, 40, 'Output, unemployment, inflation, interest rates, and the policies that move them.'),
    c('15.401', 'Finance Theory I', '15-401-finance-theory-i-fall-2008', 'intermediate', 24, 80, 40, 'Present value, fixed income, equities, risk and return, and capital budgeting.'),
  ].map((course) => [course.number, course]),
);

/** A preset playlist built from seed courses, in study order. */
function preset(
  id: string,
  title: string,
  categoryId: string,
  majorId: string,
  programId: string,
  level: CourseLevel,
  description: string,
  courseNumbers: string[],
): Playlist {
  return {
    id,
    title,
    description,
    categoryId,
    majorId,
    programId,
    level,
    visibility: 'preset',
    items: courseNumbers.flatMap((number) => {
      const course = MIT_OCW_SEED_COURSES[number];
      if (!course) throw new Error(`Unknown seed course ${number}`);
      return courseItems(course);
    }),
  };
}

export const MIT_OCW_PRESET_PLAYLISTS: Playlist[] = [
  preset('cs-foundations', 'CS Foundations', 'engineering', 'computer-science', 'foundations', 'introductory', 'Start programming and pick up the math computer science leans on.', ['6.0001', '6.0002', '6.042J']),
  preset('cs-algorithms-theory', 'Algorithms and Theory', 'engineering', 'computer-science', 'algorithms-theory', 'intermediate', 'From data structures to what can be computed at all.', ['6.006', '6.046J', '18.404J']),
  preset('cs-ai-ml', 'AI and Machine Learning', 'engineering', 'computer-science', 'ai-ml', 'intermediate', 'Classical AI, modern machine learning, and the linear algebra underneath.', ['6.034', '6.036', '18.065']),
  preset('cs-systems', 'Computer Systems', 'engineering', 'computer-science', 'systems', 'intermediate', 'How hardware runs software, and how to build systems that are fast and reliable.', ['6.004', '6.033', '6.172']),
  preset('math-calculus', 'The Calculus Sequence', 'science', 'mathematics', 'calculus', 'introductory', 'Single-variable, multivariable, and differential equations, in that order.', ['18.01', '18.02', '18.03']),
  preset('math-linear-algebra-probability', 'Linear Algebra and Probability', 'science', 'mathematics', 'linear-algebra-probability', 'introductory', 'The two subjects every quantitative field assumes.', ['18.06', '18.05']),
  preset('physics-core', 'Core Physics', 'science', 'physics', 'core-physics', 'introductory', 'Mechanics, electromagnetism, then a first look at quantum.', ['8.01SC', '8.02', '8.04']),
  preset('life-sciences-core', 'Life Sciences Core', 'science', 'biology-chemistry', 'life-sciences-core', 'introductory', 'Biology and the chemistry it is built on.', ['5.111SC', '7.016', '7.012']),
  preset('brain-mind', 'Brain and Mind', 'science', 'brain-cognitive', 'brain-mind', 'introductory', 'Psychology and neuroscience for the curious.', ['9.00SC', '9.13']),
  preset('econ-principles', 'Economics Principles', 'social-science', 'economics', 'principles', 'introductory', 'Micro then macro: how markets and economies work.', ['14.01SC', '14.02']),
  preset('finance-theory', 'Finance Theory', 'social-science', 'finance', 'finance-theory', 'intermediate', 'Valuation, risk, and return.', ['15.401']),
];
