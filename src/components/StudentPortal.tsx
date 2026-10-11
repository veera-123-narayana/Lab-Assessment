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
  BookOpen,
  ArrowRight,
  Cpu,
  FileText,
  Edit3,
  HelpCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Exam, Question, StudentRegistration, StudentSubmission, ViolationEvent } from '../types';
import { checkPreviousSubmission, getStoredExams, recordSubmission } from '../lib/storage';
import ParticleField, { triggerParticleWarp } from './ParticleField';
import ExamInitialization from './ExamInitialization';
import ResultCelebration from './ResultCelebration';

interface StudentPortalProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenAdminSecret: () => void;
}

type ExamState = 'registration' | 'rules' | 'initializing' | 'active' | 'already_taken' | 'completed';

export const StudentPortal: React.FC<StudentPortalProps> = ({
  theme,
  onToggleTheme,
  onOpenAdminSecret,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examState, setExamState] = useState<ExamState>('registration');
  
  // Registration Form State
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

  // Mouse Parallax for Entry Portal (Desktop only)
  const [mouseTilt, setMouseTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Active Exam Runtime State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [tempSelection, setTempSelection] = useState<number | null>(null);
  
  // 3D Question Navigation Transition Direction: 1 = Forward (Save & Next), -1 = Backward (Previous)
  const [navDirection, setNavDirection] = useState<number>(1);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [showCyanPulse, setShowCyanPulse] = useState<boolean>(false);
  
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

  // Desktop Mouse Parallax Handler for Entry Portal
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return; // Disable on mobile
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Rotate max ±2deg on X and ±3deg on Y
    setMouseTilt({
      x: -y * 4,
      y: x * 6,
    });
  };

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  // Check duplicate submission on rollNumber / exam change
  const handleCheckAttempt = (roll: string, examId: string) => {
    if (!roll.trim() || !examId) return;
    const existing = checkPreviousSubmission(roll, examId);
    if (existing) {
      setPreviousSubmissionData(existing);
      setExamState('already_taken');
    }
  };

  // Submit registration form with 3D transition
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

    // Single attempt rule check
    const existing = checkPreviousSubmission(formData.rollNumber, exam.id);
    if (existing) {
      setPreviousSubmissionData(existing);
      setExamState('already_taken');
      return;
    }

    setActiveExam(exam);
    // Trigger 3D warp transition effect
    triggerParticleWarp(300);
    setExamState('rules');
  };

  // Launch exam with fullscreen and randomized questions
  const handleStartExam = async () => {
    if (!activeExam) return;

    // Trigger energy tunnel acceleration
    triggerParticleWarp(400);

    // Randomize questions & option order for this candidate
    const shuffled = [...activeExam.questions]
      .sort(() => Math.random() - 0.5)
      .map((q) => {
        const indexedOptions = q.options.map((opt, i) => ({
          text: opt,
          isCorrect: i === q.correctAnswer,
        })).sort(() => Math.random() - 0.5);

        const newOptions = indexedOptions.map((o) => o.text) as [string, string, string, string];
        const newCorrectAnswer = indexedOptions.findIndex((o) => o.isCorrect);

        return {
          ...q,
          options: newOptions,
          correctAnswer: newCorrectAnswer >= 0 ? newCorrectAnswer : 0,
        };
      });

    setShuffledQuestions(shuffled);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTempSelection(null);
    setViolations([]);
    setViolationCount(0);
    setTimeLeftSeconds(activeExam.durationMinutes * 60);

    // Request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed in iframe environment:', err);
    }

    setExamState('initializing');
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
          // Auto submit immediately on maximum infractions reached
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

  // Save answer and move to next question with exact 3D spatial transition
  const handleSaveAndNext = () => {
    if (tempSelection === null || isNavigating) return;
    const currentQ = shuffledQuestions[currentQuestionIndex];
    const updated = {
      ...selectedAnswers,
      [currentQ.id]: tempSelection,
    };
    setSelectedAnswers(updated);

    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setIsNavigating(true);
      setNavDirection(1); // Moving forward into depth
      setShowCyanPulse(true);
      triggerParticleWarp(280);

      setTimeout(() => {
        setShowCyanPulse(false);
      }, 160);

      // Advance index
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeout(() => {
        setIsNavigating(false);
      }, 450);
    }
  };

  // Navigate to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex === 0 || isNavigating) return;

    // Preserve current selection if made
    if (tempSelection !== null && shuffledQuestions[currentQuestionIndex]) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [shuffledQuestions[currentQuestionIndex].id]: tempSelection,
      }));
    }

    setIsNavigating(true);
    setNavDirection(-1); // Moving backward in Z/X space
    setShowCyanPulse(true);
    triggerParticleWarp(220);

    setTimeout(() => {
      setShowCyanPulse(false);
    }, 160);

    setCurrentQuestionIndex((prev) => prev - 1);
    setTimeout(() => {
      setIsNavigating(false);
    }, 450);
  };

  // Jump to specific question node in navigator
  const handleJumpToQuestion = (targetIndex: number) => {
    if (targetIndex === currentQuestionIndex || isNavigating) return;

    if (tempSelection !== null && shuffledQuestions[currentQuestionIndex]) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [shuffledQuestions[currentQuestionIndex].id]: tempSelection,
      }));
    }

    setIsNavigating(true);
    setNavDirection(targetIndex > currentQuestionIndex ? 1 : -1);
    setShowCyanPulse(true);
    triggerParticleWarp(240);

    setTimeout(() => {
      setShowCyanPulse(false);
    }, 150);

    setCurrentQuestionIndex(targetIndex);
    setTimeout(() => {
      setIsNavigating(false);
    }, 450);
  };

  // Submit assessment with final calculation
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
    triggerParticleWarp(400);
    setExamState('completed');
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const isDark = theme === 'dark';

  return (
    <div
      ref={examContainerRef}
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-300 perspective-1400 ${
        isDark ? 'bg-[#02050B] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 3D PARTICLE ENVIRONMENT & FLOOR RIPPLE RINGS (Master Prompt Visual Reference) */}
      <ParticleField density="medium" color="mixed" showFloorRipples={true} />
      
      {/* Layer 2: Blurred Cyan / Blue Ambient Light Sphere */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[550px] rounded-full bg-blue-600/15 blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[850px] h-[350px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none z-0" />

      {/* Layer 4: Subtle Cyber Grid */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed inset-0 bg-focal-glow pointer-events-none z-0" />

      {/* Soft Cyan Energy Flash for Navigation Bridge */}
      <AnimatePresence>
        {showCyanPulse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 pointer-events-none z-40 bg-radial from-cyan-400/20 via-blue-500/10 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Header bar (Candidate Assessment HUD) */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#087EFF] via-[#21A7FF] to-[#5DE8FF] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-[#21A7FF] bg-clip-text text-transparent font-display">
              Apogee Assessment
            </span>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="hidden sm:inline-block ml-2.5 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-[#5DE8FF] border border-cyan-400/30 font-mono tracking-wider"
            >
              PROCTOR GUARD v3.4
            </motion.span>
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

          {/* Discreet Faculty Access Trigger */}
          <button
            onClick={onOpenAdminSecret}
            className="opacity-30 hover:opacity-100 transition-opacity p-2 text-xs flex items-center gap-1 rounded-lg border border-transparent hover:border-white/10"
            title="Faculty Access (Restricted)"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.header>

      {/* Main Content Area in 3D Perspective */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 preserve-3d">
        {/* VIEW 1: CANDIDATE REGISTRATION — 3D FLOATING PORTAL */}
        {examState === 'registration' && (
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full max-w-xl mx-auto perspective-1400"
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 60,
                z: -150,
                rotateX: 8,
                scale: 0.92,
              }}
              animate={{
                opacity: 1,
                y: 0,
                z: 0,
                rotateX: mouseTilt.x,
                rotateY: mouseTilt.y,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                z: -250,
                scale: 0.85,
                transition: { duration: 0.35, ease: 'easeInOut' },
              }}
              transition={{
                duration: 0.9,
                delay: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className={`rounded-3xl p-6 sm:p-9 glass-panel-elevated shadow-2xl transition-all relative overflow-hidden ${
                isDark
                  ? 'border-[rgba(80,180,255,0.22)] shadow-[0_30px_100px_rgba(0,40,120,0.35)]'
                  : 'bg-white/95 border-slate-200 shadow-slate-200/80 text-slate-800'
              }`}
            >
              {/* Subtle top edge glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5DE8FF] to-transparent opacity-60" />

              <div className="text-center mb-6">
                {/* 1.10s Stagger: Candidate Identification Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 bg-blue-500/15 text-[#5DE8FF] border border-cyan-400/30"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Candidate Identification</span>
                </motion.div>

                {/* 1.25s Stagger: Lab & Examination Entry */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.25 }}
                  className="text-2xl font-bold font-display tracking-tight text-white mb-2"
                >
                  Lab & Examination Entry
                </motion.h2>
                <p className="text-xs text-slate-400">
                  Authenticate your student profile and enter the secure assessment runtime.
                </p>
              </div>

              {formError && (
                <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStartRegistration} className="space-y-4">
                {/* 1.40s Stagger: Exam Selector */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 }}
                >
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Select Scheduled Assessment
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      handleCheckAttempt(formData.rollNumber, e.target.value);
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none input-3d-field ${
                      isDark
                        ? 'bg-white/5 border-white/15 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {exams.length === 0 && (
                      <option value="">No Active Exams Available</option>
                    )}
                    {exams.map((exam) => (
                      <option
                        key={exam.id}
                        value={exam.id}
                        className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}
                      >
                        {exam.code}: {exam.title} ({exam.durationMinutes} mins)
                      </option>
                    ))}
                  </select>

                  {/* Selected Exam Information Badge */}
                  {(() => {
                    const currentEx = exams.find((e) => e.id === selectedExamId);
                    if (!currentEx) return null;
                    return (
                      <div
                        className={`mt-2.5 p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isDark ? 'bg-white/5 border-cyan-400/20' : 'bg-slate-100/80 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">{currentEx.subject}</span>
                          <span className="opacity-40">•</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[#5DE8FF] font-bold text-[10px]">
                            {currentEx.difficulty}
                          </span>
                          {currentEx.creationMethod === 'pdf_upload' || currentEx.pdfFilename ? (
                            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-[10px] flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>PDF Document Test</span>
                            </span>
                          ) : currentEx.creationMethod === 'custom_admin' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              <span>Faculty Custom Test</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#5DE8FF] font-bold text-[10px] flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>AI Topic Test</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] opacity-75 font-mono text-cyan-300">
                          {currentEx.questions.length} Questions • {currentEx.durationMinutes} Mins • Max Marks: {currentEx.totalMarks || currentEx.questions.length}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>

                {/* 1.55s Stagger: Candidate Fields */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.55 }}
                  className="space-y-3.5"
                >
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none input-3d-field ${
                        isDark
                          ? 'bg-white/5 border-white/15 text-white placeholder-white/30'
                          : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Roll Number & Institutional Email in 2 cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Roll Number
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
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none font-mono uppercase input-3d-field ${
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
                        placeholder="e.g. 23kb1a3334@nbkrist.org"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none input-3d-field ${
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
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none input-3d-field ${
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
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none input-3d-field ${
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
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none input-3d-field ${
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
                </motion.div>

                {/* 1.75s Stagger: Proceed Button with 3D Depth Interaction */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.75 }}
                >
                  <motion.button
                    type="submit"
                    whileHover={{ translateY: -2, z: 8, boxShadow: '0 12px 30px rgba(8,126,255,0.4)' }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full mt-4 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#087EFF] via-[#21A7FF] to-[#5DE8FF] text-black font-extrabold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all tracking-wide"
                  >
                    <span>Proceed to Proctoring Instructions</span>
                    <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          </div>
        )}

        {/* VIEW 2: ALREADY TAKEN EXAM NOTICE (Single Attempt Rule Enforcement) */}
        {examState === 'already_taken' && previousSubmissionData && (
          <div className="w-full max-w-lg mx-auto perspective-1400">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, z: -100 }}
              animate={{ opacity: 1, scale: 1, z: 0 }}
              className={`rounded-3xl p-6 sm:p-9 glass-panel-elevated text-center ${
                isDark
                  ? 'border-rose-500/30 text-white'
                  : 'bg-white border-rose-200 text-slate-800'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-5 border border-rose-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold font-display tracking-tight text-rose-400 mb-2">
                Assessment Already Completed
              </h2>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Candidate with Roll Number{' '}
                <strong className="font-mono text-[#5DE8FF]">
                  {previousSubmissionData.student.rollNumber}
                </strong>{' '}
                has already submitted this examination. Each student is strictly permitted to attempt the test once.
              </p>

              <div
                className={`text-left rounded-2xl p-4 mb-6 border text-xs sm:text-sm space-y-2 ${
                  isDark ? 'bg-black/50 border-white/10' : 'bg-slate-50 border-slate-200'
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
            </motion.div>
          </div>
        )}

        {/* VIEW 3: PROCTORING & EXAM RULES (Emerging from Depth) */}
        {examState === 'rules' && activeExam && (
          <div className="w-full max-w-2xl mx-auto perspective-1400">
            <motion.div
              initial={{
                opacity: 0,
                z: 250,
                scale: 0.85,
              }}
              animate={{
                opacity: 1,
                z: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                z: -300,
                scale: 0.8,
                transition: { duration: 0.35 },
              }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformStyle: 'preserve-3d' }}
              className={`rounded-3xl p-6 sm:p-9 glass-panel-3d ${
                isDark ? 'border-[rgba(80,180,255,0.22)]' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-5 border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-display tracking-wide text-white">
                    {activeExam.title}
                  </h2>
                  <p className="text-xs font-mono opacity-70 mt-1 text-[#5DE8FF]">
                    Code: {activeExam.code} • Duration: {activeExam.durationMinutes} Minutes • Questions: {activeExam.questions.length} MCQs
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready to Launch
                </span>
              </div>

              <div className="space-y-4 mb-7 text-xs sm:text-sm">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-cyan-400/20 text-cyan-300">
                  <Maximize2 className="w-5 h-5 shrink-0 mt-0.5 text-[#5DE8FF]" />
                  <div>
                    <h4 className="font-bold text-white">Mandatory Fullscreen Mode</h4>
                    <p className="opacity-80 mt-0.5 text-slate-300">
                      Starting this test locks your browser in Fullscreen mode. Exiting fullscreen or pressing Esc is tracked as an infraction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">AI Tools & Tab Switching Detection</h4>
                    <p className="opacity-80 mt-0.5 text-slate-300">
                      Switching browser tabs, opening external AI tools, copy-pasting, right-clicking, or accessing secondary windows will immediately flag an infraction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-300">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5 text-[#5DE8FF]" />
                  <div>
                    <h4 className="font-bold text-white">Single Attempt & Automatic Submission</h4>
                    <p className="opacity-80 mt-0.5 text-slate-300">
                      Reaching <strong>{activeExam.maxViolations || 3} infractions</strong> or letting the countdown reach 00:00 will terminate and submit your assessment automatically.
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
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(33,167,255,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStartExam}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#087EFF] via-[#21A7FF] to-[#5DE8FF] text-black font-extrabold text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all tracking-wide"
                >
                  <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Enter Fullscreen & Begin Assessment</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}

        {/* VIEW: INITIALIZING CINEMATIC HUD SEQUENCE */}
        {examState === 'initializing' && activeExam && (
          <ExamInitialization
            examTitle={activeExam.title}
            examCode={activeExam.code}
            totalQuestions={shuffledQuestions.length || activeExam.questions.length}
            durationMinutes={activeExam.durationMinutes}
            onComplete={() => setExamState('active')}
          />
        )}

        {/* VIEW 4: ACTIVE EXAM IN PROGRESS — 3D FLOATING MCQ EXAMINATION EXPERIENCE */}
        {examState === 'active' && activeExam && shuffledQuestions.length > 0 && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 perspective-1400">
            {/* Top Exam HUD: Timer, Progress Bar, Violations */}
            <motion.div
              initial={{ opacity: 0, y: -20, z: -50 }}
              animate={{ opacity: 1, y: 0, z: 0 }}
              className="glass-panel-3d p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-[#5DE8FF] border border-cyan-400/30 flex items-center justify-center font-display font-bold text-sm shrink-0">
                  <Cpu className="w-5 h-5 text-[#5DE8FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm tracking-wide text-white">
                      APOGEE HUD
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-[#5DE8FF] border border-cyan-400/30">
                      {activeExam.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[280px] sm:max-w-md">
                    {activeExam.title} • <span className="font-mono text-[#5DE8FF]">{formData.rollNumber}</span>
                  </div>
                </div>
              </div>

              {/* Progress & Live Countdown Timer */}
              <div className="flex items-center gap-3.5">
                {/* Security Violations Tracker */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono border transition-colors ${
                    violationCount >= 2
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                      : violationCount === 1
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                  title="Proctoring violation monitor"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    INFRACTIONS: {violationCount} / {activeExam.maxViolations || 3}
                  </span>
                </div>

                {/* Glowing HUD Countdown Timer */}
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold border transition-all ${
                    timeLeftSeconds < activeExam.durationMinutes * 60 * 0.1
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.35)] animate-pulse'
                      : timeLeftSeconds < activeExam.durationMinutes * 60 * 0.2
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-blue-600/20 text-[#5DE8FF] border-cyan-400/40 shadow-[0_0_18px_rgba(93,232,255,0.2)]'
                  }`}
                >
                  <Clock className="w-4 h-4 text-[#5DE8FF]" />
                  <span className="tracking-wider">{formatTime(timeLeftSeconds)}</span>
                </div>
              </div>
            </motion.div>

            {/* Continuous Smooth Progress Bar Line */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-[#087EFF] via-[#21A7FF] to-[#5DE8FF] rounded-full shadow-[0_0_10px_rgba(93,232,255,0.7)]"
                style={{
                  width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%`,
                  transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>

            {/* Spatial Question Navigator */}
            <div className="glass-panel-3d rounded-2xl p-3 border border-white/10 flex items-center justify-between overflow-x-auto gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="uppercase font-mono text-[11px] opacity-60 tracking-wider">NAVIGATOR:</span>
                <div className="flex items-center gap-1.5">
                  {shuffledQuestions.map((q, idx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isCurrent = idx === currentQuestionIndex;
                    return (
                      <motion.button
                        key={q.id}
                        whileHover={{ scale: 1.1, translateY: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleJumpToQuestion(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${
                          isCurrent
                            ? 'ring-2 ring-[#5DE8FF] bg-gradient-to-r from-[#087EFF] to-[#21A7FF] text-white shadow-lg shadow-cyan-500/40'
                            : isAnswered
                            ? 'bg-blue-500/20 text-[#5DE8FF] border border-cyan-400/40 shadow-[0_0_8px_rgba(93,232,255,0.2)]'
                            : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {idx + 1}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="font-mono text-[11px] text-[#5DE8FF] shrink-0">
                {Object.keys(selectedAnswers).length} / {shuffledQuestions.length} ANSWERED
              </div>
            </div>

            {/* 3D FLOATING QUESTION PANEL (Master Prompt Specifications: Exit Phase -> Digital Space -> Enter Phase) */}
            {(() => {
              const q = shuffledQuestions[currentQuestionIndex];
              return (
                <div className="relative w-full min-h-[460px] preserve-3d">
                  <AnimatePresence mode="wait" custom={navDirection}>
                    <motion.div
                      key={q.id}
                      custom={navDirection}
                      variants={{
                        // Phase 3: New Question Enters from Depth
                        initial: (direction: number) => ({
                          opacity: 0,
                          z: 160,
                          x: direction * 40,
                          scale: 0.88,
                          rotateY: direction * -4,
                          filter: 'blur(4px)',
                        }),
                        animate: {
                          opacity: 1,
                          z: 0,
                          x: 0,
                          scale: 1,
                          rotateY: 0,
                          filter: 'blur(0px)',
                          transition: {
                            duration: 0.46,
                            ease: [0.16, 1, 0.3, 1],
                          },
                        },
                        // Phase 1: Exit into Depth
                        exit: (direction: number) => ({
                          opacity: 0.5,
                          z: -120,
                          x: direction * -30,
                          scale: 0.94,
                          filter: 'blur(3px)',
                          transition: {
                            duration: 0.18,
                            ease: 'easeIn',
                          },
                        }),
                      }}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      style={{ transformStyle: 'preserve-3d' }}
                      className="glass-panel-3d rounded-3xl p-6 sm:p-9 flex flex-col justify-between min-h-[460px] relative overflow-hidden"
                    >
                      {/* Back Layer Blue Ambient Glow */}
                      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-600/20 blur-[90px] pointer-events-none" />
                      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />

                      <div className="relative z-10">
                        {/* Question Classification Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            {/* Question Number 3D Transition */}
                            <motion.span
                              key={`num_${currentQuestionIndex}`}
                              initial={{ opacity: 0, rotateX: 12, z: -20 }}
                              animate={{ opacity: 1, rotateX: 0, z: 0 }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                              className="font-display font-extrabold text-xs sm:text-sm tracking-widest text-cyan-300 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 shadow-[0_0_12px_rgba(93,232,255,0.2)]"
                            >
                              QUESTION {(currentQuestionIndex + 1).toString().padStart(2, '0')}
                            </motion.span>
                            {q.questionType && (
                              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/20 text-cyan-200 border border-blue-400/30 uppercase tracking-wider">
                                {q.questionType.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {q.subtopic && (
                            <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]">
                              {q.subtopic}
                            </span>
                          )}
                        </div>

                        {/* Question Text */}
                        <motion.h3
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08, duration: 0.35 }}
                          className="text-base sm:text-lg font-medium leading-relaxed text-white mb-5 font-tech"
                        >
                          {q.text}
                        </motion.h3>

                        {/* Code Snippet if applicable */}
                        {q.codeSnippet && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                            className="mb-5 rounded-2xl bg-[#01030a] border border-cyan-500/25 p-4 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre shadow-inner"
                          >
                            {q.codeSnippet}
                          </motion.div>
                        )}

                        {/* 4 Interactive MCQ Options with Sequential Stagger */}
                        <div className="space-y-3 mt-4">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = tempSelection === optIdx;
                            const optionLetters = ['A', 'B', 'C', 'D'];
                            return (
                              <motion.button
                                key={optIdx}
                                initial={{ opacity: 0, y: 12, z: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, z: 0, scale: 1 }}
                                transition={{
                                  delay: 0.15 + optIdx * 0.06, // 60ms stagger per option (Master Prompt)
                                  duration: 0.35,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                whileHover={{ x: 4, z: 8 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setTempSelection(optIdx)}
                                className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer option-3d-card ${
                                  isSelected
                                    ? 'bg-blue-600/30 border-[#5DE8FF] text-white shadow-[0_0_25px_rgba(8,126,255,0.35)] ring-1 ring-[#5DE8FF]'
                                    : 'bg-white/5 border-white/10 hover:border-cyan-400/40 text-white/90'
                                }`}
                              >
                                <span
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-tr from-[#5DE8FF] to-[#087EFF] text-black font-extrabold shadow-md shadow-cyan-400/50 scale-105'
                                      : 'bg-white/10 text-white/80 border border-white/10'
                                  }`}
                                >
                                  {optionLetters[optIdx]}
                                </span>
                                <span className="text-sm font-tech leading-snug flex-1">{opt}</span>

                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.3, 1] }}
                                    transition={{ duration: 0.3 }}
                                    className="w-3 h-3 rounded-full bg-[#5DE8FF] shadow-[0_0_12px_#5DE8FF] shrink-0"
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Question Bottom Action Bar: Previous, Save & Next, Finish */}
                      <div className="relative z-10 flex items-center justify-between pt-6 mt-6 border-t border-white/10">
                        <button
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestionIndex === 0 || isNavigating}
                          className="px-4 py-2.5 rounded-xl border border-white/15 text-xs sm:text-sm font-medium flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all text-slate-300 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {/* Save & Next Button with Connected Energy Pulse */}
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={handleSaveAndNext}
                            disabled={tempSelection === null || isNavigating}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                              tempSelection !== null && !isNavigating
                                ? 'bg-gradient-to-r from-[#087EFF] via-[#21A7FF] to-[#5DE8FF] text-black font-bold shadow-lg shadow-blue-500/35 hover:shadow-cyan-400/50'
                                : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                            }`}
                          >
                            <Save className="w-4 h-4 stroke-[2.5]" />
                            <span>SAVE & NEXT</span>
                            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                          </motion.button>

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
                            title="Finish exam and calculate score"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>FINISH EXAM</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        )}

        {/* VIEW 5: CINEMATIC ACHIEVEMENT & 3D PERFORMANCE INTELLIGENCE REVEAL */}
        {examState === 'completed' && finalSubmission && (
          <ResultCelebration
            submission={finalSubmission}
            questions={activeExam?.questions || []}
            onReturnToPortal={() => {
              setExamState('registration');
              setFormData({
                fullName: '',
                email: '',
                rollNumber: '',
                branch: 'Computer Science & Engineering',
                section: 'Section A',
                year: '3rd Year',
              });
              setFinalSubmission(null);
            }}
          />
        )}
      </main>

      {/* Violation Alert Modal (Infraction Warning Pop-up) */}
      {showViolationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full rounded-3xl bg-rose-950/90 border border-rose-500/50 p-6 text-center text-white shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-500/40">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-rose-400 mb-2">Proctoring Infraction Flagged!</h3>
            <p className="text-sm text-slate-200 mb-6">{violationModalMessage}</p>
            <button
              onClick={() => setShowViolationModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg uppercase tracking-wider"
            >
              Acknowledge & Return to Exam
            </button>
          </motion.div>
        </div>
      )}

      {/* Finish Exam Confirmation Modal */}
      {showFinishConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, z: -100 }}
            animate={{ scale: 1, opacity: 1, z: 0 }}
            className="max-w-md w-full rounded-3xl glass-panel-elevated p-6 text-center text-white shadow-2xl border border-cyan-400/30"
          >
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-[#5DE8FF] mx-auto flex items-center justify-center mb-4 border border-cyan-400/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 font-display">Confirm Assessment Submission</h3>
            <p className="text-sm text-slate-300 mb-5">
              You have answered{' '}
              <strong className="text-[#5DE8FF]">
                {Object.keys(selectedAnswers).length} of {shuffledQuestions.length}
              </strong>{' '}
              questions. Once submitted, your score and proctoring log will be recorded.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold"
              >
                Continue Test
              </button>
              <button
                onClick={() => handleFinalSubmit('submitted')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/30"
              >
                Submit Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default StudentPortal;
