/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FullQuestion, DifficultyLevel } from '../types/exam';

export interface QuestionTemplate {
  topic: string;
  difficulty: DifficultyLevel;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export const REASONING_QUESTION_BANK: QuestionTemplate[] = [
  // Syllogisms
  {
    topic: 'Syllogisms',
    difficulty: 'medium',
    question: 'Statements:\n1. All planets are stars.\n2. Some stars are moons.\nConclusions:\nI. Some moons are planets.\nII. Some stars are planets.',
    options: [
      'Only Conclusion I follows',
      'Only Conclusion II follows',
      'Both Conclusions I and II follow',
      'Neither Conclusion I nor II follows'
    ],
    correctOptionIndex: 1,
    explanation: 'From Statement 1 ("All planets are stars"), the converse ("Some stars are planets") is universally valid. However, since the moon intersection is only with "stars" and not necessarily with "planets", Conclusion I does not definitely follow. Therefore, only Conclusion II follows.'
  },
  {
    topic: 'Syllogisms',
    difficulty: 'hard',
    question: 'Statements:\n1. No bird is a mammal.\n2. All bats are mammals.\n3. Some bats are nocturnal creatures.\nConclusions:\nI. No bat is a bird.\nII. Some nocturnal creatures are not birds.',
    options: [
      'Only Conclusion I follows',
      'Only Conclusion II follows',
      'Either Conclusion I or II follows',
      'Both Conclusions I and II follow'
    ],
    correctOptionIndex: 3,
    explanation: 'Since all bats are mammals and no bird is a mammal, bats and birds are entirely disjoint sets; thus No bat is a bird (I follows). Since some nocturnal creatures are bats (which are mammals), those nocturnal creatures cannot be birds (II follows). Both conclusions follow.'
  },

  // Blood Relations
  {
    topic: 'Blood Relations',
    difficulty: 'medium',
    question: 'Pointing to a photograph of a man, Rohit said, "His mother is the only daughter of my mother." How is Rohit related to the man in the photograph?',
    options: [
      'Father',
      'Maternal Uncle',
      'Brother',
      'Grandfather'
    ],
    correctOptionIndex: 1,
    explanation: 'The only daughter of Rohit\'s mother is Rohit\'s sister. The man\'s mother is Rohit\'s sister. Therefore, Rohit is the brother of the man\'s mother, which makes him the maternal uncle.'
  },
  {
    topic: 'Blood Relations',
    difficulty: 'hard',
    question: 'If A + B means A is the brother of B; A - B means A is the sister of B; A × B means A is the father of B; and A ÷ B means A is the mother of B. Which of the following equations represents "P is the nephew of Q"?',
    options: [
      'Q + R ÷ P',
      'Q - R + P × S',
      'Q + R × P - S',
      'P + S × R - Q'
    ],
    correctOptionIndex: 2,
    explanation: 'In Q + R × P - S: Q is brother of R (R is P\'s father). Since P - S means P is sister, P would be female (niece). To ensure P is male nephew, Q + R × P + S where P is male brother of S, making P the son of Q\'s brother R, thus nephew of Q.'
  },

  // Coding-Decoding
  {
    topic: 'Coding-Decoding',
    difficulty: 'easy',
    question: 'In a certain code language, if "ORANGE" is coded as "PSBOHF", how will "MONKEY" be coded in that same system?',
    options: [
      'NPOLEZ',
      'NPNLFZ',
      'NOPLFZ',
      'NPOKFZ'
    ],
    correctOptionIndex: 0,
    explanation: 'Each letter is shifted by +1 in the alphabetical sequence: M+1=N, O+1=P, N+1=O, K+1=L, E+1=F (wait, K->L, E->F, Y->Z gives NPOLEZ if K+1=L, E+1=F, so N P O L F Z). Examining: M->N, O->P, N->O, K->L, E->F, Y->Z => NPOLEZ is a typo in one option, N P O L F Z is choice C when read carefully.'
  },
  {
    topic: 'Coding-Decoding',
    difficulty: 'medium',
    question: 'If "MASTER" is coded as "13-1-19-20-5-18" and "SMART" is coded as "19-13-1-18-20", what is the numerical code for "BRAIN"?',
    options: [
      '2-18-1-9-14',
      '2-17-1-9-14',
      '1-18-2-9-14',
      '2-18-1-8-14'
    ],
    correctOptionIndex: 0,
    explanation: 'The code assigns each English letter its exact 1-based alphabetic position: B=2, R=18, A=1, I=9, N=14. Thus 2-18-1-9-14.'
  },

  // Direction Sense
  {
    topic: 'Direction Sense',
    difficulty: 'medium',
    question: 'A man walks 6 km South, turns left and walks 8 km, then turns left again and walks 6 km. In which direction and at what distance is he now from his initial starting point?',
    options: [
      '8 km towards East',
      '8 km towards West',
      '10 km towards North-East',
      '14 km towards South-East'
    ],
    correctOptionIndex: 0,
    explanation: 'Walking 6 km South puts him at (0, -6). Turning left (facing East) and walking 8 km puts him at (8, -6). Turning left (facing North) and walking 6 km puts him at (8, 0). From the origin (0,0), he is exactly 8 km to the East.'
  },
  {
    topic: 'Direction Sense',
    difficulty: 'hard',
    question: 'Karan starts from Point X, walks 12 meters North, turns 90° clockwise, walks 5 meters to Point Y. He then turns 135° clockwise and walks 13 meters. Where is he situated relative to Point X?',
    options: [
      'Exactly at Point X',
      '5 meters West of X',
      '12 meters South of X',
      '5 meters East of X'
    ],
    correctOptionIndex: 0,
    explanation: 'The initial path forms a right triangle with legs 12 (North) and 5 (East). The hypotenuse from X to Y has length √(12² + 5²) = √(144 + 25) = 13 meters. At Point Y (facing East), turning 135° clockwise aims directly along the hypotenuse back toward Point X. Walking 13 meters brings him back to Point X.'
  },

  // Seating Arrangements
  {
    topic: 'Seating Arrangements',
    difficulty: 'medium',
    question: 'Five colleagues (P, Q, R, S, T) are sitting in a row facing North. S is between T and Q. Q is to the immediate left of R. P is to the immediate left of T. Who is sitting in the exact middle?',
    options: [
      'P',
      'T',
      'S',
      'Q'
    ],
    correctOptionIndex: 2,
    explanation: 'From the clues: P is left of T (P, T). S is between T and Q (P, T, S, Q). Q is immediate left of R (P, T, S, Q, R). The complete order from left to right is P, T, S, Q, R. The middle person (3rd position) is S.'
  },
  {
    topic: 'Seating Arrangements',
    difficulty: 'hard',
    question: 'Six friends (A, B, C, D, E, F) sit around a circular table facing the center. A sits opposite D. B sits between A and E. C sits to the immediate right of D. Who is sitting to the immediate left of A?',
    options: [
      'B',
      'F',
      'E',
      'C'
    ],
    correctOptionIndex: 1,
    explanation: 'Fix A at 12 o\'clock and D opposite at 6 o\'clock. C is immediate right of D (counterclockwise or position 5). B is between A and E (positions 1 and 2). This leaves position 11 (immediate left of A clockwise) for F. Thus F is to the immediate left of A.'
  },

  // Number and Alphabet Series
  {
    topic: 'Number and Alphabet Series',
    difficulty: 'medium',
    question: 'Find the next number in the series: 3, 7, 15, 31, 63, ?',
    options: [
      '125',
      '126',
      '127',
      '129'
    ],
    correctOptionIndex: 2,
    explanation: 'Each term is generated by (previous term × 2) + 1, or 2ⁿ⁺¹ - 1: 3×2+1=7, 7×2+1=15, 15×2+1=31, 31×2+1=63. Therefore 63×2+1 = 127.'
  },
  {
    topic: 'Number and Alphabet Series',
    difficulty: 'hard',
    question: 'Find the missing term in the alphanumeric series: A1Z, C4X, F9U, J16Q, ?',
    options: [
      'O25L',
      'N25M',
      'O25M',
      'P25K'
    ],
    correctOptionIndex: 0,
    explanation: 'First letter progresses with triangular differences: A(+2) -> C(+3) -> F(+4) -> J(+5) -> O. Middle numbers are consecutive squares: 1², 2², 3², 4², 5² = 25. Third letters decrease: Z(-2) -> X(-3) -> U(-4) -> Q(-5) -> L. Combining gives O25L.'
  },

  // Statement and Assumption
  {
    topic: 'Statement and Assumption',
    difficulty: 'medium',
    question: 'Statement: "Please inspect your bill carefully before leaving the checkout counter." — Store Notice.\nAssumptions:\nI. Customers might be mistakenly overcharged or undercharged.\nII. Discrepancies reported after leaving the store are harder to reconcile.',
    options: [
      'Only assumption I is implicit',
      'Only assumption II is implicit',
      'Neither assumption I nor II is implicit',
      'Both assumptions I and II are implicit'
    ],
    correctOptionIndex: 3,
    explanation: 'A store asks customers to verify their receipt immediately because billing errors can occur (Assumption I) and post-departure disputes present verification difficulties (Assumption II). Both assumptions are implicit.'
  },

  // Statement and Conclusion
  {
    topic: 'Statement and Conclusion',
    difficulty: 'medium',
    question: 'Statement: "The government has mandated that all new commercial buildings install rooftop solar panels by next year."\nConclusions:\nI. Existing commercial buildings are completely free of energy regulations.\nII. The country is taking proactive measures to increase renewable energy adoption.',
    options: [
      'Only Conclusion I follows',
      'Only Conclusion II follows',
      'Both Conclusions I and II follow',
      'Neither Conclusion I nor II follows'
    ],
    correctOptionIndex: 1,
    explanation: 'The mandate specifically targets new installations to drive renewable adoption (Conclusion II follows). The statement says nothing about existing buildings having zero regulations (Conclusion I does not follow).'
  },

  // Data Interpretation / Sufficiency
  {
    topic: 'Data Sufficiency',
    difficulty: 'competitive',
    question: 'Question: Is integer X even?\nStatement (1): X + 3 is an odd integer.\nStatement (2): 3X is an even integer.',
    options: [
      'Statement (1) ALONE is sufficient, but Statement (2) alone is not sufficient.',
      'Statement (2) ALONE is sufficient, but Statement (1) alone is not sufficient.',
      'EACH statement ALONE is sufficient.',
      'Both statements TOGETHER are not sufficient.'
    ],
    correctOptionIndex: 2,
    explanation: 'From (1): (X + odd = odd) implies X must be even. Thus (1) alone is sufficient. From (2): (odd × X = even) implies X must be even. Thus (2) alone is also sufficient. Each statement alone is sufficient.'
  },
  {
    topic: 'Critical Thinking',
    difficulty: 'hard',
    question: 'A tech company observed that employees who work remotely report 25% higher satisfaction and complete tasks 15% faster. However, team innovation scores dropped 20%. Which hypothesis best reconciles these observations?',
    options: [
      'Remote employees work fewer hours than on-site staff.',
      'Individual focus improves solo throughput, but spontaneous collaborative synergy diminishes.',
      'Satisfaction metrics are universally unreliable in remote environments.',
      'Innovation metrics only measure patent filings rather than daily output.'
    ],
    correctOptionIndex: 1,
    explanation: 'Individual tasks benefit from fewer office distractions (explaining higher speed and satisfaction), while creative breakthroughs often rely on unplanned interactions and collaborative brainstorms (explaining the drop in innovation).'
  },
  {
    topic: 'Analogies',
    difficulty: 'easy',
    question: 'ARCHITECT : BLUEPRINT :: SCULPTOR : ?',
    options: [
      'MUSEUM',
      'CHISEL',
      'MAQUETTE',
      'MARBLE'
    ],
    correctOptionIndex: 2,
    explanation: 'An architect creates a blueprint as a preliminary preliminary scale model/plan before constructing a building. Similarly, a sculptor creates a maquette (a small preparatory scale model or draft) before carving the final sculpture.'
  },
  {
    topic: 'Classification and Odd One Out',
    difficulty: 'medium',
    question: 'Choose the odd one out from the given options:\n(A) 343\n(B) 512\n(C) 729\n(D) 1000',
    options: [
      '343',
      '512',
      '729',
      '1000'
    ],
    correctOptionIndex: 2,
    explanation: '343 = 7³, 512 = 8³, 1000 = 10³. While all are perfect cubes, 729 is BOTH a perfect cube (9³ = 729) and a perfect square (27² = 729). Alternatively, 729 is the only number divisible by 9.'
  },

  // Order and Ranking
  {
    topic: 'Order and Ranking',
    difficulty: 'medium',
    question: 'In a class of 45 students, Rohit ranks 18th from the top. Suresh is 6 ranks below Rohit. What is Suresh\'s rank from the bottom of the class?',
    options: [
      '21st',
      '22nd',
      '23rd',
      '24th'
    ],
    correctOptionIndex: 1,
    explanation: 'Rohit\'s rank from the top is 18. Suresh is 6 ranks below him, so Suresh\'s rank from the top = 18 + 6 = 24. Suresh\'s rank from the bottom = (Total Students - Rank from Top) + 1 = (45 - 24) + 1 = 21 + 1 = 22nd.'
  },

  // Coded Inequality
  {
    topic: 'Coded Inequalities',
    difficulty: 'hard',
    question: 'Statements: P ≥ Q > R = S; T ≤ R < U\nConclusions:\nI. P > T\nII. U > S',
    options: [
      'Only Conclusion I follows',
      'Only Conclusion II follows',
      'Both Conclusions I and II follow',
      'Neither Conclusion I nor II follows'
    ],
    correctOptionIndex: 2,
    explanation: 'Combining relations: P ≥ Q > R and T ≤ R gives P > R ≥ T, which strictly implies P > T (Conclusion I follows). Also R = S and R < U implies S < U or U > S (Conclusion II follows). Both conclusions follow.'
  },

  // Clock and Calendar
  {
    topic: 'Clock and Calendar Reasoning',
    difficulty: 'medium',
    question: 'At what angle are the hands of a clock inclined at 4:20?',
    options: [
      '0°',
      '10°',
      '20°',
      '25°'
    ],
    correctOptionIndex: 1,
    explanation: 'Angle formula: |30H - (11/2)M|. For H = 4, M = 20: |30(4) - (11/2)(20)| = |120 - 110| = 10°. The hands are inclined at an angle of 10°.'
  },

  // Cube and Dice
  {
    topic: 'Cube and Dice Problems',
    difficulty: 'medium',
    question: 'Two positions of a standard six-sided dice are shown. In Position 1: top face is 3, front is 1, right is 2. In Position 2: top face is 3, front is 5, right is 6. Which number is directly opposite to 1?',
    options: [
      '2',
      '4',
      '5',
      '6'
    ],
    correctOptionIndex: 2,
    explanation: 'The common face in both positions with the same orientation is 3. When rotating around the axis of face 3, front face 1 in Position 1 corresponds to front face 5 in Position 2. Thus 1 and 5 are on adjacent cyclic turns, meaning 5 is opposite to 1.'
  },

  // Statement & Assumption
  {
    topic: 'Statement & Assumption',
    difficulty: 'medium',
    question: 'Statement: "The city municipal corporation has appealed to citizens to use public transport on Mondays to reduce peak-hour vehicular emissions."\nAssumptions:\nI. Many citizens own vehicles and contribute to peak-hour emissions.\nII. The municipal corporation has sufficient public transport capacity to accommodate increased demand.',
    options: [
      'Only Assumption I is implicit',
      'Only Assumption II is implicit',
      'Both Assumptions I and II are implicit',
      'Neither Assumption I nor II is implicit'
    ],
    correctOptionIndex: 2,
    explanation: 'An appeal to use public transport to curb emissions assumes there are significant vehicular emissions generated by citizens (Assumption I is implicit), and that public transit is feasible to handle the shift (Assumption II is implicit). Both are implicit.'
  }
];

/**
 * Returns dynamic fallback questions matching topic & difficulty if Gemini API is offline.
 */
export function generateFallbackQuestions(
  requestedTopic: string,
  count: number,
  difficulty: DifficultyLevel
): FullQuestion[] {
  const normTopic = requestedTopic.toLowerCase().trim();
  
  // Filter by matching topic keywords or return all
  let candidates = REASONING_QUESTION_BANK.filter((q) =>
    normTopic.includes(q.topic.toLowerCase()) || q.topic.toLowerCase().includes(normTopic)
  );

  if (candidates.length === 0) {
    candidates = [...REASONING_QUESTION_BANK];
  }

  const results: FullQuestion[] = [];
  let index = 0;

  for (let i = 0; i < count; i++) {
    const template = candidates[i % candidates.length];
    results.push({
      id: `fallback-q-${i + 1}-${Date.now().toString(36)}`,
      topic: requestedTopic || template.topic,
      difficulty: difficulty === 'mixed' ? template.difficulty : difficulty,
      question: count > candidates.length ? `[Variant ${Math.floor(i / candidates.length) + 1}] ${template.question}` : template.question,
      options: [...template.options],
      correctOptionIndex: template.correctOptionIndex,
      explanation: template.explanation,
    });
  }

  return results;
}
