import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Cpu, Sparkles } from 'lucide-react';

interface ExamInitializationProps {
  examTitle: string;
  examCode: string;
  totalQuestions: number;
  durationMinutes: number;
  onComplete: () => void;
}

export const ExamInitialization: React.FC<ExamInitializationProps> = ({
  examTitle,
  examCode,
  totalQuestions,
  durationMinutes,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Initializing encrypted exam container...',
    'Establishing proctoring integrity perimeter...',
    'Generating randomized assessment sequence...',
    'Calibrating question state machine...',
    'Ready. Launching Question 1...',
  ];

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1600; // 1.6 seconds

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      const stepIndex = Math.min(steps.length - 1, Math.floor((elapsed / duration) * steps.length));
      setCurrentStep(stepIndex);

      if (elapsed >= duration) {
        clearInterval(timer);
        setTimeout(onComplete, 200);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040A] text-white p-6"
    >
      {/* Background glow circle */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Holographic Circular Scanner */}
        <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          {/* Outer rotating dashed ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40"
          />
          {/* Inner counter-rotating ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-blue-500/60 border-t-transparent"
          />
          {/* Pulsing center icon */}
          <motion.div
            animate={{ scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600/40 to-cyan-500/40 backdrop-blur-md flex items-center justify-center border border-cyan-400/60 shadow-lg shadow-cyan-500/25"
          >
            <Cpu className="w-7 h-7 text-cyan-300" />
          </motion.div>
        </div>

        {/* LABORA AI Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5 mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-mono tracking-widest text-cyan-300 uppercase mb-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>LABORA AI ASSESSMENT HUD</span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-wide text-white">
            {examTitle}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            CODE: <span className="text-cyan-400">{examCode}</span> • {totalQuestions} QUESTIONS • {durationMinutes} MINS
          </p>
        </motion.div>

        {/* Step indicator */}
        <div className="h-6 mb-4 flex items-center justify-center">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-xs font-mono text-cyan-300 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            {steps[currentStep]}
          </motion.p>
        </div>

        {/* Cyber Progress Line */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden p-0.5 border border-white/10 mb-2">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-white rounded-full shadow-[0_0_12px_rgba(91,231,255,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            SECURE EXAM RUNTIME
          </span>
          <span className="text-cyan-400 font-bold">{progress}%</span>
        </div>
      </div>
    </motion.div>
  );
};
export default ExamInitialization;
