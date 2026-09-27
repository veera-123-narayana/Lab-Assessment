import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileSpreadsheet,
  ExternalLink,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  ShieldAlert,
  BarChart3,
  Filter,
  LogOut,
  Sun,
  Moon,
  Search,
  BookOpen,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Table,
  Eye,
  X,
  Key,
  Cpu,
  Globe,
  Check
} from 'lucide-react';
import { Exam, ExamDifficulty, Question, StudentSubmission } from '../types';
import { generateQuestionsWithAI, verifyAnyApiKey, AIProvider } from '../lib/gemini';
import { 
  buildExcelWorksheets,
  downloadOfflineExcel, 
  exportToGoogleDriveAndSheets, 
  getGoogleAccessToken, 
  getConnectedGoogleEmail, 
  setConnectedGoogleEmail, 
  TARGET_ADMIN_GOOGLE_ACCOUNT 
} from '../lib/googleWorkspace';
import { getStoredExams, getStoredSubmissions, saveStoredExams, updateExamDriveRecord } from '../lib/storage';

interface AdminPortalProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onExitToStudentPortal: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  theme,
  onToggleTheme,
  onExitToStudentPortal,
}) => {
  // Admin Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('apogee_admin_session') === 'true';
  });
  const [adminEmail, setAdminEmail] = useState('lapassessment1@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Target Google Account for Drive & Sheets
  const [targetGoogleEmail, setTargetGoogleEmail] = useState<string>(
    () => {
      const stored = getConnectedGoogleEmail();
      if (stored && (stored.includes('labassessment') || stored.includes('admin@assessment'))) {
        setConnectedGoogleEmail(TARGET_ADMIN_GOOGLE_ACCOUNT);
        return TARGET_ADMIN_GOOGLE_ACCOUNT;
      }
      return stored || TARGET_ADMIN_GOOGLE_ACCOUNT;
    }
  );
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => !!getConnectedGoogleEmail());

  // Interactive Spreadsheet Viewer State
  const [selectedSpreadsheetExam, setSelectedSpreadsheetExam] = useState<Exam | null>(null);
  const [spreadsheetTab, setSpreadsheetTab] = useState<'sheet1' | 'sheet2'>('sheet1');
  const [spreadsheetSearch, setSpreadsheetSearch] = useState<string>('');

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'create' | 'exams' | 'analytics'>('create');

  // Stored Data
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

  // Filter States
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Generator Form States
  const [formExamCode, setFormExamCode] = useState<string>('CSE-LAB-401');
  const [formTitle, setFormTitle] = useState<string>('Advanced Operating Systems & Kernel Threads Test');
  const [formTopic, setFormTopic] = useState<string>('Operating Systems: Deadlocks & Process Synchronization');
  const [formCoverage, setFormCoverage] = useState<string>('From Banker\'s Algorithm and Semaphore Mutex to Peterson\'s solution, memory paging, and deadlock recovery');
  const [formCount, setFormCount] = useState<number>(5);
  const [formDuration, setFormDuration] = useState<number>(20);
  const [formDifficulty, setFormDifficulty] = useState<ExamDifficulty>('Normal');
  const [formBranch, setFormBranch] = useState<string>('Computer Science & Engineering');
  const [formSection, setFormSection] = useState<string>('Section A');
  const [formYear, setFormYear] = useState<string>('3rd Year');

  // Generator Process
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [generationNotice, setGenerationNotice] = useState<string>('');

  // Universal AI Provider & API Key State (Supports Gemini, OpenAI, Groq, Anthropic, DeepSeek, OpenRouter, Custom)
  const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('apogee_ai_provider') as AIProvider) || 'auto';
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return (
      localStorage.getItem('apogee_ai_api_key') ||
      localStorage.getItem('apogee_gemini_api_key') ||
      ''
    );
  });
  const [aiCustomBaseUrl, setAiCustomBaseUrl] = useState<string>(() => {
    return localStorage.getItem('apogee_ai_base_url') || '';
  });
  const [aiCustomModel, setAiCustomModel] = useState<string>(() => {
    return localStorage.getItem('apogee_ai_model') || '';
  });
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    tested: boolean;
    success?: boolean;
    provider?: string;
    message?: string;
    error?: string;
    modelUsed?: string;
  } | null>(null);
  const [showApiKeyDrawer, setShowApiKeyDrawer] = useState<boolean>(() => {
    return !!localStorage.getItem('apogee_ai_api_key') || !!localStorage.getItem('apogee_gemini_api_key');
  });

  // Google Drive Export Status
  const [isExportingDrive, setIsExportingDrive] = useState<Record<string, boolean>>({});
  const [exportNotification, setExportNotification] = useState<string>('');

  // Load Exams and Submissions
  const reloadData = () => {
    setExams(getStoredExams());
    setSubmissions(getStoredSubmissions());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Handle Admin Login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Single designated admin verification: lapassessment1@gmail.com with nbkrist1234
    const emailMatch =
      adminEmail.trim().toLowerCase() === 'lapassessment1@gmail.com';
    const passwordMatch =
      adminPassword.trim() === 'nbkrist1234';

    if (emailMatch && passwordMatch) {
      setIsAdminLoggedIn(true);
      localStorage.setItem('apogee_admin_session', 'true');
    } else {
      setLoginError('Invalid Faculty Admin credentials. Email: lapassessment1@gmail.com, Passkey: nbkrist1234');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('apogee_admin_session');
  };

  // Verify Any API Key (Gemini, OpenAI, Groq, Anthropic, DeepSeek, OpenRouter, Custom)
  const handleVerifyApiKey = async () => {
    if (!aiApiKey.trim()) {
      setVerificationFeedback({
        tested: true,
        success: false,
        error: 'Please enter or paste an API key first.',
      });
      return;
    }

    setIsVerifyingKey(true);
    setVerificationFeedback(null);

    const result = await verifyAnyApiKey({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      customBaseUrl: aiCustomBaseUrl.trim() || undefined,
      customModel: aiCustomModel.trim() || undefined,
    });

    setIsVerifyingKey(false);
    setVerificationFeedback({
      tested: true,
      success: result.success,
      provider: result.provider,
      message: result.message,
      error: result.error,
      modelUsed: result.modelUsed,
    });
  };

  // AI MCQ Generation handler
  const handleGenerateQuestions = async () => {
    if (!formTopic.trim()) {
      setGenerationNotice('Please provide a specific topic name.');
      return;
    }

    setIsGeneratingAI(true);
    setGenerationNotice('AI engine is generating rigorous, syllabus-aligned multiple choice questions...');

    try {
      const qs = await generateQuestionsWithAI({
        topic: formTopic.trim(),
        coverage: formCoverage.trim(),
        count: formCount,
        difficulty: formDifficulty,
        branch: formBranch,
        provider: aiProvider,
        customApiKey: aiApiKey.trim() || undefined,
        customBaseUrl: aiCustomBaseUrl.trim() || undefined,
        customModel: aiCustomModel.trim() || undefined,
      });

      setGeneratedQuestions(qs);
      setGenerationNotice(
        `✓ Successfully generated ${qs.length} topic-specific MCQs for "${formTopic}"! Review or edit them below before publishing.`
      );
    } catch (err: any) {
      console.error(err);
      setGenerationNotice(`AI Provider notice: ${err.message || 'Error occurred'}. Switched to topic curriculum synthesis.`);
      // Fallback without custom key so user is never blocked
      try {
        const fallbackQs = await generateQuestionsWithAI({
          topic: formTopic.trim(),
          coverage: formCoverage.trim(),
          count: formCount,
          difficulty: formDifficulty,
          branch: formBranch,
        });
        setGeneratedQuestions(fallbackQs);
      } catch {
        setGenerationNotice('Error generating questions. Please try again.');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddCustomQuestion = () => {
    const newQ: Question = {
      id: `q_custom_${Date.now()}`,
      text: 'New Question: Enter your question description here...',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'Explanation for correct key.',
      topic: formTopic || 'General',
    };
    setGeneratedQuestions([...generatedQuestions, newQ]);
  };

  // Publish Exam to active student list
  const handlePublishExam = () => {
    if (generatedQuestions.length === 0) {
      alert('Please generate or add at least one question before publishing.');
      return;
    }

    const newExam: Exam = {
      id: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: formExamCode.trim().toUpperCase(),
      title: formTitle.trim(),
      topic: formTopic.trim(),
      coverage: formCoverage.trim(),
      targetBranch: formBranch,
      targetSection: formSection,
      targetYear: formYear,
      difficulty: formDifficulty,
      durationMinutes: formDuration,
      questions: generatedQuestions,
      totalMarks: generatedQuestions.length,
      createdAt: new Date().toISOString(),
      status: 'active',
      maxViolations: 3,
    };

    const updated = [newExam, ...exams];
    saveStoredExams(updated);
    setExams(updated);
    setActiveTab('exams');
    setGeneratedQuestions([]);
    setGenerationNotice('');
    alert(`Assessment "${newExam.title}" (${newExam.code}) is now active for students!`);
  };

  // Direct Google Account Link for lapassessment1@gmail.com
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    setExportNotification(`Connecting to Google account ${targetGoogleEmail}...`);
    try {
      await getGoogleAccessToken(targetGoogleEmail);
      setIsGoogleConnected(true);
      setConnectedGoogleEmail(targetGoogleEmail);
      setExportNotification(`✓ Successfully authorized Google Drive & Sheets for ${targetGoogleEmail}!`);
      setTimeout(() => setExportNotification(''), 6000);
    } catch (err: any) {
      console.warn('Google connect warning:', err);
      setExportNotification(`Notice: Could not connect Google Account automatically (${err.message || 'Pop-up blocked'}). Ensure pop-ups are allowed.`);
      setTimeout(() => setExportNotification(''), 7000);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Export to Google Drive & Google Sheets (The 2 Sheets Requirement)
  const handleExportDrive = async (exam: Exam) => {
    const examSubs = submissions.filter((s) => s.examId === exam.id);
    if (examSubs.length === 0) {
      alert('No student submissions recorded for this examination yet. You can still export empty template or test with sample candidates.');
    }

    setIsExportingDrive((prev) => ({ ...prev, [exam.id]: true }));
    setExportNotification(`Authorizing Google Drive for ${targetGoogleEmail} & generating spreadsheet ${exam.code}...`);

    try {
      const result = await exportToGoogleDriveAndSheets(exam, examSubs, targetGoogleEmail);
      updateExamDriveRecord(exam.id, result.spreadsheetUrl, result.spreadsheetId, result.fileName);
      reloadData();
      setIsGoogleConnected(true);
      setExportNotification(
        `✓ Exported successfully to Google Drive (${targetGoogleEmail})! File: ${result.fileName}`
      );
      setTimeout(() => setExportNotification(''), 8000);
    } catch (err: any) {
      console.error('Google Drive export error:', err);
      // Fallback: offer local Excel download
      downloadOfflineExcel(exam, examSubs);
      setExportNotification(
        `Notice: Google OAuth authorization cancelled or restricted. An offline 2-in-1 Excel file (.xlsx) was downloaded directly to your computer instead.`
      );
      setTimeout(() => setExportNotification(''), 8000);
    } finally {
      setIsExportingDrive((prev) => ({ ...prev, [exam.id]: false }));
    }
  };

  // Offline Excel Download
  const handleOfflineDownload = (exam: Exam) => {
    const examSubs = submissions.filter((s) => s.examId === exam.id);
    downloadOfflineExcel(exam, examSubs);
  };

  // Filtered Exams
  const filteredExams = exams.filter((ex) => {
    const matchBranch = branchFilter === 'All' || ex.targetBranch.toLowerCase().includes(branchFilter.toLowerCase());
    const matchSection = sectionFilter === 'All' || ex.targetSection.toLowerCase().includes(sectionFilter.toLowerCase());
    const matchYear = yearFilter === 'All' || ex.targetYear.toLowerCase().includes(yearFilter.toLowerCase());
    const matchSearch =
      searchQuery === '' ||
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBranch && matchSection && matchYear && matchSearch;
  });

  const isDark = theme === 'dark';

  // LOGIN SCREEN FOR FACULTY ADMIN
  if (!isAdminLoggedIn) {
    return (
      <div
        className={`min-h-screen relative flex flex-col items-center justify-center p-4 font-sans ${
          isDark ? 'bg-[#080A19] text-white' : 'bg-slate-100 text-slate-900'
        }`}
      >
        <div className="w-full max-w-md">
          <div
            className={`rounded-3xl p-8 backdrop-blur-2xl border shadow-2xl ${
              isDark ? 'bg-[rgba(17,16,25,0.85)] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3 border border-indigo-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Faculty & Admin Portal</h2>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Restricted to authorized faculty examiners and lab instructors.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  Faculty Email ID
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                  Admin Passkey
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter passkey (nbkrist1234)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:opacity-95 transition-all cursor-pointer"
              >
                Authenticate & Enter Dashboard
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                onClick={onExitToStudentPortal}
                className="text-xs text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Return to Student Examination Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN ADMIN DASHBOARD INTERFACE
  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#080A19] text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Header */}
      <header
        className={`w-full border-b sticky top-0 z-30 backdrop-blur-xl ${
          isDark ? 'bg-[#080A19]/90 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Faculty Examination Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs opacity-60">AI Question Generation • Google Drive & Sheets Sync</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            className={`flex items-center rounded-xl p-1 border text-xs font-semibold ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Exam Generator</span>
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'exams'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exams & Drive Exports ({exams.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Branch Analytics</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Toggle Light / Dark mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button
              onClick={onExitToStudentPortal}
              className="px-3 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span>Student View</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={handleAdminLogout}
              className="p-2 rounded-xl border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 transition-colors opacity-70 hover:opacity-100"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Export / Notification Banner */}
      {exportNotification && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 animate-fade-down">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* Main Admin View Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        {/* TAB 1: AI EXAM GENERATOR */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div
              className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl border ${
                isDark ? 'bg-[rgba(17,16,25,0.7)] border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 mb-6 border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span>AI MCQ Assessment Generator</span>
                  </h2>
                  <p className="text-xs opacity-60 mt-1">
                    Powered by Gemini AI • Produces curriculum-aligned questions with 4 options and answer keys.
                  </p>
                </div>
              </div>

              {/* Universal AI Provider & Multi-Provider API Key Verifier Card */}
              <div
                className={`p-5 rounded-2xl border mb-6 transition-all ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm">Universal AI Engine & Key Verifier</span>
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            verificationFeedback?.success
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : aiApiKey.trim()
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {verificationFeedback?.success ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>VERIFIED & ACTIVE ({verificationFeedback.provider?.toUpperCase()})</span>
                            </>
                          ) : aiApiKey.trim() ? (
                            <span>CUSTOM API KEY CONFIGURED</span>
                          ) : (
                            <span>TOPIC CURRICULUM SYNTHESIS ENGINE</span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Verify and use <strong>any API key</strong>: Google Gemini, OpenAI, Groq Cloud, Anthropic Claude, DeepSeek, OpenRouter, or Custom self-hosted endpoints.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowApiKeyDrawer(!showApiKeyDrawer)}
                    className="text-xs px-3.5 py-1.5 rounded-xl border border-white/15 hover:bg-white/10 font-semibold transition-colors shrink-0 text-left cursor-pointer"
                  >
                    {showApiKeyDrawer ? 'Hide API Settings' : 'Configure / Verify Any API Key'}
                  </button>
                </div>

                {showApiKeyDrawer && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3.5 animate-fade-down">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Provider Select */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                          AI Provider
                        </label>
                        <select
                          value={aiProvider}
                          onChange={(e) => {
                            const p = e.target.value as AIProvider;
                            setAiProvider(p);
                            localStorage.setItem('apogee_ai_provider', p);
                            setVerificationFeedback(null);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="auto">Auto-Detect (Any API Key)</option>
                          <option value="gemini">Google Gemini (AIzaSy...)</option>
                          <option value="openai">OpenAI (sk-... / sk-proj-...)</option>
                          <option value="groq">Groq Cloud (gsk_... High-Speed)</option>
                          <option value="anthropic">Anthropic Claude (sk-ant-...)</option>
                          <option value="deepseek">DeepSeek (sk-...)</option>
                          <option value="openrouter">OpenRouter (sk-or-...)</option>
                          <option value="custom">Custom / Self-Hosted Endpoint</option>
                        </select>
                      </div>

                      {/* Model Override (Optional) */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                          Model Identifier (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder={
                            aiProvider === 'gemini'
                              ? 'gemini-3.8-flash'
                              : aiProvider === 'openai'
                              ? 'gpt-4o-mini'
                              : aiProvider === 'groq'
                              ? 'llama-3.3-70b-versatile'
                              : aiProvider === 'anthropic'
                              ? 'claude-3-5-haiku-latest'
                              : aiProvider === 'deepseek'
                              ? 'deepseek-chat'
                              : 'Auto / Default Model'
                          }
                          value={aiCustomModel}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiCustomModel(val);
                            localStorage.setItem('apogee_ai_model', val);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Custom Base URL (if custom selected) */}
                      {aiProvider === 'custom' && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                            Custom Base URL
                          </label>
                          <input
                            type="text"
                            placeholder="http://localhost:11434/v1"
                            value={aiCustomBaseUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAiCustomBaseUrl(val);
                              localStorage.setItem('apogee_ai_base_url', val);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* API Key Input and Verify Action */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">
                        API Secret Key (Supports Any AI Provider)
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="password"
                            placeholder="Paste any key: AIzaSy... / sk-... / gsk_... / sk-ant-..."
                            value={aiApiKey}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAiApiKey(val);
                              localStorage.setItem('apogee_ai_api_key', val);
                              setVerificationFeedback(null);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleVerifyApiKey}
                          disabled={isVerifyingKey || !aiApiKey.trim()}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {isVerifyingKey ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying Key...</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-3.5 h-3.5" />
                              <span>Verify Key with Provider</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Verification Result Feedback Banner */}
                    {verificationFeedback && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                          verificationFeedback.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {verificationFeedback.success ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <strong className="block font-bold">
                            {verificationFeedback.success
                              ? `Verification Succeeded (${verificationFeedback.provider})`
                              : `Verification Failed (${verificationFeedback.provider || 'API Provider'})`}
                          </strong>
                          <p className="mt-0.5 opacity-90">
                            {verificationFeedback.message || verificationFeedback.error}
                          </p>
                          {verificationFeedback.modelUsed && (
                            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/10">
                              Active Model: {verificationFeedback.modelUsed}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Exam Title & Code */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Assessment Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Data Structures & Algorithms Midterm"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Course / Exam Code
                  </label>
                  <input
                    type="text"
                    value={formExamCode}
                    onChange={(e) => setFormExamCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CSE-302"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* Topic Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Topic Name
                  </label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Trees, AVL Rotations & Graph Algorithms"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* Coverage Range ("Where to where it needs to cover") */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Syllabus Coverage / Scope ("Where to where it needs to cover")
                  </label>
                  <textarea
                    rows={2}
                    value={formCoverage}
                    onChange={(e) => setFormCoverage(e.target.value)}
                    placeholder="Describe specific bounds e.g. From Binary Search Tree insertion & deletion to AVL balance factors, rotations, and Dijkstra shortest paths"
                    className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                {/* Branch, Section, Year */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Target Branch
                  </label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Artificial Intelligence & ML">Artificial Intelligence & ML</option>
                    <option value="Electronics & Comm. Eng">Electronics & Comm. Eng</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Section
                    </label>
                    <select
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="Section A">Section A</option>
                      <option value="Section B">Section B</option>
                      <option value="Section C">Section C</option>
                      <option value="All Sections">All Sections</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Year
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                {/* Difficulty, Questions Count, Duration */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Difficulty Level
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as ExamDifficulty)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="AI Choice">AI Choice (Adaptive)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      No. of MCQs ({formCount})
                    </label>
                    <select
                      value={formCount}
                      onChange={(e) => setFormCount(Number(e.target.value))}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                      <option value={15}>15 Questions</option>
                      <option value={20}>20 Questions</option>
                      <option value={25}>25 Questions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                <div className="text-xs text-indigo-400 font-medium">
                  {generationNotice || 'Click below to synthesize questions.'}
                </div>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingAI}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing MCQs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate {formCount} MCQs with Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Questions Review & Publish Area */}
            {generatedQuestions.length > 0 && (
              <div
                className={`rounded-3xl p-6 sm:p-8 backdrop-blur-xl border ${
                  isDark ? 'bg-[rgba(17,16,25,0.7)] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">
                      Generated Questions Preview ({generatedQuestions.length} Questions)
                    </h3>
                    <p className="text-xs opacity-60">
                      Each student receives a jumbled order during their live assessment.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddCustomQuestion}
                      className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Custom Question</span>
                    </button>
                    <button
                      onClick={handlePublishExam}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Publish & Activate Assessment</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                          Q{idx + 1}
                        </span>
                        <button
                          onClick={() => {
                            setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== idx));
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1 opacity-70 hover:opacity-100"
                          title="Remove Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="font-medium text-sm mb-3">{q.text}</p>

                      {q.codeSnippet && (
                        <div className="mb-3 p-3 rounded-lg bg-black/60 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre">
                          {q.codeSnippet}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optI) => (
                          <div
                            key={optI}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              optI === q.correctAnswer
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                                : 'bg-black/20 border-white/5 opacity-80'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-bold">
                              {['A', 'B', 'C', 'D'][optI]}
                            </span>
                            <span>{opt}</span>
                            {optI === q.correctAnswer && (
                              <span className="ml-auto text-[10px] uppercase font-bold text-emerald-400">
                                Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="mt-3 text-[11px] opacity-70 italic">
                          Rationale: {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXAMS & TWO EXCEL SHEETS GOOGLE DRIVE EXPORTS */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            {/* Google Drive & Account Integration Status Card */}
            <div
              className={`rounded-3xl p-5 sm:p-6 border backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDark ? 'bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border-blue-500/30' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base">Faculty Google Drive & Sheets Integration</h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isGoogleConnected
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isGoogleConnected ? 'CONNECTED' : 'READY TO AUTHORIZE'}
                    </span>
                  </div>
                  <p className="text-xs opacity-75 mt-0.5">
                    Target Faculty Account: <strong className="font-mono text-indigo-400">{targetGoogleEmail}</strong>
                  </p>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    Exports both <strong>Sheet 1: Candidate Registration Details</strong> and <strong>Sheet 2: Question & Marks Matrix</strong> directly into Google Drive named <code className="text-amber-300">[Branch]_[Date]_[Section]</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isConnectingGoogle ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isGoogleConnected ? `Re-authorize ${targetGoogleEmail}` : `Authorize ${targetGoogleEmail}`}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div
              className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-4 ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 opacity-50 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter by exam title, code or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm focus:outline-none placeholder-white/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Branch Filter */}
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <option value="All">All Branches</option>
                  <option value="Computer Science">CSE</option>
                  <option value="Artificial Intelligence">AIML</option>
                  <option value="Electronics">ECE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Mechanical">MECH</option>
                </select>

                {/* Section Filter */}
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <option value="All">All Sections</option>
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </select>

                {/* Year Filter */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className={`px-3 py-1.5 rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <option value="All">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            {/* List of Assessments with Google Drive links */}
            <div className="grid grid-cols-1 gap-5">
              {filteredExams.map((exam) => {
                const examSubs = submissions.filter((s) => s.examId === exam.id);
                const avgScore =
                  examSubs.length > 0
                    ? (examSubs.reduce((acc, s) => acc + s.score, 0) / examSubs.length).toFixed(1)
                    : 'N/A';
                const passCount = examSubs.filter((s) => s.percentage >= 50).length;
                const passRate =
                  examSubs.length > 0 ? ((passCount / examSubs.length) * 100).toFixed(0) : '0';

                return (
                  <div
                    key={exam.id}
                    className={`rounded-3xl p-6 backdrop-blur-xl border transition-all ${
                      isDark ? 'bg-[rgba(17,16,25,0.7)] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 mb-4 border-white/10">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            {exam.code}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 opacity-80">
                            {exam.targetBranch} • {exam.targetSection} • {exam.targetYear}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                            {exam.difficulty}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold">{exam.title}</h3>
                        <p className="text-xs opacity-60 mt-0.5">
                          Topic: {exam.topic} • {exam.questions.length} Questions • {exam.durationMinutes} mins
                        </p>
                      </div>

                      {/* Export Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* 1. Open Spreadsheet (In-Portal & Drive Viewer) */}
                        <button
                          onClick={() => {
                            setSelectedSpreadsheetExam(exam);
                            setSpreadsheetTab('sheet1');
                            setSpreadsheetSearch('');
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Open two worksheets (Candidate Details & Marks Matrix)"
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>Open Spreadsheet</span>
                        </button>

                        {/* Direct Google Drive Link if already exported to real Google Sheet */}
                        {exam.driveSpreadsheetUrl && !exam.driveSpreadsheetUrl.includes('demo_') ? (
                          <a
                            href={exam.driveSpreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                            title="Open live Google Spreadsheet in Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Drive Sheet</span>
                          </a>
                        ) : null}

                        {/* Export & Save to Google Drive Button */}
                        <button
                          onClick={() => handleExportDrive(exam)}
                          disabled={isExportingDrive[exam.id]}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isExportingDrive[exam.id] ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving to Drive ({targetGoogleEmail})...</span>
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Save 2 Sheets to Drive ({targetGoogleEmail.split('@')[0]})</span>
                            </>
                          )}
                        </button>

                        {/* Local Offline Excel Download Button */}
                        <button
                          onClick={() => handleOfflineDownload(exam)}
                          className="px-3.5 py-2 rounded-xl border border-white/15 hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Download .xlsx Excel file with both sheets"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .xlsx</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats & Two Sheets Specification Notice */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="opacity-60 block">Students Submitted:</span>
                        <span className="text-base font-bold text-indigo-400">{examSubs.length}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="opacity-60 block">Class Average:</span>
                        <span className="text-base font-bold text-emerald-400">
                          {avgScore} / {exam.questions.length}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="opacity-60 block">Pass Rate:</span>
                        <span className="text-base font-bold text-teal-400">{passRate}%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="opacity-60 block">Drive File Spec:</span>
                        <span className="font-mono text-[11px] truncate block text-amber-300">
                          {exam.driveFileName || `[${exam.targetBranch}]_[Date]_[${exam.targetSection}]`}
                        </span>
                      </div>
                    </div>

                    {/* Quick preview of submissions list */}
                    {examSubs.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 opacity-60">
                              <th className="py-2 pr-3">Candidate</th>
                              <th className="py-2 pr-3">Roll No</th>
                              <th className="py-2 pr-3">Branch & Section</th>
                              <th className="py-2 pr-3">Score</th>
                              <th className="py-2 pr-3">Proctoring Flags</th>
                              <th className="py-2">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examSubs.slice(0, 5).map((sub) => (
                              <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-2 pr-3 font-semibold">{sub.student.fullName}</td>
                                <td className="py-2 pr-3 font-mono text-indigo-400">{sub.student.rollNumber}</td>
                                <td className="py-2 pr-3">
                                  {sub.student.branch} ({sub.student.section})
                                </td>
                                <td className="py-2 pr-3 font-bold text-emerald-400">
                                  {sub.score}/{sub.totalQuestions} ({sub.percentage.toFixed(0)}%)
                                </td>
                                <td className="py-2 pr-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      sub.violationsCount > 0
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-emerald-500/20 text-emerald-400'
                                    }`}
                                  >
                                    {sub.violationsCount} Violations
                                  </span>
                                </td>
                                <td className="py-2 font-mono opacity-60">
                                  {new Date(sub.submittedAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs opacity-50 italic">
                        No submissions yet. Share exam code "{exam.code}" with students.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PERFORMANCE ANALYTICS BY BRANCH, SECTION & YEAR */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Aggregate Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs uppercase font-semibold opacity-60 mb-1">Total Assessed</div>
                <div className="text-3xl font-extrabold text-indigo-400">{submissions.length}</div>
                <div className="text-xs opacity-60 mt-1">Across all branches & sections</div>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs uppercase font-semibold opacity-60 mb-1">Overall Average</div>
                <div className="text-3xl font-extrabold text-emerald-400">
                  {submissions.length > 0
                    ? (
                        submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length
                      ).toFixed(1)
                    : 0}
                  %
                </div>
                <div className="text-xs opacity-60 mt-1">Class academic performance</div>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs uppercase font-semibold opacity-60 mb-1">Pass Ratio (&gt;50%)</div>
                <div className="text-3xl font-extrabold text-teal-400">
                  {submissions.length > 0
                    ? (
                        (submissions.filter((s) => s.percentage >= 50).length / submissions.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <div className="text-xs opacity-60 mt-1">Threshold compliance</div>
              </div>

              <div
                className={`p-5 rounded-3xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-xs uppercase font-semibold opacity-60 mb-1">Integrity Clean Rate</div>
                <div className="text-3xl font-extrabold text-purple-400">
                  {submissions.length > 0
                    ? (
                        (submissions.filter((s) => s.violationsCount === 0).length / submissions.length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
                <div className="text-xs opacity-60 mt-1">Zero-violation submissions</div>
              </div>
            </div>

            {/* Breakdown by Branch and Section */}
            <div
              className={`rounded-3xl p-6 backdrop-blur-xl border ${
                isDark ? 'bg-[rgba(17,16,25,0.7)] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className="text-lg font-bold mb-4">Branch & Section Separation Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 opacity-70">
                      <th className="py-2.5 pr-4">Branch</th>
                      <th className="py-2.5 pr-4">Section</th>
                      <th className="py-2.5 pr-4">Candidates</th>
                      <th className="py-2.5 pr-4">Average Score</th>
                      <th className="py-2.5 pr-4">High Score</th>
                      <th className="py-2.5 pr-4">Proctoring Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { branch: 'Computer Science & Engineering', sec: 'Section A' },
                      { branch: 'Computer Science & Engineering', sec: 'Section B' },
                      { branch: 'Artificial Intelligence & ML', sec: 'Section B' },
                      { branch: 'Electronics & Comm. Eng', sec: 'Section A' },
                    ].map((group, idx) => {
                      const matched = submissions.filter(
                        (s) => s.student.branch.includes(group.branch) || s.student.section === group.sec
                      );
                      const avg =
                        matched.length > 0
                          ? (matched.reduce((acc, s) => acc + s.percentage, 0) / matched.length).toFixed(1)
                          : '0';
                      const high =
                        matched.length > 0
                          ? Math.max(...matched.map((s) => s.score))
                          : '0';
                      const violationsSum = matched.reduce((acc, s) => acc + s.violationsCount, 0);

                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2.5 pr-4 font-semibold text-indigo-300">{group.branch}</td>
                          <td className="py-2.5 pr-4">{group.sec}</td>
                          <td className="py-2.5 pr-4 font-bold">{matched.length}</td>
                          <td className="py-2.5 pr-4 font-bold text-emerald-400">{avg}%</td>
                          <td className="py-2.5 pr-4 font-bold text-teal-400">{high} pts</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                violationsSum > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {violationsSum} Total Flags
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SPREADSHEET VIEWER MODAL (SHEET 1 & SHEET 2) */}
      {selectedSpreadsheetExam && (() => {
        const examSubs = submissions.filter((s) => s.examId === selectedSpreadsheetExam.id);
        const { fileName, sheet1Data, sheet2Data } = buildExcelWorksheets(selectedSpreadsheetExam, examSubs);
        
        const currentSheetData = spreadsheetTab === 'sheet1' ? sheet1Data : sheet2Data;
        const headers = currentSheetData[0] || [];
        const rows = currentSheetData.slice(1);
        const filteredRows = rows.filter((r: any[]) =>
          spreadsheetSearch === '' ||
          r.some((cell: any) => String(cell).toLowerCase().includes(spreadsheetSearch.toLowerCase()))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <div
              className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
                isDark ? 'bg-[#0f1123] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Table className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base sm:text-lg">
                        Spreadsheet: {fileName}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {selectedSpreadsheetExam.code}
                      </span>
                    </div>
                    <p className="text-xs opacity-75 mt-0.5">
                      Target Account: <strong className="font-mono text-emerald-400">{targetGoogleEmail}</strong> • {examSubs.length} candidate submissions recorded
                    </p>
                  </div>
                </div>

                {/* Modal Header Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedSpreadsheetExam.driveSpreadsheetUrl ? (
                    <a
                      href={selectedSpreadsheetExam.driveSpreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Open in Google Drive / Sheets in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open in Google Drive</span>
                    </a>
                  ) : null}

                  <button
                    onClick={() => handleExportDrive(selectedSpreadsheetExam)}
                    disabled={isExportingDrive[selectedSpreadsheetExam.id]}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExportingDrive[selectedSpreadsheetExam.id] ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Drive...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Save to Drive ({targetGoogleEmail.split('@')[0]})</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOfflineDownload(selectedSpreadsheetExam)}
                    className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Download .xlsx Excel workbook"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .xlsx</span>
                  </button>

                  <button
                    onClick={() => setSelectedSpreadsheetExam(null)}
                    className="w-9 h-9 rounded-xl border border-white/20 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Close spreadsheet viewer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-toolbar: Sheet Tabs & Search */}
              <div className="px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSpreadsheetTab('sheet1')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      spreadsheetTab === 'sheet1'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Sheet 1: Candidate Details</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                      {sheet1Data.length - 1} rows
                    </span>
                  </button>

                  <button
                    onClick={() => setSpreadsheetTab('sheet2')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      spreadsheetTab === 'sheet2'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Sheet 2: Answers & Marks Matrix</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                      {sheet2Data.length - 1} rows
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto min-w-[220px]">
                  <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search candidate name, roll no, status..."
                    value={spreadsheetSearch}
                    onChange={(e) => setSpreadsheetSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-400 placeholder-white/30"
                  />
                </div>
              </div>

              {/* Table Data View */}
              <div className="flex-1 overflow-auto p-4 max-h-[62vh]">
                <table className="w-full text-xs text-left border-collapse border border-white/10 min-w-[800px]">
                  <thead>
                    <tr className="bg-white/10 sticky top-0 backdrop-blur-md">
                      <th className="p-2.5 border border-white/10 font-bold opacity-60 w-10 text-center">#</th>
                      {headers.map((h: string, idx: number) => (
                        <th
                          key={idx}
                          className="p-2.5 border border-white/10 font-bold whitespace-nowrap text-indigo-300"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row: any[], rowIdx: number) => (
                        <tr
                          key={rowIdx}
                          className={`hover:bg-white/5 border-b border-white/5 ${
                            rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                          }`}
                        >
                          <td className="p-2.5 border border-white/10 text-center opacity-40 font-mono">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell: any, cellIdx: number) => {
                            const str = String(cell);
                            const isCorrect = str.includes('CORRECT');
                            const isIncorrect = str.includes('INCORRECT');
                            const isFlagged = str.includes('FLAGGED');
                            const isWarning = str.includes('WARNING');
                            const isClean = str.includes('CLEAN');

                            return (
                              <td
                                key={cellIdx}
                                className={`p-2.5 border border-white/10 whitespace-nowrap ${
                                  isCorrect
                                    ? 'text-emerald-400 font-semibold'
                                    : isIncorrect
                                    ? 'text-rose-400 font-medium'
                                    : isFlagged
                                    ? 'text-rose-400 font-bold'
                                    : isWarning
                                    ? 'text-amber-400 font-medium'
                                    : isClean
                                    ? 'text-emerald-400 font-semibold'
                                    : ''
                                }`}
                              >
                                {str}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={headers.length + 1}
                          className="p-8 text-center opacity-60 italic"
                        >
                          {rows.length === 0
                            ? 'No candidate submissions recorded for this assessment yet. Take a test or use preloaded candidates to see data.'
                            : 'No matching rows found for search query.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs opacity-70 bg-black/20">
                <span>
                  Showing {filteredRows.length} of {rows.length} records • Saved with filename{' '}
                  <strong className="font-mono text-amber-300">{fileName}</strong>
                </span>
                <span>
                  Google Drive Target: <strong className="font-mono text-emerald-400">{targetGoogleEmail}</strong>
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
