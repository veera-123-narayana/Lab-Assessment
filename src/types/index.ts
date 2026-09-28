export type QuestionType =
  | 'definition'
  | 'conceptual'
  | 'application'
  | 'scenario'
  | 'comparison'
  | 'output_based'
  | 'code_based'
  | 'debugging'
  | 'numerical'
  | 'formula_based'
  | 'sequence_process'
  | 'matching'
  | 'architecture'
  | 'practical_lab'
  | 'error_analysis'
  | 'assertion_reason'
  | 'multiple_statement'
  | 'case_study';

export interface QuestionSource {
  type: 'original' | 'research-informed' | 'admin_upload';
  title?: string;
  url?: string;
}

export interface Question {
  id: string;
  questionNumber?: number;
  text: string;
  options: [string, string, string, string];
  correctAnswer: number; // 0, 1, 2, 3
  explanation?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: 'easy' | 'normal' | 'medium' | 'hard' | string;
  questionType?: QuestionType | string;
  source?: QuestionSource;
  codeSnippet?: string;
}

export type ExamDifficulty = 'Easy' | 'Normal' | 'Medium' | 'Hard' | 'AI_CHOICE' | 'AI Choice';

export interface TopicCoverageItem {
  topic: string;
  questionCount: number;
}

export interface FacultyReviewSummary {
  subject: string;
  mainTopic: string;
  totalQuestions: number;
  maxMarks: number;
  difficultyDistribution: Record<string, number>;
  topicCoverage: TopicCoverageItem[];
  questionTypeDistribution: Record<string, number>;
  validation: {
    duplicateQuestions: number;
    invalidQuestions: number;
    ambiguousQuestions: number;
    coverageIssues: number;
    status: 'READY FOR FACULTY REVIEW' | 'NEEDS_REVISION';
  };
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  subject?: string;
  topic: string;
  subtopics?: string;
  coverage: string;
  academicLevel?: string;
  targetBranch: string;
  targetSection: string;
  targetYear: string;
  difficulty: ExamDifficulty;
  durationMinutes: number;
  questions: Question[];
  totalMarks: number;
  additionalInstructions?: string;
  generationMode?: 'ai_generated' | 'research_informed' | 'admin_question_bank';
  facultySummary?: FacultyReviewSummary;
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
