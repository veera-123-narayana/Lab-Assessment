import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Award,
  BookOpen,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { StudentSubmission, Question } from '../types';

interface ResultCelebrationProps {
  submission: StudentSubmission;
  questions: Question[];
  onReturnToPortal: () => void;
}

export function getPerformanceLevel(percentage: number) {
  if (percentage >= 90) {
    return {
      title: 'EXCEPTIONAL PERFORMANCE',
      message: 'Outstanding work. You demonstrated excellent command of the assessment.',
      celebration: 'high' as const,
      color: 'text-cyan-300',
      badgeBg: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300',
      ringColor: '#5BE7FF',
    };
  }
  if (percentage >= 80) {
    return {
      title: 'EXCELLENT PERFORMANCE',
      message: 'Excellent result. Your understanding is strong and consistent.',
      celebration: 'high' as const,
      color: 'text-blue-300',
      badgeBg: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
      ringColor: '#38A8FF',
    };
  }
  if (percentage >= 70) {
    return {
      title: 'CONGRATULATIONS!',
      message: 'Great job! You successfully demonstrated strong understanding of the assessment.',
      celebration: 'medium' as const,
      color: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
      ringColor: '#10B981',
    };
  }
  if (percentage >= 60) {
    return {
      title: 'GOOD PROGRESS',
      message: 'Good work. You have a solid foundation. A little more practice can take you further.',
      celebration: 'low' as const,
      color: 'text-indigo-300',
      badgeBg: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300',
      ringColor: '#6366F1',
    };
  }
  if (percentage >= 50) {
    return {
      title: 'KEEP BUILDING',
      message: 'You have a foundation to build on. Review the key concepts and keep practicing.',
      celebration: 'low' as const,
      color: 'text-amber-300',
      badgeBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
      ringColor: '#F59E0B',
    };
  }
  if (percentage >= 35) {
    return {
      title: 'MORE PRACTICE, MORE PROGRESS',
      message: 'Your attempt is complete. Review the topics and strengthen the areas where you lost marks.',
      celebration: 'none' as const,
      color: 'text-blue-200',
      badgeBg: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
      ringColor: '#3B82F6',
    };
  }
  return {
    title: 'KEEP LEARNING',
    message: 'Every attempt is part of the learning process. Review the assessment topics and continue practicing.',
    celebration: 'none' as const,
    color: 'text-slate-300',
    badgeBg: 'bg-slate-500/20 border-slate-400/30 text-slate-300',
    ringColor: '#64748B',
  };
}

export const ResultCelebration: React.FC<ResultCelebrationProps> = ({
  submission,
  questions,
  onReturnToPortal,
}) => {
  const [phase, setPhase] = useState<'calculating' | 'revealed'>('calculating');
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  const percentage = Math.round(submission.percentage || 0);
  const score = submission.score;
  const totalQuestions = submission.totalQuestions || questions.length || 1;
  const perf = getPerformanceLevel(percentage);

  // Calculate detailed topic accuracies
  const topicStats: Record<string, { total: number; correct: number }> = {};
  questions.forEach((q) => {
    const topicName = q.subtopic || q.topic || 'Core Module';
    if (!topicStats[topicName]) {
      topicStats[topicName] = { total: 0, correct: 0 };
    }
    topicStats[topicName].total += 1;
    if (submission.answers[q.id] === q.correctAnswer) {
      topicStats[topicName].correct += 1;
    }
  });

  const topicList = Object.entries(topicStats).map(([topic, stat]) => ({
    topic,
    accuracy: Math.round((stat.correct / Math.max(1, stat.total)) * 100),
    correct: stat.correct,
    total: stat.total,
  }));

  const answeredCount = Object.keys(submission.answers || {}).length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const incorrectCount = Math.max(0, answeredCount - score);

  useEffect(() => {
    // 1. Initial calculating pause
    const calcTimer = setTimeout(() => {
      setPhase('revealed');
    }, 1100);

    return () => clearTimeout(calcTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'revealed') return;

    // 2. Animate count-up for percentage and score
    const duration = 1400;
    const startTime = Date.now();

    const countTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayPercentage(Math.round(eased * percentage));
      setDisplayScore(Math.round(eased * score));

      if (progress >= 1) {
        clearInterval(countTimer);
      }
    }, 30);

    return () => clearInterval(countTimer);
  }, [phase, percentage, score]);

  // SVG Circular Ring attributes
  const ringRadius = 82;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - (circumference * displayPercentage) / 100;

  if (phase === 'calculating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02040A] text-white p-6 relative">
        <div className="absolute w-96 h-96 rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
        <div className="text-center space-y-4 relative z-10">
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-dashed border-cyan-400 animate-spin flex items-center justify-center p-2">
            <div className="w-full h-full rounded-full bg-blue-500/20 backdrop-blur-md animate-pulse" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            Assessment Submitted
          </p>
          <h2 className="text-2xl font-bold font-display tracking-wide">
            Calculating Performance Intelligence...
          </h2>
          <p className="text-xs text-slate-400">
            Evaluating topic mastery, accuracy thresholds, and proctor logs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040A] text-white py-12 px-4 sm:px-6 relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-[160px] pointer-events-none" />

      {/* Floating Sparkle Particles for Celebrations */}
      {perf.celebration !== 'none' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(24)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: '50vw',
                y: '30vh',
                scale: 0,
                opacity: 0,
              }}
              animate={{
                x: `${Math.random() * 100}vw`,
                y: `${Math.random() * 80}vh`,
                scale: [0, Math.random() * 1.5 + 0.5, 0],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 1.5,
              }}
              className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#5BE7FF]"
            />
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        {/* Main Achievement Header Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel-elevated rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border mb-6 text-xs font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-sm">
            <span className={perf.badgeBg}>
              <span className="px-2 py-0.5 rounded-full flex items-center gap-1.5">
                {perf.celebration === 'high' ? (
                  <Trophy className="w-3.5 h-3.5 text-cyan-300" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {perf.title}
              </span>
            </span>
          </div>

          {/* Holographic Circular Score Ring */}
          <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              {/* Background Ring Track */}
              <circle
                cx="100"
                cy="100"
                r={ringRadius}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Glowing Progress Ring */}
              <circle
                cx="100"
                cy="100"
                r={ringRadius}
                stroke={perf.ringColor}
                strokeWidth="12"
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.1s ease',
                  filter: `drop-shadow(0 0 10px ${perf.ringColor})`,
                }}
              />
            </svg>

            {/* Inner Percentage Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white">
                {displayPercentage}%
              </span>
              <span className="text-xs font-mono text-cyan-300 font-semibold mt-1">
                {displayScore} / {totalQuestions} MARKS
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">
            Assessment Complete
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            {perf.message}
          </p>

          <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span>CANDIDATE: <strong className="text-white">{submission.student?.fullName || 'Student'}</strong></span>
            <span>•</span>
            <span>ROLL: <strong className="text-cyan-400">{submission.student?.rollNumber}</strong></span>
            <span>•</span>
            <span>EXAM: <strong className="text-white">{submission.examCode}</strong></span>
          </div>
        </motion.div>

        {/* Question & Performance Metrics Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3.5"
        >
          <div className="glass-panel rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">
              Correct Answers
            </span>
            <span className="text-2xl font-bold font-display text-emerald-400 block">
              {score}
            </span>
            <span className="text-[10px] text-emerald-500 font-medium">Earned Full Credit</span>
          </div>

          <div className="glass-panel rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">
              Incorrect
            </span>
            <span className="text-2xl font-bold font-display text-rose-400 block">
              {incorrectCount}
            </span>
            <span className="text-[10px] text-rose-500 font-medium">Review Concepts</span>
          </div>

          <div className="glass-panel rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">
              Unanswered
            </span>
            <span className="text-2xl font-bold font-display text-amber-400 block">
              {unansweredCount}
            </span>
            <span className="text-[10px] text-amber-500 font-medium">Timed Out / Skipped</span>
          </div>

          <div className="glass-panel rounded-2xl p-4 text-center">
            <span className="text-[10px] font-mono text-slate-400 block mb-1 uppercase tracking-wider">
              Proctor Events
            </span>
            <span className="text-2xl font-bold font-display text-cyan-400 block">
              {submission.violationsCount || 0}
            </span>
            <span className="text-[10px] text-cyan-500 font-medium">
              {(submission.violationsCount || 0) === 0 ? 'Flawless Integrity' : 'Logged & Audited'}
            </span>
          </div>
        </motion.div>

        {/* Topic-Wise Intelligence Breakdown */}
        {topicList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-panel rounded-3xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase font-display">
                  Topic Mastery Intelligence
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {topicList.length} Syllabus Modules Evaluated
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {topicList.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-200 truncate max-w-[70%]">
                      {item.topic}
                    </span>
                    <span className="font-mono font-bold text-cyan-300">
                      {item.accuracy}% ({item.correct}/{item.total})
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.accuracy}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + idx * 0.1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        item.accuracy >= 75
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(91,231,255,0.6)]'
                          : item.accuracy >= 50
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-rose-500 to-orange-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={onReturnToPortal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 text-white font-bold text-sm font-display tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <span>Return to Assessment Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};
export default ResultCelebration;
