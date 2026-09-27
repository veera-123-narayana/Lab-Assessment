export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0, 1, 2, 3
  explanation?: string;
  topic?: string;
  codeSnippet?: string;
}

export type ExamDifficulty = 'Easy' | 'Normal' | 'Medium' | 'Hard' | 'AI Choice';

export interface Exam {
  id: string;
  code: string;
  title: string;
  topic: string;
  coverage: string;
  targetBranch: string;
  targetSection: string;
  targetYear: string;
  difficulty: ExamDifficulty;
  durationMinutes: number;
  questions: Question[];
  totalMarks: number;
  createdAt: string;
  status: 'active' | 'completed' | 'draft';
  maxViolations: number;
  driveSpreadsheetUrl?: string;
  driveSpreadsheetId?: string;
  driveFileName?: string;
  exportedAt?: string;
}

export interface StudentRegistration {
  fullName: string;
  email: string;
  rollNumber: string;
  branch: string;
  section: string;
  year: string;
}

export interface ViolationEvent {
  id: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'devtools_or_shortcut' | 'blur_window' | 'copy_paste';
  timestamp: string;
  details: string;
}

export interface StudentSubmission {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  student: StudentRegistration;
  answers: Record<string, number>; // questionId -> selectedOptionIndex (0-3)
  questionOrder: string[]; // sequence of question ids seen by student
  score: number;
  totalQuestions: number;
  percentage: number;
  violationsCount: number;
  violationLogs: ViolationEvent[];
  startedAt: string;
  submittedAt: string;
  status: 'submitted' | 'terminated_due_to_violations' | 'timed_out';
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin';
  isAuthenticated: boolean;
}
