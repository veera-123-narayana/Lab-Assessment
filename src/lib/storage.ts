import { Exam, StudentSubmission } from '../types';

const STORAGE_KEYS = {
  EXAMS: 'apogee_exams_v1',
  SUBMISSIONS: 'apogee_submissions_v1',
  ACTIVE_EXAM_ID: 'apogee_active_exam_id',
  THEME: 'apogee_theme_mode',
};

const DEFAULT_EXAMS: Exam[] = [
  {
    id: 'exam_cs301_dsa',
    code: 'CSE-LAB-301',
    title: 'Advanced Data Structures & Algorithms Lab Assessment',
    topic: 'Trees, Graphs, and Hash Structures',
    coverage: 'Binary Search Trees, AVL balance rotations, Dijkstra & BFS/DFS graphs, Hash collision resolution',
    targetBranch: 'Computer Science & Engineering',
    targetSection: 'Section A',
    targetYear: '3rd Year',
    difficulty: 'Hard',
    durationMinutes: 20,
    totalMarks: 5,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    status: 'active',
    maxViolations: 3,
    questions: [
      {
        id: 'q_dsa_1',
        text: 'What is the maximum height of an AVL tree containing n nodes?',
        options: [
          'Approximately 1.44 log2(n)',
          'Strictly floor(log2(n))',
          'O(n^(1/2)) in worst degeneration',
          'Exactly log3(n) + 1'
        ],
        correctAnswer: 0,
        explanation: 'The height of an AVL tree with n nodes cannot exceed 1.4404 * log2(n + 2) - 0.328, bounding search time strictly to O(log n).',
        topic: 'AVL Trees',
        codeSnippet: '// Balance Factor definition\nint bf = height(node->left) - height(node->right);\nassert(abs(bf) <= 1);'
      },
      {
        id: 'q_dsa_2',
        text: 'Which graph algorithm guarantees the shortest path from a single source when edge weights are non-negative?',
        options: [
          'Dijkstra\'s Algorithm with Min-Priority Queue',
          'Bellman-Ford Algorithm with negative cycle detection',
          'Floyd-Warshall all-pairs shortest paths',
          'Kruskal\'s Minimum Spanning Tree algorithm'
        ],
        correctAnswer: 0,
        explanation: 'Dijkstra greedy formulation explores non-negative edges optimally with O((V+E) log V) complexity.',
        topic: 'Graph Algorithms'
      },
      {
        id: 'q_dsa_3',
        text: 'In an open-addressing hash table with quadratic probing, what is the primary purpose of the quadratic term c1*i + c2*i^2?',
        options: [
          'To eliminate secondary clustering completely',
          'To reduce primary clustering created by linear probing',
          'To ensure guaranteed 100% load factor capacity',
          'To prevent hardware memory bus caching'
        ],
        correctAnswer: 1,
        explanation: 'Quadratic probing offsets entries by quadratic intervals, resolving adjacent block pileups (primary clustering).',
        topic: 'Hash Tables'
      },
      {
        id: 'q_dsa_4',
        text: 'What will be the in-order traversal of a Binary Search Tree with inserted elements: [45, 12, 67, 34, 89, 23]?',
        options: [
          '12, 23, 34, 45, 67, 89',
          '45, 12, 34, 23, 67, 89',
          '89, 67, 45, 34, 23, 12',
          '12, 34, 23, 45, 89, 67'
        ],
        correctAnswer: 0,
        explanation: 'In-order traversal (Left, Root, Right) of any valid BST always yields keys in strictly monotonic non-decreasing order.',
        topic: 'BST Traversal'
      },
      {
        id: 'q_dsa_5',
        text: 'What is the tightest asymptotic runtime for detecting cycles in an undirected graph with V vertices and E edges using Disjoint Set Union (DSU) with path compression and union by rank?',
        options: [
          'O(E * alpha(V)) where alpha is the inverse Ackermann function',
          'O(V * E log V)',
          'O(V^2)',
          'O(E + V log V)'
        ],
        correctAnswer: 0,
        explanation: 'Path compression and union by rank reduce each DSU operation to virtually constant time O(alpha(V)).',
        topic: 'Disjoint Set Union'
      }
    ]
  },
  {
    id: 'exam_aiml_202',
    code: 'AIML-MOD-202',
    title: 'Machine Learning & Python OOP Internal Assessment',
    topic: 'Python Decorators, Generators & Loss Functions',
    coverage: 'Python Memory Management, PyTorch Tensor Ops, Gradient Descent, Overfitting Mitigation',
    targetBranch: 'Artificial Intelligence & ML',
    targetSection: 'Section B',
    targetYear: '2nd Year',
    difficulty: 'Normal',
    durationMinutes: 15,
    totalMarks: 4,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    status: 'active',
    maxViolations: 3,
    questions: [
      {
        id: 'q_aiml_1',
        text: 'What does Python\'s "yield from" syntax achieve in a recursive generator function?',
        options: [
          'Delegates iteration directly to a subgenerator, cleanly transparently forwarding values and exceptions',
          'Converts the generator into a synchronous blocking list in RAM',
          'Raises an automatic StopIteration error upon the first yield',
          'Executes the code block on a secondary OS thread'
        ],
        correctAnswer: 0,
        explanation: 'yield from establishes a direct two-way channel between the caller and the subgenerator.',
        topic: 'Python Generators'
      },
      {
        id: 'q_aiml_2',
        text: 'Which regularisation technique randomly zeroes out hidden neuron activations during forward passes in training?',
        options: [
          'Dropout Regularization',
          'L1 Lasso Regularization',
          'Batch Normalization',
          'Early Stopping Criterion'
        ],
        correctAnswer: 0,
        explanation: 'Dropout randomly deactivates neurons with probability p, preventing co-adaptation of feature detectors.',
        topic: 'Deep Learning'
      },
      {
        id: 'q_aiml_3',
        text: 'Which loss function is optimal for multi-class classification where ground truth labels are mutually exclusive single classes?',
        options: [
          'Categorical Cross-Entropy Loss (Log Loss)',
          'Mean Squared Error (MSE)',
          'Hinge Loss with Slack Variables',
          'Binary Cross-Entropy with Logits'
        ],
        correctAnswer: 0,
        explanation: 'Categorical Cross-Entropy coupled with Softmax activation produces calibrated probability distributions over disjoint categories.',
        topic: 'Loss Functions'
      },
      {
        id: 'q_aiml_4',
        text: 'In Python, what mechanism prevents multiple native threads from executing Python bytecodes simultaneously in CPython?',
        options: [
          'Global Interpreter Lock (GIL)',
          'Thread Synchronization Mutex in kernel space',
          'Asynchronous Event Loop',
          'Virtual Memory Paging Guard'
        ],
        correctAnswer: 0,
        explanation: 'The GIL in CPython synchronizes memory management and restricts Python bytecode execution to one thread at any instant.',
        topic: 'Python Concurrency'
      }
    ]
  }
];

const DEFAULT_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub_demo_1',
    examId: 'exam_cs301_dsa',
    examCode: 'CSE-LAB-301',
    examTitle: 'Advanced Data Structures & Algorithms Lab Assessment',
    student: {
      fullName: 'Aarav Sharma',
      rollNumber: '22KB1A0501',
      email: 'aarav.sharma@nbkrist.org',
      branch: 'Computer Science & Engineering',
      section: 'Section A',
      year: '3rd Year',
    },
    answers: {
      q_dsa_1: 0,
      q_dsa_2: 0,
      q_dsa_3: 1,
      q_dsa_4: 0,
      q_dsa_5: 0,
    },
    questionOrder: ['q_dsa_1', 'q_dsa_2', 'q_dsa_3', 'q_dsa_4', 'q_dsa_5'],
    score: 5,
    totalQuestions: 5,
    percentage: 100,
    violationsCount: 0,
    violationLogs: [],
    startedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 19.6).toISOString(),
    status: 'submitted',
  },
  {
    id: 'sub_demo_2',
    examId: 'exam_cs301_dsa',
    examCode: 'CSE-LAB-301',
    examTitle: 'Advanced Data Structures & Algorithms Lab Assessment',
    student: {
      fullName: 'Sneha Reddy',
      rollNumber: '22KB1A0542',
      email: 'sneha.reddy@nbkrist.org',
      branch: 'Computer Science & Engineering',
      section: 'Section A',
      year: '3rd Year',
    },
    answers: {
      q_dsa_1: 0,
      q_dsa_2: 0,
      q_dsa_3: 0,
      q_dsa_4: 0,
      q_dsa_5: 0,
    },
    questionOrder: ['q_dsa_2', 'q_dsa_1', 'q_dsa_4', 'q_dsa_3', 'q_dsa_5'],
    score: 4,
    totalQuestions: 5,
    percentage: 80,
    violationsCount: 1,
    violationLogs: [
      {
        id: 'v1',
        type: 'tab_switch',
        timestamp: new Date(Date.now() - 3600000 * 19.8).toISOString(),
        details: 'Student switched away from exam browser window.',
      },
    ],
    startedAt: new Date(Date.now() - 3600000 * 20.2).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 19.7).toISOString(),
    status: 'submitted',
  },
  {
    id: 'sub_demo_3',
    examId: 'exam_cs301_dsa',
    examCode: 'CSE-LAB-301',
    examTitle: 'Advanced Data Structures & Algorithms Lab Assessment',
    student: {
      fullName: 'Vikram Patel',
      rollNumber: '22KB1A0589',
      email: 'vikram.patel@nbkrist.org',
      branch: 'Computer Science & Engineering',
      section: 'Section A',
      year: '3rd Year',
    },
    answers: {
      q_dsa_1: 1,
      q_dsa_2: 0,
      q_dsa_3: 2,
      q_dsa_4: 0,
      q_dsa_5: 1,
    },
    questionOrder: ['q_dsa_4', 'q_dsa_3', 'q_dsa_2', 'q_dsa_5', 'q_dsa_1'],
    score: 2,
    totalQuestions: 5,
    percentage: 40,
    violationsCount: 3,
    violationLogs: [
      { id: 'v1', type: 'fullscreen_exit', timestamp: new Date(Date.now() - 3600000 * 18.5).toISOString(), details: 'Fullscreen exited' },
      { id: 'v2', type: 'tab_switch', timestamp: new Date(Date.now() - 3600000 * 18.3).toISOString(), details: 'Window blur detected' },
      { id: 'v3', type: 'devtools_or_shortcut', timestamp: new Date(Date.now() - 3600000 * 18.2).toISOString(), details: 'Prohibited key combination attempted' },
    ],
    startedAt: new Date(Date.now() - 3600000 * 18.7).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 18.2).toISOString(),
    status: 'terminated_due_to_violations',
  }
];

export function getStoredExams(): Exam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(DEFAULT_EXAMS));
      return DEFAULT_EXAMS;
    }
    const parsed: Exam[] = JSON.parse(raw);
    // Sanitize any dummy URLs
    const sanitized = parsed.map((e) => {
      if (e.driveSpreadsheetUrl && e.driveSpreadsheetUrl.includes('demo_cse_2026_secA')) {
        return { ...e, driveSpreadsheetUrl: undefined, driveSpreadsheetId: undefined, driveFileName: undefined, exportedAt: undefined };
      }
      return e;
    });
    return sanitized;
  } catch (err) {
    console.error('Error reading stored exams:', err);
    return DEFAULT_EXAMS;
  }
}

export function saveStoredExams(exams: Exam[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  } catch (err) {
    console.error('Error saving stored exams:', err);
  }
}

export function getStoredSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(DEFAULT_SUBMISSIONS));
      return DEFAULT_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading stored submissions:', err);
    return DEFAULT_SUBMISSIONS;
  }
}

export function saveStoredSubmissions(subs: StudentSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
  } catch (err) {
    console.error('Error saving stored submissions:', err);
  }
}

/**
 * Validates if student with this roll number has already taken this exam
 */
export function checkPreviousSubmission(rollNumber: string, examId: string): StudentSubmission | null {
  const all = getStoredSubmissions();
  const cleanRoll = rollNumber.trim().toUpperCase();
  const found = all.find(
    (s) => s.examId === examId && s.student.rollNumber.trim().toUpperCase() === cleanRoll
  );
  return found || null;
}

export function recordSubmission(submission: StudentSubmission): void {
  const all = getStoredSubmissions();
  // Filter out any existing matching to guarantee single authoritative submission
  const filtered = all.filter(
    (s) => !(s.examId === submission.examId && s.student.rollNumber.trim().toUpperCase() === submission.student.rollNumber.trim().toUpperCase())
  );
  filtered.push(submission);
  saveStoredSubmissions(filtered);
}

export function updateExamDriveRecord(examId: string, driveUrl: string, fileId: string, fileName: string): void {
  const exams = getStoredExams();
  const idx = exams.findIndex((e) => e.id === examId);
  if (idx !== -1) {
    exams[idx].driveSpreadsheetUrl = driveUrl;
    exams[idx].driveSpreadsheetId = fileId;
    exams[idx].driveFileName = fileName;
    exams[idx].exportedAt = new Date().toISOString();
    saveStoredExams(exams);
  }
}

export function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'dark';
}

export function setTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
