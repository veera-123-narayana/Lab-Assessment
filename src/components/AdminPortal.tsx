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
  Check,
  Upload,
  FileText,
  FileUp,
  CheckCheck,
  Copy,
  ArrowUp,
  ArrowDown,
  Sliders,
  Edit3
} from 'lucide-react';
import { Exam, ExamDifficulty, Question, StudentSubmission, FacultyReviewSummary } from '../types';
import { generateQuestionsWithAI, verifyAnyApiKey, extractPdfText, AIProvider } from '../lib/gemini';
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

  // AI Generator Form States (Master Prompt Specifications)
  const [formExamCode, setFormExamCode] = useState<string>('CSE-LAB-401');
  const [formTitle, setFormTitle] = useState<string>('Advanced Operating Systems & Kernel Threads Test');
  const [formSubject, setFormSubject] = useState<string>('Computer Science & Engineering');
  const [formTopic, setFormTopic] = useState<string>('Operating Systems: Deadlocks & Process Synchronization');
  const [formCoverage, setFormCoverage] = useState<string>('From Banker\'s Algorithm and Semaphore Mutex to Peterson\'s solution, memory paging, and deadlock recovery');
  const [formSubtopics, setFormSubtopics] = useState<string>('Coffman Conditions, Safe State Calculation, Mutex vs Semaphore, Thrashing, Page Replacement');
  const [formAcademicLevel, setFormAcademicLevel] = useState<string>('Undergraduate B.Tech');
  const [formCount, setFormCount] = useState<number>(5);
  const [formMaxMarks, setFormMaxMarks] = useState<number>(5);
  const [formDuration, setFormDuration] = useState<number>(20);
  const [formDifficulty, setFormDifficulty] = useState<ExamDifficulty>('Normal');
  const [formBranch, setFormBranch] = useState<string>('Computer Science & Engineering');
  const [formSection, setFormSection] = useState<string>('Section A');
  const [formYear, setFormYear] = useState<string>('3rd Year');
  const [formAdditionalInstructions, setFormAdditionalInstructions] = useState<string>('Focus on practical laboratory scenarios and multi-step reasoning.');
  const [formGenerationMode, setFormGenerationMode] = useState<string>('ai_generated');

  // Creation Sub-Mode Selector
  const [creationMode, setCreationMode] = useState<'ai_topic' | 'pdf_upload' | 'custom_admin'>('ai_topic');

  // PDF Upload & Extraction States (PDF to Questions with Levels)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfFileSize, setPdfFileSize] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<number>(1);
  const [pdfCharCount, setPdfCharCount] = useState<number>(0);
  const [pdfText, setPdfText] = useState<string>('');
  const [pdfSnippet, setPdfSnippet] = useState<string>('');
  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
  const [pdfExtractionNotice, setPdfExtractionNotice] = useState<string>('');
  const [showPdfTextPreview, setShowPdfTextPreview] = useState<boolean>(false);
  const [pdfDifficulty, setPdfDifficulty] = useState<ExamDifficulty>('Medium');
  const [pdfQuestionCount, setPdfQuestionCount] = useState<number>(10);
  const [pdfExamCode, setPdfExamCode] = useState<string>('PDF-LAB-201');
  const [pdfExamTitle, setPdfExamTitle] = useState<string>('Uploaded Syllabus Assessment');
  const [pdfSubject, setPdfSubject] = useState<string>('Computer Science & Engineering');
  const [pdfSpecificFocus, setPdfSpecificFocus] = useState<string>('');
  const [pdfDuration, setPdfDuration] = useState<number>(30);
  const [pdfMaxMarks, setPdfMaxMarks] = useState<number>(10);

  // Custom Test Builder States (Admin Manual Question Authoring & Approval)
  const [isAuthoringModalOpen, setIsAuthoringModalOpen] = useState<boolean>(false);
  const [authQuestionIndex, setAuthQuestionIndex] = useState<number | null>(null);
  const [authText, setAuthText] = useState<string>('');
  const [authOptionA, setAuthOptionA] = useState<string>('');
  const [authOptionB, setAuthOptionB] = useState<string>('');
  const [authOptionC, setAuthOptionC] = useState<string>('');
  const [authOptionD, setAuthOptionD] = useState<string>('');
  const [authCorrectAnswer, setAuthCorrectAnswer] = useState<number>(0);
  const [authExplanation, setAuthExplanation] = useState<string>('');
  const [authSubtopic, setAuthSubtopic] = useState<string>('');
  const [authDifficulty, setAuthDifficulty] = useState<'easy' | 'normal' | 'medium' | 'hard'>('normal');
  const [authQuestionType, setAuthQuestionType] = useState<string>('conceptual');
  const [authCodeSnippet, setAuthCodeSnippet] = useState<string>('');
  const [authMarks, setAuthMarks] = useState<number>(1);
  const [authIsApproved, setAuthIsApproved] = useState<boolean>(true);
  const [inlineEditingIndex, setInlineEditingIndex] = useState<number | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [publishFeedback, setPublishFeedback] = useState<string>('');

  // Generator Process & Faculty Review Summary
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [facultySummary, setFacultySummary] = useState<FacultyReviewSummary | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string>('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

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

  // AI MCQ Generation handler (Adheres to Master Prompt Specifications)
  const handleGenerateQuestions = async () => {
    if (!formTopic.trim()) {
      setGenerationNotice('Please provide a specific topic name.');
      return;
    }

    setIsGeneratingAI(true);
    setGenerationNotice('AI engine is mapping topics, balancing taxonomy, and generating rigorous MCQs...');

    try {
      const res = await generateQuestionsWithAI({
        subject: formSubject.trim(),
        topic: formTopic.trim(),
        mainTopic: formTopic.trim(),
        coverage: formCoverage.trim(),
        topicsToCover: formCoverage.trim(),
        subtopics: formSubtopics.trim(),
        academicLevel: formAcademicLevel,
        count: formCount,
        difficulty: formDifficulty,
        branch: formBranch,
        year: formYear,
        maxMarks: formMaxMarks || formCount,
        duration: formDuration,
        additionalInstructions: formAdditionalInstructions.trim(),
        generationMode: formGenerationMode as any,
        provider: aiProvider,
        customApiKey: aiApiKey.trim() || undefined,
        customBaseUrl: aiCustomBaseUrl.trim() || undefined,
        customModel: aiCustomModel.trim() || undefined,
      });

      setGeneratedQuestions(res.questions);
      if (res.facultySummary) {
        setFacultySummary(res.facultySummary);
      }
      setGenerationNotice(
        res.warning
          ? `✓ ${res.warning}`
          : `✓ Successfully generated ${res.questions.length} academically balanced MCQs for "${formTopic}"! Review summary and questions below.`
      );
    } catch (err: any) {
      console.error(err);
      setGenerationNotice(`AI Provider notice: ${err.message || 'Switched to topic curriculum engine'}.`);
      try {
        const fallbackRes = await generateQuestionsWithAI({
          subject: formSubject.trim(),
          topic: formTopic.trim(),
          coverage: formCoverage.trim(),
          count: formCount,
          difficulty: formDifficulty,
          branch: formBranch,
        });
        setGeneratedQuestions(fallbackRes.questions);
        if (fallbackRes.facultySummary) setFacultySummary(fallbackRes.facultySummary);
      } catch {
        setGenerationNotice('Error generating questions. Please try again.');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Single Question Regeneration (Section 50)
  const handleRegenerateSingleQuestion = async (index: number) => {
    const targetQ = generatedQuestions[index];
    if (!targetQ) return;

    setRegeneratingIndex(index);
    try {
      const res = await generateQuestionsWithAI({
        subject: formSubject.trim(),
        topic: formTopic.trim(),
        mainTopic: formTopic.trim(),
        coverage: targetQ.subtopic || formCoverage.trim(),
        subtopics: targetQ.subtopic || formSubtopics.trim(),
        academicLevel: formAcademicLevel,
        count: 1,
        difficulty: formDifficulty,
        branch: formBranch,
        year: formYear,
        additionalInstructions: `Generate ONE alternative original MCQ for subtopic "${targetQ.subtopic || formTopic}" to replace Question #${index + 1}.`,
        provider: aiProvider,
        customApiKey: aiApiKey.trim() || undefined,
        customBaseUrl: aiCustomBaseUrl.trim() || undefined,
        customModel: aiCustomModel.trim() || undefined,
      });

      if (res.questions && res.questions.length > 0) {
        const newQ = res.questions[0];
        const updated = [...generatedQuestions];
        updated[index] = {
          ...newQ,
          id: `q_regen_${Date.now()}_${index + 1}`,
          questionNumber: index + 1,
        };
        setGeneratedQuestions(updated);
      }
    } catch (err) {
      console.warn('Single question regen error:', err);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  // Upload and Parse PDF Syllabus / Notes File
  const handlePdfFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingPdf(true);
    setPdfExtractionNotice('Analyzing and extracting text from PDF document...');
    setPdfFile(file);
    setPdfFileName(file.name);
    setPdfFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    // Auto-generate suggested code & title
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const autoTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    setPdfExamTitle(`${autoTitle} Assessment`);
    setPdfExamCode(`PDF-${Math.floor(100 + Math.random() * 900)}`);

    try {
      const res = await extractPdfText(file);
      if (res.success && res.text) {
        setPdfText(res.text);
        setPdfCharCount(res.charCount);
        setPdfPages(res.pages || 1);
        setPdfSnippet(res.snippet);
        setPdfExtractionNotice(`✓ Extracted ${res.charCount.toLocaleString()} characters from "${file.name}" (${res.pages || 1} pages). Ready for questions synthesis.`);
      } else {
        setPdfExtractionNotice('✓ Document uploaded. Ready for question synthesis.');
      }
    } catch (err: any) {
      console.warn('PDF upload extract notice:', err);
      setPdfExtractionNotice(`File ${file.name} ready for questions generation.`);
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // Generate Questions from Uploaded PDF with Difficulty Levels
  const handleGenerateQuestionsFromPdf = async () => {
    if (!pdfText.trim()) {
      setPdfExtractionNotice('Please upload a PDF document before generating questions.');
      return;
    }

    setIsGeneratingAI(true);
    setGenerationNotice(`Synthesizing ${pdfQuestionCount} questions from ${pdfFileName} at ${pdfDifficulty} level...`);

    try {
      const res = await generateQuestionsWithAI({
        subject: pdfSubject.trim() || formSubject.trim(),
        topic: pdfExamTitle.trim() || `Assessment from ${pdfFileName}`,
        mainTopic: pdfExamTitle.trim() || `Exam from ${pdfFileName}`,
        coverage: pdfSpecificFocus.trim() || `Complete syllabus content from ${pdfFileName}`,
        topicsToCover: pdfSpecificFocus.trim() || `Directly derived from ${pdfFileName}`,
        academicLevel: formAcademicLevel,
        count: pdfQuestionCount,
        difficulty: pdfDifficulty,
        branch: formBranch,
        year: formYear,
        maxMarks: pdfMaxMarks || pdfQuestionCount,
        duration: pdfDuration,
        additionalInstructions: `Strictly derive questions from the uploaded document text. Target difficulty level: ${pdfDifficulty}. ${pdfSpecificFocus}`.trim(),
        generationMode: 'research_informed',
        pdfText: pdfText.trim(),
        pdfFilename: pdfFileName,
        provider: aiProvider,
        customApiKey: aiApiKey.trim() || undefined,
        customBaseUrl: aiCustomBaseUrl.trim() || undefined,
        customModel: aiCustomModel.trim() || undefined,
      });

      const pdfQuestions: Question[] = res.questions.map((q, idx) => ({
        ...q,
        source: {
          type: 'admin_upload',
          title: pdfFileName || 'Uploaded PDF Syllabus',
        },
        difficulty: (q.difficulty || pdfDifficulty).toLowerCase(),
        isApproved: false, // Ready for admin faculty to review and approve!
        questionNumber: idx + 1,
      }));

      setGeneratedQuestions(pdfQuestions);
      if (res.facultySummary) {
        setFacultySummary(res.facultySummary);
      }
      setFormExamCode(pdfExamCode.trim().toUpperCase());
      setFormTitle(pdfExamTitle.trim() || `PDF Exam: ${pdfFileName}`);
      setFormDifficulty(pdfDifficulty);
      setFormCount(pdfQuestions.length);
      setFormMaxMarks(pdfMaxMarks || pdfQuestions.length);
      setFormDuration(pdfDuration);

      setGenerationNotice(
        res.warning
          ? `✓ ${res.warning}`
          : `✓ Successfully synthesized ${pdfQuestions.length} MCQs from "${pdfFileName}" at ${pdfDifficulty} difficulty! Review and approve questions below.`
      );
    } catch (err: any) {
      console.error('PDF question generation error:', err);
      setGenerationNotice(`Generation notice: ${err.message || 'Switched to document curriculum synthesis'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Question Approval Handlers
  const handleToggleApproveQuestion = (index: number) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          isApproved: !next[index].isApproved,
        };
      }
      return next;
    });
  };

  const handleApproveAllQuestions = () => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        isApproved: true,
      }))
    );
  };

  // Custom Authoring Modal Openers
  const handleOpenAddQuestionModal = () => {
    setAuthQuestionIndex(null);
    setAuthText('');
    setAuthOptionA('');
    setAuthOptionB('');
    setAuthOptionC('');
    setAuthOptionD('');
    setAuthCorrectAnswer(0);
    setAuthExplanation('');
    setAuthSubtopic(formTopic ? `${formTopic} Module` : 'Core Concepts');
    setAuthDifficulty('normal');
    setAuthQuestionType('conceptual');
    setAuthCodeSnippet('');
    setAuthMarks(1);
    setAuthIsApproved(true); // Manually authored questions default to approved
    setIsAuthoringModalOpen(true);
  };

  const handleOpenEditQuestionModal = (index: number) => {
    const q = generatedQuestions[index];
    if (!q) return;
    setAuthQuestionIndex(index);
    setAuthText(q.text);
    setAuthOptionA(q.options[0] || '');
    setAuthOptionB(q.options[1] || '');
    setAuthOptionC(q.options[2] || '');
    setAuthOptionD(q.options[3] || '');
    setAuthCorrectAnswer(q.correctAnswer ?? 0);
    setAuthExplanation(q.explanation || '');
    setAuthSubtopic(q.subtopic || '');
    setAuthDifficulty((q.difficulty || 'normal').toLowerCase() as any);
    setAuthQuestionType(q.questionType || 'conceptual');
    setAuthCodeSnippet(q.codeSnippet || '');
    setAuthMarks(q.marks || 1);
    setAuthIsApproved(q.isApproved ?? true);
    setIsAuthoringModalOpen(true);
  };

  const handleSaveAuthoredQuestion = () => {
    if (!authText.trim()) {
      alert('Please enter the question description.');
      return;
    }
    if (!authOptionA.trim() || !authOptionB.trim() || !authOptionC.trim() || !authOptionD.trim()) {
      alert('Please fill out all 4 options (A, B, C, and D).');
      return;
    }

    const questionData: Question = {
      id: authQuestionIndex !== null && generatedQuestions[authQuestionIndex]
        ? generatedQuestions[authQuestionIndex].id
        : `q_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      questionNumber: authQuestionIndex !== null ? authQuestionIndex + 1 : generatedQuestions.length + 1,
      text: authText.trim(),
      options: [authOptionA.trim(), authOptionB.trim(), authOptionC.trim(), authOptionD.trim()],
      correctAnswer: authCorrectAnswer,
      explanation: authExplanation.trim() || 'Verified answer key.',
      topic: formTopic || 'Custom Assessment',
      subtopic: authSubtopic.trim() || 'General',
      difficulty: authDifficulty,
      questionType: authQuestionType,
      codeSnippet: authCodeSnippet.trim() || undefined,
      isApproved: authIsApproved,
      marks: authMarks || 1,
      source: { type: 'admin_upload', title: 'Faculty Admin Authored' },
    };

    if (authQuestionIndex !== null) {
      // Editing existing question
      const updated = [...generatedQuestions];
      updated[authQuestionIndex] = questionData;
      setGeneratedQuestions(updated);
    } else {
      // Adding new question
      setGeneratedQuestions([...generatedQuestions, questionData]);
    }

    setIsAuthoringModalOpen(false);
  };

  const handleDuplicateQuestion = (index: number) => {
    const q = generatedQuestions[index];
    if (!q) return;
    const duplicated: Question = {
      ...q,
      id: `q_dup_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
      questionNumber: generatedQuestions.length + 1,
      text: `${q.text} (Copy)`,
      isApproved: true,
    };
    const next = [...generatedQuestions];
    next.splice(index + 1, 0, duplicated);
    setGeneratedQuestions(next);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= generatedQuestions.length) return;
    const next = [...generatedQuestions];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setGeneratedQuestions(next);
  };

  const handleDeleteQuestion = (index: number) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  const handleAddCustomQuestion = () => {
    handleOpenAddQuestionModal();
  };

  // Publish Exam to active student list
  const handlePublishExam = () => {
    if (generatedQuestions.length === 0) {
      alert('Please generate or add at least one question before publishing.');
      return;
    }

    // Auto-approve all questions upon official publication
    const approvedQuestions = generatedQuestions.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
      isApproved: true,
    }));

    const resolvedTitle = creationMode === 'pdf_upload'
      ? (pdfExamTitle.trim() || formTitle.trim())
      : formTitle.trim();
    const resolvedCode = creationMode === 'pdf_upload'
      ? (pdfExamCode.trim().toUpperCase() || formExamCode.trim().toUpperCase())
      : formExamCode.trim().toUpperCase();
    const resolvedSubject = creationMode === 'pdf_upload'
      ? (pdfSubject.trim() || formSubject.trim())
      : formSubject.trim();

    const newExam: Exam = {
      id: `exam_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: resolvedCode,
      title: resolvedTitle,
      subject: resolvedSubject,
      topic: formTopic.trim(),
      subtopics: formSubtopics.trim(),
      coverage: formCoverage.trim(),
      academicLevel: formAcademicLevel,
      targetBranch: formBranch,
      targetSection: formSection,
      targetYear: formYear,
      difficulty: creationMode === 'pdf_upload' ? pdfDifficulty : formDifficulty,
      durationMinutes: creationMode === 'pdf_upload' ? pdfDuration : formDuration,
      questions: approvedQuestions,
      totalMarks: (creationMode === 'pdf_upload' ? pdfMaxMarks : formMaxMarks) || approvedQuestions.length,
      additionalInstructions: formAdditionalInstructions.trim(),
      generationMode: creationMode === 'pdf_upload' ? 'research_informed' : (formGenerationMode as any),
      creationMethod: creationMode,
      pdfFilename: creationMode === 'pdf_upload' ? pdfFileName : undefined,
      facultySummary: facultySummary || undefined,
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
    setPublishFeedback(`✓ Assessment "${newExam.title}" (${newExam.code}) is now active with ${approvedQuestions.length} approved questions!`);
    setTimeout(() => setPublishFeedback(''), 8000);
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b pb-5 mb-6 border-white/10 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span>Assessment Creator & Multi-Mode Engine</span>
                  </h2>
                  <p className="text-xs opacity-60 mt-1">
                    Generate exams via Master AI Prompt, Upload Syllabus PDF, or Author & Approve Custom Tests manually.
                  </p>
                </div>

                {/* 3 Creation Mode Selector */}
                <div
                  className={`flex items-center p-1 rounded-2xl border text-xs font-semibold ${
                    isDark ? 'bg-black/40 border-white/15' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setCreationMode('ai_topic')}
                    className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      creationMode === 'ai_topic'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md font-bold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Topic Generator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('pdf_upload')}
                    className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      creationMode === 'pdf_upload'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md font-bold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload PDF & AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('custom_admin')}
                    className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      creationMode === 'custom_admin'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-bold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Custom Test Builder</span>
                  </button>
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

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleVerifyApiKey}
                            disabled={isVerifyingKey || !aiApiKey.trim()}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isVerifyingKey ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Key className="w-3.5 h-3.5" />
                                <span>Verify Key</span>
                              </>
                            )}
                          </button>

                          {aiApiKey.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setAiApiKey('');
                                localStorage.removeItem('apogee_ai_api_key');
                                localStorage.removeItem('apogee_gemini_api_key');
                                setVerificationFeedback({
                                  tested: true,
                                  success: true,
                                  provider: 'Academic Engine',
                                  message: 'Switched to Built-In Academic Curriculum Engine (Free & Unlimited).',
                                });
                              }}
                              className="px-3 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-medium opacity-80 hover:opacity-100 transition-colors cursor-pointer"
                              title="Clear key and use the free built-in curriculum engine"
                            >
                              Reset / Use Free Engine
                            </button>
                          )}
                        </div>
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

              {/* CREATION MODE 1: AI TOPIC & CURRICULUM GENERATOR (Existing Master Prompt) */}
              {creationMode === 'ai_topic' && (
                <div>
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

                    {/* Subject & Academic Level */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="e.g. Computer Science & Engineering / Operating Systems"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Academic Level
                      </label>
                      <select
                        value={formAcademicLevel}
                        onChange={(e) => setFormAcademicLevel(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <option value="Undergraduate B.Tech">Undergraduate B.Tech / B.E.</option>
                        <option value="Postgraduate M.Tech">Postgraduate M.Tech / M.S.</option>
                        <option value="Diploma Polytechnic">Diploma / Polytechnic</option>
                        <option value="University Final Examination">University Final Examination</option>
                        <option value="Laboratory Practical Exam">Laboratory Practical Exam</option>
                      </select>
                    </div>

                    {/* Main Topic Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Main Topic (Syllabus Foundation)
                      </label>
                      <input
                        type="text"
                        value={formTopic}
                        onChange={(e) => setFormTopic(e.target.value)}
                        placeholder="e.g. Operating Systems: Deadlocks & Process Synchronization"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Topics to Cover / Scope Range */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Topics to Cover / Scope ("Where to where it needs to cover")
                      </label>
                      <textarea
                        rows={2}
                        value={formCoverage}
                        onChange={(e) => setFormCoverage(e.target.value)}
                        placeholder="Describe specific bounds e.g. From Banker's Algorithm and Semaphore Mutex to Peterson's solution, memory paging, and deadlock recovery"
                        className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Subtopics */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Subtopics (Comma-separated for balanced distribution across modules)
                      </label>
                      <input
                        type="text"
                        value={formSubtopics}
                        onChange={(e) => setFormSubtopics(e.target.value)}
                        placeholder="e.g. Coffman Conditions, Safe State Calculation, Mutex vs Semaphore, Thrashing, Page Replacement"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                        <option value="Electrical & Electronics Eng">Electrical & Electronics Eng</option>
                        <option value="Civil Engineering">Civil Engineering</option>
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

                    {/* Difficulty & Generation Mode */}
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
                        <option value="Easy">Easy (Foundational & Definitions)</option>
                        <option value="Normal">Normal (Conceptual & Basic Application)</option>
                        <option value="Medium">Medium (Multi-step Reasoning & Scenarios)</option>
                        <option value="Hard">Hard (Deep Reasoning, Debugging & Synthesis)</option>
                        <option value="AI Choice">AI Choice (Auto-Balanced: 20% Easy, 25% Norm, 35% Med, 20% Hard)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Generation Mode
                      </label>
                      <select
                        value={formGenerationMode}
                        onChange={(e) => setFormGenerationMode(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <option value="ai_generated">MODE 1: AI Generated (100% Original formulation)</option>
                        <option value="research_informed">MODE 2: Research Informed (Curriculum & Textbook ground)</option>
                        <option value="admin_question_bank">MODE 3: Custom / Uploaded Material</option>
                      </select>
                    </div>

                    {/* MCQs count, Max Marks, Duration */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          No. of MCQs ({formCount})
                        </label>
                        <select
                          value={formCount}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormCount(val);
                            setFormMaxMarks(val);
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        >
                          <option value={5}>5 Questions</option>
                          <option value={10}>10 Questions</option>
                          <option value={15}>15 Questions</option>
                          <option value={20}>20 Questions</option>
                          <option value={25}>25 Questions</option>
                          <option value={30}>30 Questions</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          Max Marks
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formMaxMarks}
                          onChange={(e) => setFormMaxMarks(Number(e.target.value))}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
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

                    {/* Additional Instructions */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Additional Instructions / Custom Focus
                      </label>
                      <input
                        type="text"
                        value={formAdditionalInstructions}
                        onChange={(e) => setFormAdditionalInstructions(e.target.value)}
                        placeholder="e.g. Focus on practical lab scenarios, include code output and debugging"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-indigo-400 font-medium">
                      {generationNotice || 'Click below to synthesize questions according to Master Prompt.'}
                    </div>

                    <button
                      onClick={handleGenerateQuestions}
                      disabled={isGeneratingAI}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Synthesizing Exam Paper...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate {formCount} MCQs with Master AI Engine</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CREATION MODE 2: PDF UPLOAD & QUESTION GENERATION WITH DIFFICULTY LEVELS */}
              {creationMode === 'pdf_upload' && (
                <div className="space-y-6">
                  {/* Upload Box */}
                  <div
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all ${
                      pdfFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : isDark
                        ? 'border-white/20 bg-white/5 hover:border-indigo-500/50'
                        : 'border-slate-300 bg-slate-50 hover:border-indigo-500'
                    }`}
                  >
                    <input
                      type="file"
                      id="pdfUploadInput"
                      accept=".pdf,.txt,.md"
                      onChange={handlePdfFileUpload}
                      className="hidden"
                    />

                    {!pdfFile ? (
                      <label
                        htmlFor="pdfUploadInput"
                        className="flex flex-col items-center justify-center text-center cursor-pointer py-6"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 border border-indigo-500/30">
                          <Upload className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold mb-1">
                          Click to Browse or Drag & Drop Syllabus / Material PDF
                        </h3>
                        <p className="text-xs opacity-70 max-w-md">
                          Upload course syllabus, lecture slides, unit notes, or textbook chapters (.pdf, .txt, .md).
                          The AI will extract all topics and formulate rigorous MCQs.
                        </p>
                        <span className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/30">
                          Select PDF Document
                        </span>
                      </label>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm">{pdfFileName}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                                {isExtractingPdf ? 'EXTRACTING TEXT...' : 'PROCESSED & READY'}
                              </span>
                            </div>
                            <p className="text-xs opacity-75 mt-0.5">
                              Size: <strong>{pdfFileSize}</strong> • Pages: <strong>{pdfPages}</strong> • Extracted Characters: <strong>{pdfCharCount.toLocaleString()}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {pdfCharCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowPdfTextPreview(!showPdfTextPreview)}
                              className="px-3 py-1.5 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{showPdfTextPreview ? 'Hide Text' : 'Preview Extracted Text'}</span>
                            </button>
                          )}
                          <label
                            htmlFor="pdfUploadInput"
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Change PDF
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Collapsible Extracted Text Preview Drawer */}
                    {showPdfTextPreview && pdfText && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">
                            Extracted Content from {pdfFileName} ({pdfCharCount.toLocaleString()} characters)
                          </span>
                          <span className="text-[10px] opacity-60">First 3,000 characters shown</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono opacity-85 whitespace-pre-wrap leading-relaxed">
                          {pdfText.slice(0, 3000)}
                          {pdfText.length > 3000 && '\n\n... [remaining characters preserved for AI question generation]'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Difficulty Level Configurator (Feature 1 Requirement) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider opacity-90">
                        Target Question Difficulty Level
                      </label>
                      <span className="text-xs text-indigo-400 font-medium">
                        Controls cognitive complexity of questions generated from PDF
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                      {[
                        {
                          level: 'Easy' as ExamDifficulty,
                          title: 'Easy Level',
                          desc: 'Definitions, terminology, and direct principles from PDF',
                        },
                        {
                          level: 'Normal' as ExamDifficulty,
                          title: 'Normal Level',
                          desc: 'Core conceptual understanding & mechanism explanation',
                        },
                        {
                          level: 'Medium' as ExamDifficulty,
                          title: 'Medium Level',
                          desc: 'Multi-step deduction, scenarios & applied problems',
                        },
                        {
                          level: 'Hard' as ExamDifficulty,
                          title: 'Hard Level',
                          desc: 'Deep analytical synthesis, edge cases & diagnostic reasoning',
                        },
                        {
                          level: 'AI Choice' as ExamDifficulty,
                          title: 'AI Choice (Mixed)',
                          desc: 'Curriculum-balanced: 20% Easy, 25% Norm, 35% Med, 20% Hard',
                        },
                      ].map((item) => {
                        const isSelected = pdfDifficulty === item.level;
                        return (
                          <button
                            key={item.level}
                            type="button"
                            onClick={() => setPdfDifficulty(item.level)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50 text-white'
                                : isDark
                                ? 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs">{item.title}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                            <p className="text-[11px] opacity-75 leading-snug">{item.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PDF Assessment Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Exam Title */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Assessment Title (From PDF)
                      </label>
                      <input
                        type="text"
                        value={pdfExamTitle}
                        onChange={(e) => setPdfExamTitle(e.target.value)}
                        placeholder="e.g. Operating Systems: Kernel Synchronization & Semaphores"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Exam Code */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Exam Code
                      </label>
                      <input
                        type="text"
                        value={pdfExamCode}
                        onChange={(e) => setPdfExamCode(e.target.value.toUpperCase())}
                        placeholder="e.g. PDF-CSE-201"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Question Count */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Number of Questions
                      </label>
                      <select
                        value={pdfQuestionCount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPdfQuestionCount(val);
                          setPdfMaxMarks(val);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <option value={5}>5 Questions</option>
                        <option value={10}>10 Questions</option>
                        <option value={15}>15 Questions</option>
                        <option value={20}>20 Questions</option>
                        <option value={25}>25 Questions</option>
                        <option value={30}>30 Questions</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={pdfDuration}
                        onChange={(e) => setPdfDuration(Number(e.target.value))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Max Marks */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Max Marks
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={pdfMaxMarks}
                        onChange={(e) => setPdfMaxMarks(Number(e.target.value))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Target Branch */}
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
                        <option value="Electrical & Electronics Eng">Electrical & Electronics Eng</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                      </select>
                    </div>

                    {/* Section & Year */}
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

                    {/* Specific Focus in PDF */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Specific Focus / Chapter Bounds
                      </label>
                      <input
                        type="text"
                        value={pdfSpecificFocus}
                        onChange={(e) => setPdfSpecificFocus(e.target.value)}
                        placeholder="e.g. Focus on Section 3 memory paging & TLB cache"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Generate Button for PDF */}
                  <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-indigo-400 font-medium">
                      {pdfExtractionNotice || 'Upload a PDF syllabus or notes above to generate questions.'}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateQuestionsFromPdf}
                      disabled={isGeneratingAI || !pdfText.trim()}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-600/30 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAI ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating from PDF ({pdfDifficulty})...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate {pdfQuestionCount} MCQs from PDF ({pdfDifficulty} Level)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CREATION MODE 3: CUSTOM TEST BUILDER (MANUAL QUESTION AUTHORING & APPROVAL) */}
              {creationMode === 'custom_admin' && (
                <div className="space-y-6">
                  {/* Test Details Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Custom Assessment Title
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Advanced Operating Systems Faculty Custom Examination"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Exam Code
                      </label>
                      <input
                        type="text"
                        value={formExamCode}
                        onChange={(e) => setFormExamCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CSE-CUSTOM-301"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Subject / Domain
                      </label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        placeholder="e.g. Computer Science & Engineering"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

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
                        <option value="Electrical & Electronics Eng">Electrical & Electronics Eng</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={formMaxMarks || generatedQuestions.length}
                          onChange={(e) => setFormMaxMarks(Number(e.target.value))}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Test Action Toolbar & Live Approval Counter */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Faculty Test Questions Bank</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                          {generatedQuestions.filter((q) => q.isApproved).length} / {generatedQuestions.length} APPROVED FOR TEST
                        </span>
                      </div>
                      <p className="text-xs opacity-75 mt-0.5">
                        Author your questions manually below, review each question, and approve them for inclusion in the official test.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenAddQuestionModal}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Author / Add Question</span>
                      </button>

                      {generatedQuestions.length > 0 && (
                        <button
                          type="button"
                          onClick={handleApproveAllQuestions}
                          className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Approve All</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Empty state if no questions yet in Custom Test */}
                  {generatedQuestions.length === 0 && (
                    <div
                      className={`p-8 rounded-2xl border text-center ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
                        <Edit3 className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-base mb-1">No Questions Added to this Test Yet</h4>
                      <p className="text-xs opacity-70 max-w-md mx-auto mb-4">
                        You can manually author your own questions one by one with options, correct answer keys, and explanations, or generate questions via AI Topic or Uploaded PDF and review & approve them here!
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleOpenAddQuestionModal}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Author First Question</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreationMode('pdf_upload')}
                          className="px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileUp className="w-3.5 h-3.5 text-purple-400" />
                          <span>Generate from PDF instead</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FACULTY REVIEW SUMMARY & QUESTIONS PREVIEW AREA (Section 48 & 49) */}
            {generatedQuestions.length > 0 && (
              <div className="space-y-6">
                {/* Faculty Review Summary Card (Master Prompt Section 48 & Approval Workflow) */}
                <div
                  className={`rounded-3xl p-6 sm:p-7 backdrop-blur-xl border ${
                    isDark ? 'bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/60 border-indigo-500/30' : 'bg-indigo-50/70 border-indigo-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                          Faculty Questions Review & Approval
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold ${
                            generatedQuestions.filter((q) => q.isApproved).length === generatedQuestions.length
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {generatedQuestions.filter((q) => q.isApproved).length} / {generatedQuestions.length} APPROVED FOR TEST
                        </span>
                      </div>
                      <p className="text-xs opacity-75">
                        Subject: <strong className="text-white">{creationMode === 'pdf_upload' ? pdfSubject : formSubject}</strong> • Topic: <strong className="text-white">{creationMode === 'pdf_upload' ? (pdfExamTitle || pdfFileName) : formTopic}</strong> • Questions: <strong>{generatedQuestions.length}</strong> • Max Marks: <strong>{(creationMode === 'pdf_upload' ? pdfMaxMarks : formMaxMarks) || generatedQuestions.length}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenAddQuestionModal}
                        className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Author Question</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApproveAllQuestions}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Approve all questions in this batch for the test"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve All</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePublishExam}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve & Publish Test</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                    {/* 1. Difficulty Breakdown */}
                    <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="font-bold text-[11px] uppercase tracking-wider text-indigo-400 mb-2">
                        Difficulty Balance
                      </div>
                      <div className="space-y-1">
                        {['easy', 'normal', 'medium', 'hard'].map((d) => {
                          const count = generatedQuestions.filter((q) => (q.difficulty || 'normal').toLowerCase() === d).length;
                          return (
                            <div key={d} className="flex justify-between items-center opacity-85">
                              <span className="capitalize">{d}:</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/5">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Topic Coverage Breakdown */}
                    <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="font-bold text-[11px] uppercase tracking-wider text-purple-400 mb-2">
                        Topic Distribution
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {Array.from(new Set(generatedQuestions.map((q) => q.subtopic || q.topic || 'Core Module'))).map((t) => {
                          const count = generatedQuestions.filter((q) => (q.subtopic || q.topic) === t).length;
                          return (
                            <div key={t} className="flex justify-between items-center opacity-85 text-[11px]">
                              <span className="truncate max-w-[130px]" title={t}>{t}</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/5">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Question Type Breakdown */}
                    <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="font-bold text-[11px] uppercase tracking-wider text-cyan-400 mb-2">
                        Taxonomy & Types
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[11px]">
                        {Array.from(new Set(generatedQuestions.map((q) => q.questionType || 'conceptual'))).map((type) => {
                          const count = generatedQuestions.filter((q) => (q.questionType || 'conceptual') === type).length;
                          return (
                            <div key={type} className="flex justify-between items-center opacity-85 capitalize">
                              <span>{type.replace('_', ' ')}:</span>
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/5">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Approval & Security Status */}
                    <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'}`}>
                      <div className="font-bold text-[11px] uppercase tracking-wider text-emerald-400 mb-2">
                        Approval & Security
                      </div>
                      <div className="space-y-1 text-[11px] opacity-85">
                        <div className="flex items-center justify-between">
                          <span>Faculty Approved:</span>
                          <span className="font-bold text-emerald-400 font-mono">
                            {generatedQuestions.filter((q) => q.isApproved).length} / {generatedQuestions.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                          <span>4 Options Unambiguous Key</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                          <span>Server Answer Security</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                          <span>Student Jumble Enabled</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Filter & Counter Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Filter:</span>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setQuestionFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          questionFilter === 'all'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        All ({generatedQuestions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionFilter('approved')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          questionFilter === 'approved'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'opacity-70 hover:opacity-100 text-emerald-300'
                        }`}
                      >
                        Approved ({generatedQuestions.filter((q) => q.isApproved).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionFilter('pending')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          questionFilter === 'pending'
                            ? 'bg-amber-600 text-white font-bold'
                            : 'opacity-70 hover:opacity-100 text-amber-300'
                        }`}
                      >
                        Pending ({generatedQuestions.filter((q) => !q.isApproved).length})
                      </button>
                    </div>
                  </div>

                  <div className="text-xs opacity-75">
                    Click <strong>"Approve for Test"</strong> on any question to confirm its inclusion.
                  </div>
                </div>

                {/* Generated Question Cards */}
                <div className="space-y-4">
                  {generatedQuestions
                    .map((q, originalIdx) => ({ q, originalIdx }))
                    .filter(({ q }) => {
                      if (questionFilter === 'approved') return !!q.isApproved;
                      if (questionFilter === 'pending') return !q.isApproved;
                      return true;
                    })
                    .map(({ q, originalIdx }) => (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          q.isApproved
                            ? isDark
                              ? 'bg-white/5 border-emerald-500/30'
                              : 'bg-emerald-50/20 border-emerald-200'
                            : isDark
                            ? 'bg-white/5 border-white/10'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs uppercase px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                              Q{originalIdx + 1}
                            </span>

                            {/* "Approve for Test" Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleApproveQuestion(originalIdx)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                q.isApproved
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                              }`}
                              title={q.isApproved ? 'Click to mark as pending' : 'Click to approve for test'}
                            >
                              {q.isApproved ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Approved for Test</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Approve for Test</span>
                                </>
                              )}
                            </button>

                            {q.questionType && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                                {q.questionType.replace('_', ' ')}
                              </span>
                            )}
                            {q.subtopic && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                {q.subtopic}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 opacity-75 capitalize">
                              {q.difficulty || 'normal'}
                            </span>
                            {q.source?.title && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/25 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{q.source.title}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Edit Question */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestionModal(originalIdx)}
                              className="px-2.5 py-1 rounded-lg border border-white/15 hover:bg-white/10 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100 transition-colors cursor-pointer"
                              title="Edit this question and options"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {/* Duplicate Question */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(originalIdx)}
                              className="p-1 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                              title="Duplicate Question"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Move Up */}
                            {originalIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(originalIdx, 'up')}
                                className="p-1 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                                title="Move Earlier"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Move Down */}
                            {originalIdx < generatedQuestions.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(originalIdx, 'down')}
                                className="p-1 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                                title="Move Later"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Regenerate Single Question (AI) */}
                            {creationMode !== 'custom_admin' && (
                              <button
                                type="button"
                                onClick={() => handleRegenerateSingleQuestion(originalIdx)}
                                disabled={regeneratingIndex === originalIdx}
                                className="px-2 py-1 rounded-lg border border-white/15 hover:bg-white/10 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100 transition-colors cursor-pointer"
                                title="Regenerate this individual question with alternative formulation"
                              >
                                <RefreshCw className={`w-3 h-3 ${regeneratingIndex === originalIdx ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{regeneratingIndex === originalIdx ? 'Regen...' : 'Regen'}</span>
                              </button>
                            )}

                            {/* Delete Question */}
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(originalIdx)}
                              className="text-rose-400 hover:text-rose-300 p-1 opacity-70 hover:opacity-100 cursor-pointer"
                              title="Remove Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="font-medium text-sm mb-3 leading-relaxed">{q.text}</p>

                        {q.codeSnippet && (
                          <div className="mb-3 p-3 rounded-lg bg-black/60 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre border border-white/5">
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
                              <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-bold shrink-0">
                                {['A', 'B', 'C', 'D'][optI]}
                              </span>
                              <span>{opt}</span>
                              {optI === q.correctAnswer && (
                                <span className="ml-auto text-[10px] uppercase font-bold text-emerald-400 shrink-0">
                                  Correct Key
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <div className="mt-3 text-[11px] opacity-75 italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <strong>Academic Rationale:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Custom Question Authoring / Edit Modal */}
            {isAuthoringModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                <div
                  className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 border shadow-2xl ${
                    isDark ? 'bg-slate-900 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-4 mb-4 border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold">
                        {authQuestionIndex !== null
                          ? `Edit Question #${authQuestionIndex + 1}`
                          : 'Author New Question for Test'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAuthoringModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Question Text */}
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Question Description / Statement *
                      </label>
                      <textarea
                        rows={3}
                        value={authText}
                        onChange={(e) => setAuthText(e.target.value)}
                        placeholder="Enter the complete question problem or scenario..."
                        className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* 4 Options & Correct Answer Selector */}
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Answer Options (Select which one is the correct key) *
                      </label>
                      <div className="space-y-2.5">
                        {[
                          { key: 0, label: 'Option A', val: authOptionA, setter: setAuthOptionA },
                          { key: 1, label: 'Option B', val: authOptionB, setter: setAuthOptionB },
                          { key: 2, label: 'Option C', val: authOptionC, setter: setAuthOptionC },
                          { key: 3, label: 'Option D', val: authOptionD, setter: setAuthOptionD },
                        ].map((opt) => (
                          <div
                            key={opt.key}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                              authCorrectAnswer === opt.key
                                ? 'border-emerald-500/60 bg-emerald-500/10'
                                : isDark
                                ? 'border-white/10 bg-black/20'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setAuthCorrectAnswer(opt.key)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-all ${
                                authCorrectAnswer === opt.key
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                  : 'bg-white/10 opacity-70 hover:opacity-100'
                              }`}
                              title="Click to mark as correct answer"
                            >
                              {['A', 'B', 'C', 'D'][opt.key]}
                            </button>
                            <input
                              type="text"
                              value={opt.val}
                              onChange={(e) => opt.setter(e.target.value)}
                              placeholder={`Enter text for ${opt.label}...`}
                              className={`flex-1 px-3 py-1.5 rounded-lg text-xs bg-transparent border-0 focus:outline-none ${
                                isDark ? 'text-white' : 'text-slate-800'
                              }`}
                            />
                            {authCorrectAnswer === opt.key && (
                              <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 shrink-0">
                                Correct Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Explanation / Answer Key Rationale
                      </label>
                      <textarea
                        rows={2}
                        value={authExplanation}
                        onChange={(e) => setAuthExplanation(e.target.value)}
                        placeholder="Explain why the selected option is correct according to academic curriculum..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>

                    {/* Taxonomy, Difficulty, Subtopic */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          Difficulty Level
                        </label>
                        <select
                          value={authDifficulty}
                          onChange={(e) => setAuthDifficulty(e.target.value as any)}
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDark ? 'bg-slate-800 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        >
                          <option value="easy">Easy (Definitions & Recall)</option>
                          <option value="normal">Normal (Conceptual Understanding)</option>
                          <option value="medium">Medium (Applied Analysis)</option>
                          <option value="hard">Hard (Advanced Reasoning)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          Question Type
                        </label>
                        <select
                          value={authQuestionType}
                          onChange={(e) => setAuthQuestionType(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDark ? 'bg-slate-800 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        >
                          <option value="conceptual">Conceptual</option>
                          <option value="application">Application-Based</option>
                          <option value="scenario">Scenario-Based</option>
                          <option value="numerical">Numerical / Formula</option>
                          <option value="debugging">Code / Debugging</option>
                          <option value="practical_lab">Practical Lab</option>
                          <option value="definition">Definition</option>
                          <option value="comparison">Comparison</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                          Subtopic Tag
                        </label>
                        <input
                          type="text"
                          value={authSubtopic}
                          onChange={(e) => setAuthSubtopic(e.target.value)}
                          placeholder="e.g. Memory Paging"
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            isDark ? 'bg-black/40 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Optional Code Snippet */}
                    <div>
                      <label className="block font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Code Snippet or Technical Scenario (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={authCodeSnippet}
                        onChange={(e) => setAuthCodeSnippet(e.target.value)}
                        placeholder="Optional code block or mathematical equation..."
                        className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          isDark ? 'bg-black/60 border-white/15 text-emerald-400' : 'bg-slate-900 border-slate-300 text-emerald-300'
                        }`}
                      />
                    </div>

                    {/* Approval Checkbox */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="authApprovedCheck"
                        checked={authIsApproved}
                        onChange={(e) => setAuthIsApproved(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="authApprovedCheck" className="text-xs font-semibold cursor-pointer">
                        Approve this question for the test immediately
                      </label>
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsAuthoringModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAuthoredQuestion}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{authQuestionIndex !== null ? 'Save Changes' : 'Add Question to Test'}</span>
                    </button>
                  </div>
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
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                            {exam.code}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 opacity-80">
                            {exam.targetBranch} • {exam.targetSection} • {exam.targetYear}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                            {exam.difficulty}
                          </span>
                          {exam.creationMethod === 'pdf_upload' || exam.pdfFilename ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>PDF: {exam.pdfFilename || 'Uploaded Document'}</span>
                            </span>
                          ) : exam.creationMethod === 'custom_admin' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Edit3 className="w-3 h-3" />
                              <span>Custom Faculty Test</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>AI Topic Exam</span>
                            </span>
                          )}
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
