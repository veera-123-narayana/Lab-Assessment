import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Maximize2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Send, 
  Award, 
  UserCheck, 
  Lock,
  Sun,
  Moon,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Exam, Question, StudentRegistration, StudentSubmission, ViolationEvent } from '../types';
import { checkPreviousSubmission, getStoredExams, recordSubmission } from '../lib/storage';

interface StudentPortalProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAdminSecret: () => void;
}

type ExamState = 'registration' | 'rules' | 'active' | 'already_taken' | 'completed';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  theme,
  onToggleTheme,
  onOpenAdminSecret,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examState, setExamState] = useState<ExamState>('registration');
  
  // Registration Form
  const [formData, setFormData] = useState<StudentRegistration>({
    fullName: '',
    email: '',
    rollNumber: '',
    branch: 'Computer Science & Engineering',
    section: 'Section A',
    year: '3rd Year',
  });
  const [formError, setFormError] = useState<string>('');
  const [previousSubmissionData, setPreviousSubmissionData] = useState<StudentSubmission | null>(null);

  // Active Exam Runtime State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [tempSelection, setTempSelection] = useState<number | null>(null);
  
  // Timer State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Proctoring & Violations State
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [violationModalMessage, setViolationModalMessage] = useState<string>('');
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);
  const [finalSubmission, setFinalSubmission] = useState<StudentSubmission | null>(null);
  const examContainerRef = useRef<HTMLDivElement>(null);

  // Load available exams
  useEffect(() => {
    const list = getStoredExams().filter((e) => e.status === 'active');
    setExams(list);
    if (list.length > 0) {
      setSelectedExamId(list[0].id);
    }
  }, []);

  // Check duplicate submission on rollNumber / exam change
  const handleCheckAttempt = (roll: string, examId: string) => {
    if (!roll.trim() || !examId) return;
    const existing = checkPreviousSubmission(roll, examId);
    if (existing) {
      setPreviousSubmissionData(existing);
      setExamState('already_taken');
    }
  };

  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.rollNumber.trim()) {
      setFormError('Please fill in all candidate identification fields.');
      return;
    }

    const exam = exams.find((ex) => ex.id === selectedExamId);
    if (!exam) {
      setFormError('Please select a valid active examination.');
      return;
    }

    // Check single attempt rule
    const existing = checkPreviousSubmission(formData.rollNumber, exam.id);
    if (existing) {
      setPreviousSubmissionData(existing);
      setExamState('already_taken');
      return;
    }

    setActiveExam(exam);
    setExamState('rules');
  };

  // Launch the exam with fullscreen and jumbled questions
  const handleStartExam = async () => {
    if (!activeExam) return;

    // Jumble / shuffle questions for each student uniquely based on random seed
    const shuffled = [...activeExam.questions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTempSelection(null);
    setViolations([]);
    setViolationCount(0);
    setTimeLeftSeconds(activeExam.durationMinutes * 60);

    // Request full screen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or permission restricted in iframe:', err);
    }

    setExamState('active');
  };

  // Record a proctoring violation
  const triggerViolation = useCallback(
    (type: ViolationEvent['type'], details: string) => {
      if (examState !== 'active') return;

      const newViolation: ViolationEvent = {
        id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        timestamp: new Date().toISOString(),
        details,
      };

      setViolations((prev) => {
        const nextList = [...prev, newViolation];
        const nextCount = nextList.length;
        setViolationCount(nextCount);

        const max = activeExam?.maxViolations || 3;
        if (nextCount >= max) {
          // Auto submit immediately due to limit reached
          setViolationModalMessage(`CRITICAL: Proctoring violation limit (${max}/${max}) reached! ${details}. Your exam is being automatically submitted.`);
          setShowViolationModal(true);
          setTimeout(() => {
            handleFinalSubmit('terminated_due_to_violations', nextList);
          }, 2000);
        } else {
          setViolationModalMessage(`Warning ${nextCount}/${max}: ${details}. Return to exam immediately. Exceeding ${max} violations will terminate your test!`);
          setShowViolationModal(true);
        }
        return nextList;
      });
    },
    [examState, activeExam]
  );

  // Fullscreen, tab switch, and security listeners
  useEffect(() => {
    if (examState !== 'active') return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('fullscreen_exit', 'Exited fullscreen examination environment');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('tab_switch', 'Browser tab switched or minimized (AI Tool / Search Detection)');
      }
    };

    const handleWindowBlur = () => {
      triggerViolation('blur_window', 'Window lost focus / external application or overlay accessed');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent developer tools, copy, paste, alt-tab, esc
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'u' || e.key === 'a')
      ) {
        e.preventDefault();
        triggerViolation('copy_paste', `Unauthorized shortcut detected: Ctrl+${e.key.toUpperCase()}`);
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))) {
        e.preventDefault();
        triggerViolation('devtools_or_shortcut', 'Developer Tools inspection attempt detected');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('copy_paste', 'Right-click context menu prohibited during assessment');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [examState, triggerViolation]);

  // Countdown timer
  useEffect(() => {
    if (examState !== 'active') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleFinalSubmit('timed_out');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState]);

  // Sync tempSelection whenever current question changes
  useEffect(() => {
    if (shuffledQuestions.length > 0 && currentQuestionIndex < shuffledQuestions.length) {
      const q = shuffledQuestions[currentQuestionIndex];
      setTempSelection(selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : null);
    }
  }, [currentQuestionIndex, shuffledQuestions, selectedAnswers]);

  // Save answer and move to next question
  const handleSaveAndNext = () => {
    if (tempSelection === null) return;
    const currentQ = shuffledQuestions[currentQuestionIndex];
    const updated = {
      ...selectedAnswers,
      [currentQ.id]: tempSelection,
    };
    setSelectedAnswers(updated);

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  // Submit assessment
  const handleFinalSubmit = (
    forcedStatus: 'submitted' | 'terminated_due_to_violations' | 'timed_out' = 'submitted',
    customViolations?: ViolationEvent[]
  ) => {
    if (!activeExam) return;

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Merge active question tempSelection if student selected an option
    const finalAnswers = { ...selectedAnswers };
    if (tempSelection !== null && shuffledQuestions[currentQuestionIndex]) {
      finalAnswers[shuffledQuestions[currentQuestionIndex].id] = tempSelection;
      setSelectedAnswers(finalAnswers);
    }

    const vList = customViolations || violations;
    // Calculate score
    let score = 0;
    activeExam.questions.forEach((q) => {
      if (finalAnswers[q.id] === q.correctAnswer) {
        score += 1;
      }
    });

    const totalQ = activeExam.questions.length;
    const percentage = totalQ > 0 ? (score / totalQ) * 100 : 0;

    const submission: StudentSubmission = {
      id: `sub_${Date.now()}_${formData.rollNumber}`,
      examId: activeExam.id,
      examCode: activeExam.code,
      examTitle: activeExam.title,
      student: { ...formData },
      answers: finalAnswers,
      questionOrder: shuffledQuestions.map((q) => q.id),
      score,
      totalQuestions: totalQ,
      percentage,
      violationsCount: vList.length,
      violationLogs: vList,
      startedAt: new Date(Date.now() - (activeExam.durationMinutes * 60 - timeLeftSeconds) * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      status: forcedStatus,
    };

    recordSubmission(submission);
    setFinalSubmission(submission);
    setShowViolationModal(false);
    setShowFinishConfirmModal(false);
    setExamState('completed');
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const isDark = theme === 'dark';

  return (
    <div
      ref={examContainerRef}
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#080A19] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Background High-Tech Ambient Video */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            isDark ? 'opacity-35' : 'opacity-10'
          }`}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_092641_de52eb87-daf2-41db-92cb-7a56eae012a5.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-b from-[#080A19]/80 via-[#080A19]/60 to-[#080A19]'
              : 'bg-gradient-to-b from-white/90 via-slate-50/80 to-slate-100'
          }`}
        />
      </div>

      {/* Header bar (Students see only student assessment branding, NO prominent admin buttons) */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Apogee Assessment
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              PROCTOR GUARD v3.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl transition-all border ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Discreet Faculty Access Trigger (Accessible via secret URL or discrete lock key) */}
          <button
            onClick={onOpenAdminSecret}
            className="opacity-30 hover:opacity-100 transition-opacity p-2 text-xs flex items-center gap-1 rounded-lg border border-transparent hover:border-white/10"
            title="Faculty Access (Restricted)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        {/* VIEW 1: CANDIDATE REGISTRATION */}
        {examState === 'registration' && (
          <div className="w-full max-w-xl mx-auto">
            <div
              className={`rounded-3xl p-6 sm:p-9 backdrop-blur-2xl border shadow-2xl transition-all ${
                isDark
                  ? 'bg-[rgba(17,16,25,0.75)] border-white/10 shadow-black/60'
                  : 'bg-white/95 border-slate-200 shadow-slate-200/80 text-slate-800'
              }`}
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <UserCheck className="w-3.5 h-3.5" />
                  Candidate Identification
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Lab & Examination Entry
                </h1>
                <p className={`text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your official university credentials to register for this session.
                </p>
              </div>

              {formError && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStartRegistration} className="space-y-4">
                {/* Select Examination */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Active Assessment Session
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      handleCheckAttempt(formData.rollNumber, e.target.value);
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark
                        ? 'bg-white/5 border-white/15 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                        [{ex.code}] {ex.title} ({ex.questions.length} MCQs, {ex.durationMinutes} mins)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark
                        ? 'bg-white/5 border-white/15 text-white placeholder-white/30'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Roll Number & Email in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Roll Number (Unique ID)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 23KB1A3334"
                      value={formData.rollNumber}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({ ...formData, rollNumber: val });
                        handleCheckAttempt(val, selectedExamId);
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark
                          ? 'bg-white/5 border-white/15 text-white placeholder-white/30'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. student@nbkrist.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark
                          ? 'bg-white/5 border-white/15 text-white placeholder-white/30'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Branch, Section, Year in 3 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Branch
                    </label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Computer Science & Engineering">CSE</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Artificial Intelligence & ML">AIML</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Electronics & Comm. Eng">ECE</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Information Technology">IT</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Mechanical Engineering">MECH</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Section
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Section A">Section A</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Section B">Section B</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="Section C">Section C</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Year
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="1st Year">1st Year</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="2nd Year">2nd Year</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="3rd Year">3rd Year</option>
                      <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Proctoring Instructions</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* VIEW 2: ALREADY TAKEN EXAM NOTICE (Single Attempt Rule Enforcement) */}
        {examState === 'already_taken' && previousSubmissionData && (
          <div className="w-full max-w-lg mx-auto">
            <div
              className={`rounded-3xl p-6 sm:p-9 backdrop-blur-2xl border shadow-2xl text-center ${
                isDark
                  ? 'bg-rose-950/40 border-rose-500/30 text-white'
                  : 'bg-white border-rose-200 text-slate-800'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-5 border border-rose-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-rose-400 mb-2">
                Assessment Already Completed
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Candidate with Roll Number{' '}
                <strong className="font-mono text-indigo-400">
                  {previousSubmissionData.student.rollNumber}
                </strong>{' '}
                has already submitted this examination. Each student is strictly permitted to attempt the test once.
              </p>

              <div
                className={`text-left rounded-2xl p-4 mb-6 border text-xs sm:text-sm space-y-2 ${
                  isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="opacity-60">Candidate Name:</span>
                  <span className="font-semibold">{previousSubmissionData.student.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Submitted At:</span>
                  <span className="font-mono">
                    {new Date(previousSubmissionData.submittedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Marks Recorded:</span>
                  <span className="font-bold text-emerald-400">
                    {previousSubmissionData.score} / {previousSubmissionData.totalQuestions} ({previousSubmissionData.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Recorded Status:</span>
                  <span className="font-mono uppercase text-amber-400">{previousSubmissionData.status}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setPreviousSubmissionData(null);
                  setExamState('registration');
                }}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium transition-colors"
              >
                Return to Candidate Login
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: PROCTORING & EXAM RULES */}
        {examState === 'rules' && activeExam && (
          <div className="w-full max-w-2xl mx-auto">
            <div
              className={`rounded-3xl p-6 sm:p-9 backdrop-blur-2xl border shadow-2xl ${
                isDark ? 'bg-[rgba(17,16,25,0.85)] border-white/10' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{activeExam.title}</h2>
                  <p className="text-xs font-mono opacity-70 mt-1">
                    Code: {activeExam.code} • Duration: {activeExam.durationMinutes} Minutes • Questions: {activeExam.questions.length} MCQs
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready to Launch
                </span>
              </div>

              <div className="space-y-4 mb-7 text-xs sm:text-sm">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  <Maximize2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Mandatory Fullscreen Mode</h4>
                    <p className="opacity-80 mt-0.5">
                      Starting this test locks your browser in Fullscreen mode. Exiting fullscreen or pressing Esc is tracked as an infraction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">AI Tools & Tab Switching Detection</h4>
                    <p className="opacity-80 mt-0.5">
                      Switching browser tabs, opening ChatGPT/Claude/Gemini, copy-pasting, right-clicking, or accessing secondary windows will immediately log a proctoring violation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">Single Attempt & Automatic Submission</h4>
                    <p className="opacity-80 mt-0.5">
                      Reaching <strong>{activeExam.maxViolations || 3} violations</strong> or letting the countdown reach 00:00 will terminate and submit your assessment automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setExamState('registration')}
                  className="px-5 py-3 rounded-xl border border-white/15 hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartExam}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Enter Fullscreen & Begin Assessment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ACTIVE EXAM IN PROGRESS (ONE BY ONE QUESTIONS & SAVE AND NEXT) */}
        {examState === 'active' && activeExam && shuffledQuestions.length > 0 && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            {/* Top Exam HUD: Timer, Progress, Violations */}
            <div
              className={`rounded-2xl p-4 backdrop-blur-xl border flex flex-wrap items-center justify-between gap-3 shadow-lg ${
                isDark ? 'bg-black/60 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="font-bold text-sm sm:text-base">{activeExam.title}</div>
                <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-white/10 opacity-80">
                  {formData.rollNumber} • {formData.fullName}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Violation Counter Badge */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono border ${
                    violationCount >= 2
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      : violationCount === 1
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    Violations: {violationCount} / {activeExam.maxViolations || 3}
                  </span>
                </div>

                {/* Live Countdown Timer */}
                <div
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-mono font-bold border ${
                    timeLeftSeconds < 180
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeLeftSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Question Progress Navigation Bar */}
            <div
              className={`rounded-xl p-3 border flex items-center justify-between overflow-x-auto gap-2 ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold opacity-70">Questions:</span>
                <div className="flex items-center gap-1.5">
                  {shuffledQuestions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isCurrent = idx === currentQuestionIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                          isCurrent
                            ? 'ring-2 ring-indigo-400 bg-indigo-600 text-white'
                            : isAnswered
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isDark
                            ? 'bg-white/5 text-white/50 hover:bg-white/10'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-xs opacity-70 font-mono">
                {Object.keys(selectedAnswers).length} of {shuffledQuestions.length} Answered
              </div>
            </div>

            {/* Main Question Card (ONE BY ONE DISPLAY) */}
            {(() => {
              const q = shuffledQuestions[currentQuestionIndex];
              return (
                <div
                  className={`rounded-3xl p-6 sm:p-9 backdrop-blur-2xl border shadow-xl flex flex-col justify-between min-h-[420px] ${
                    isDark ? 'bg-[rgba(17,16,25,0.85)] border-white/10' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div>
                    {/* Question Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        Question {currentQuestionIndex + 1} of {shuffledQuestions.length}
                      </span>
                      {q.topic && (
                        <span className="text-xs font-mono opacity-60">
                          Domain: {q.topic}
                        </span>
                      )}
                    </div>

                    {/* Question Text */}
                    <h3 className="text-base sm:text-lg font-semibold leading-relaxed mb-4">
                      {q.text}
                    </h3>

                    {/* Code Snippet if applicable */}
                    {q.codeSnippet && (
                      <div className="mb-5 rounded-xl bg-black/70 border border-white/10 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
                        {q.codeSnippet}
                      </div>
                    )}

                    {/* 4 MCQ Options */}
                    <div className="space-y-3 mt-4">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = tempSelection === optIdx;
                        const optionLetters = ['A', 'B', 'C', 'D'];
                        return (
                          <button
                            key={optIdx}
                            onClick={() => setTempSelection(optIdx)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500'
                                : isDark
                                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/90'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-indigo-500 text-white'
                                  : isDark
                                  ? 'bg-white/10 text-white/70'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {optionLetters[optIdx]}
                            </span>
                            <span className="text-sm font-medium">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Question Bottom Action Bar: Save and Next */}
                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0))}
                      disabled={currentQuestionIndex === 0}
                      className="px-4 py-2.5 rounded-xl border border-white/15 text-xs sm:text-sm font-medium flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-3">
                      {/* Save & Next Button: Enabled once option is marked */}
                      <button
                        onClick={handleSaveAndNext}
                        disabled={tempSelection === null}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                          tempSelection !== null
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:opacity-95 cursor-pointer'
                            : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>Save & Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Final Submit Exam Button */}
                      <button
                        onClick={() => {
                          if (tempSelection !== null) {
                            const currentQ = shuffledQuestions[currentQuestionIndex];
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [currentQ.id]: tempSelection,
                            }));
                          }
                          setShowFinishConfirmModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                        title="Submit exam responses"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Finish Exam</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* VIEW 5: EXAM FINISHED / RESULTS SUMMARY */}
        {examState === 'completed' && finalSubmission && (
          <div className="w-full max-w-xl mx-auto">
            <div
              className={`rounded-3xl p-6 sm:p-9 backdrop-blur-2xl border shadow-2xl text-center ${
                isDark ? 'bg-[rgba(17,16,25,0.85)] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-5 border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-1">
                Assessment Successfully Submitted
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Your examination responses and proctoring telemetry have been securely registered with faculty records.
              </p>

              {/* Score & Summary Card */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs uppercase font-semibold opacity-60 mb-1">Final Score</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                    {finalSubmission.score} / {finalSubmission.totalQuestions}
                  </div>
                  <div className="text-xs font-mono text-emerald-400/80 mt-1">
                    {finalSubmission.percentage.toFixed(1)}% Accuracy
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs uppercase font-semibold opacity-60 mb-1">Proctoring Telemetry</div>
                  <div
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      finalSubmission.violationsCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {finalSubmission.violationsCount} Flag{finalSubmission.violationsCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs font-mono opacity-70 mt-1 uppercase">
                    {finalSubmission.status.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Candidate Info Receipt */}
              <div
                className={`text-left rounded-2xl p-4 mb-6 border text-xs sm:text-sm space-y-2 ${
                  isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="opacity-60">Candidate:</span>
                  <span className="font-semibold">{finalSubmission.student.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Roll Number:</span>
                  <span className="font-mono font-bold text-indigo-400">{finalSubmission.student.rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Branch & Section:</span>
                  <span>
                    {finalSubmission.student.branch} • {finalSubmission.student.section} ({finalSubmission.student.year})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Submission Timestamp:</span>
                  <span className="font-mono">{new Date(finalSubmission.submittedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setExamState('registration');
                  setFormData({
                    fullName: '',
                    email: '',
                    rollNumber: '',
                    branch: 'Computer Science & Engineering',
                    section: 'Section A',
                    year: '3rd Year',
                  });
                }}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-semibold transition-all"
              >
                Return to Exam Portal
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Violation Alert Modal (Urgent Pop-up if user switches tabs or exits fullscreen) */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="max-w-md w-full rounded-3xl bg-rose-950/90 border border-rose-500/50 p-6 text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-500/40">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-rose-400 mb-2">Proctoring Violation Flagged!</h3>
            <p className="text-sm text-slate-200 mb-6">{violationModalMessage}</p>
            <button
              onClick={() => {
                setShowViolationModal(false);
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              I Understand — Resume Assessment Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Examination Finish Confirmation Modal */}
      {showFinishConfirmModal && activeExam && (() => {
        const currentAnswered = Object.keys(selectedAnswers).length + (tempSelection !== null && selectedAnswers[shuffledQuestions[currentQuestionIndex]?.id] === undefined ? 1 : 0);
        const unanswered = Math.max(0, shuffledQuestions.length - currentAnswered);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
            <div
              className={`max-w-md w-full rounded-3xl p-6 sm:p-7 border shadow-2xl ${
                isDark ? 'bg-[#0f1123] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-1.5">Finish & Submit Examination?</h3>
              <p className="text-xs opacity-75 mb-4 leading-relaxed">
                Are you sure you want to conclude the test now? Your score, response matrix, and proctoring telemetry will be finalized and sent to faculty.
              </p>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs mb-5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Answered Questions:</span>
                  <span className="font-bold text-emerald-400">{currentAnswered} of {shuffledQuestions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Unanswered Questions:</span>
                  <span className={`font-bold ${unanswered > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {unanswered}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Recorded Warnings:</span>
                  <span className="font-bold text-indigo-400">{violationCount} / {activeExam.maxViolations || 3}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinishConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Return to Exam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishConfirmModal(false);
                    handleFinalSubmit('submitted');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
