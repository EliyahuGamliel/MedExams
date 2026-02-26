import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, set, onValue, push, update, remove } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';

import UsersTab from './UsersTab';
import ReportsTab from './ReportsTab';
import ManageCoursesTab from './ManageCoursesTab';
import BulkUploadTab from './BulkUploadTab';
import ManageExamsTab from './ManageExamsTab';
import UploadTab from './UploadTab';
import { useAdminAuth } from './useAdminAuth';
import { useCoursesLogic } from './useCoursesLogic';

// --- אייקונים ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const BulkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2 14 8 20 8" /><path d="M2 15h10" /><path d="m9 18 3-3-3-3" /></svg>;

export default function AdminPage() {



  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  const examYearsList = Array.from({ length: 16 }, (_, i) => (2012 + i).toString());
  const moedList = ["מועד א'", "מועד ב'", "מועד מיוחד"];

  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStudentYear, setSelectedStudentYear] = useState("שנה א'");
  const [selectedSemester, setSelectedSemester] = useState("סמסטר א'");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [examYear, setExamYear] = useState("2026");
  const [examMoed, setExamMoed] = useState("מועד א'");
  const [file, setFile] = useState(null);
  const [appendicesFile, setAppendicesFile] = useState(null);
  const [parsingMode, setParsingMode] = useState('standard');
  const [editingExamId, setEditingExamId] = useState(null);
  const [newAppendicesFile, setNewAppendicesFile] = useState(null);
  const [questionsEditorId, setQuestionsEditorId] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);
  const [examsList, setExamsList] = useState([]);
  const [status, setStatus] = useState('idle');
  const [debugLog, setDebugLog] = useState("");

  const [reportsList, setReportsList] = useState([]);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [newQuestionOptionsCount, setNewQuestionOptionsCount] = useState(4);

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  const {
    user, userData, isAdminLogin, authLoading, allUsers,
    handleGoogleLogin, handleLogout, handleUpdateUserRole,
    handleToggleUserYear, handleDeleteUser, canEditYear
  } = useAdminAuth();

  const {
    coursesList, newCourseName, setNewCourseName,
    editingCourseOldData, setEditingCourseOldData,
    editCourseName, setEditCourseName,
    editCourseYear, setEditCourseYear,
    editCourseSemester, setEditCourseSemester,
    handleAddCourse, startEditingCourse, handleUpdateCourse
  } = useCoursesLogic(canEditYear, examsList, setStatus, selectedStudentYear, selectedSemester);

  // ==========================================
  // פונקציות עריכת שאלות
  // ==========================================
  const handleAddQuestion = async () => {
    if (!questionsEditorId) return;
    const initialOptions = Array.from({ length: newQuestionOptionsCount }, (_, i) => `אפשרות ${i + 1}`);
    const newIndex = examQuestions.length;
    const newQuestion = {
      id: newIndex, text: "שאלה חדשה... (לחץ כדי לערוך)", type: "multiple_choice",
      options: initialOptions, correctIndex: 0, imageNeeded: false, hasImage: false, isCanceled: false
    };

    const updatedQuestions = [...examQuestions, newQuestion];
    setExamQuestions(updatedQuestions);

    const updates = {};
    updates[`exam_contents/${questionsEditorId}`] = updatedQuestions;
    updates[`uploaded_exams/${questionsEditorId}/questionCount`] = updatedQuestions.length;
    await update(ref(db), updates);
    setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: updatedQuestions.length } : e));
  };

  const handleDeleteQuestion = async (idxToDelete) => {
    if (!window.confirm("האם למחוק שאלה זו לצמיתות?")) return;
    const filtered = examQuestions.filter((_, i) => i !== idxToDelete);
    const reindexedQuestions = filtered.map((q, i) => ({ ...q, id: i }));
    setExamQuestions(reindexedQuestions);

    const updates = {};
    updates[`exam_contents/${questionsEditorId}`] = reindexedQuestions;
    updates[`uploaded_exams/${questionsEditorId}/questionCount`] = reindexedQuestions.length;
    await update(ref(db), updates);
    setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: reindexedQuestions.length } : e));
  };

  const handleAddOptionToQuestion = async (qIdx) => {
    const updated = [...examQuestions];
    const currentOpts = updated[qIdx].options || [];
    updated[qIdx].options = [...currentOpts, `אפשרות ${currentOpts.length + 1}`];
    setExamQuestions(updated);
    await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/options`), updated[qIdx].options);
  };

  const handleRemoveOptionFromQuestion = async (qIdx, optIdx) => {
    const updated = [...examQuestions];
    const currentOpts = updated[qIdx].options;
    if (currentOpts.length <= 2) return alert("חייבות להיות לפחות 2 אפשרויות.");

    updated[qIdx].options = currentOpts.filter((_, i) => i !== optIdx);
    let currentCorrect = updated[qIdx].correctIndex;
    if (Array.isArray(currentCorrect)) {
      updated[qIdx].correctIndex = currentCorrect.filter(i => i !== optIdx).map(i => i > optIdx ? i - 1 : i);
    } else {
      if (currentCorrect === optIdx) updated[qIdx].correctIndex = 0;
      else if (currentCorrect > optIdx) updated[qIdx].correctIndex = currentCorrect - 1;
    }
    setExamQuestions(updated);
    await update(ref(db, `exam_contents/${questionsEditorId}/${qIdx}`), {
      options: updated[qIdx].options, correctIndex: updated[qIdx].correctIndex
    });
  };

  const handleQuestionTextChange = (idx, newText) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], text: newText };
      return updated;
    });
  };
  const saveQuestionText = async (idx, textToSave) => {
    await set(ref(db, `exam_contents/${questionsEditorId}/${idx}/text`), textToSave);
  };

  const handleOptionTextChange = (qIdx, optIdx, newText) => {
    setExamQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIdx] };
      const newOptions = [...q.options];
      newOptions[optIdx] = newText;
      q.options = newOptions;
      updated[qIdx] = q;
      return updated;
    });
  };
  const saveOptionText = async (qIdx, optIdx, textToSave) => {
    await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/options/${optIdx}`), textToSave);
  };

  const handleUploadQuestionImage = async (idx, f) => {
    if (!questionsEditorId) return;
    try {
      setStatus('processing');
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, initialQuality: 0.7 };
      const compressedFile = await imageCompression(f, options);
      const storage = getStorage();
      const fileRef = storageRef(storage, `exam_images/${questionsEditorId}/${idx}_${Date.now()}`);
      await uploadBytes(fileRef, compressedFile);
      const downloadURL = await getDownloadURL(fileRef);

      const updates = {};
      updates[`exam_contents/${questionsEditorId}/${idx}/imageUrl`] = downloadURL;
      updates[`exam_contents/${questionsEditorId}/${idx}/hasImage`] = true;
      await update(ref(db), updates);

      setExamQuestions(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], imageUrl: downloadURL, hasImage: true };
        return updated;
      });
      setStatus('idle');
    } catch (e) { alert(e.message); setStatus('idle'); }
  };

  const handleSetMainCorrect = async (idx, optIdx, isMultiSelectMode = false) => {
    const q = examQuestions[idx];
    let currentCorrect = q.correctIndex;
    let newCorrect;

    if (isMultiSelectMode) {
      let arr = [];
      if (Array.isArray(currentCorrect)) arr = [...currentCorrect];
      else if (typeof currentCorrect === 'number') arr = [currentCorrect];

      if (arr.includes(optIdx)) arr = arr.filter(i => i !== optIdx);
      else arr.push(optIdx);

      arr.sort((a, b) => a - b);
      newCorrect = arr.length === 1 ? arr[0] : arr.length === 0 ? null : arr;
    } else {
      newCorrect = optIdx;
    }
    setExamQuestions(prev => {
      const updated = [...prev];
      updated[idx].correctIndex = newCorrect;
      return updated;
    });
    await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { correctIndex: newCorrect });
  };

  const handleToggleAppeal = async (idx, optIdx) => {
    const q = examQuestions[idx];
    const cur = q.appealedIndexes || [];
    const newer = cur.includes(optIdx) ? cur.filter(i => i !== optIdx) : [...cur, optIdx];
    await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { appealedIndexes: newer });
    setExamQuestions(p => { const n = [...p]; n[idx].appealedIndexes = newer; return n; });
  };
  const handleToggleCancel = async (idx) => {
    const ns = !examQuestions[idx].isCanceled;
    await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { isCanceled: ns });
    setExamQuestions(p => { const n = [...p]; n[idx].isCanceled = ns; return n; });
  };

  // ==========================================
  // פונקציות העלאה וניהול מבחנים
  // ==========================================
  const handleResolveReport = async (reportId) => {
    try { await set(ref(db, `reported_errors/${reportId}`), null); } catch (e) { }
  };

  const handleNavigateToReportedQuestion = (examId) => {
    setActiveTab('manage_exams');
    const examToEdit = examsList.find(e => e.id === examId);
    if (examToEdit) {
      setSelectedStudentYear(examToEdit.studentYear);
      setSelectedSemester(examToEdit.semester);
      setSelectedCourseId(examToEdit.courseId);
      // נותנים לסטייטים של הריאקט רגע להתעדכן לפני שפותחים את העורך
      setTimeout(() => openQuestionsEditor(examToEdit), 500);
    } else {
      alert("המבחן נמחק או שלא ניתן למצוא אותו.");
    }
  };

  const fileToBase64 = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(file); });

  const handleUploadExam = async () => {
    if (!file) return alert("אנא בחר קובץ PDF");
    if (!selectedCourseId) return alert("אנא בחר קורס");
    if (!canEditYear(selectedStudentYear)) return alert("אין הרשאה להעלאה לשנה זו");

    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;
    setStatus('processing'); setDebugLog(`מתחיל...`);

    try {
      const base64Data = await fileToBase64(file);
      let appendicesBase64 = null;
      if (appendicesFile) appendicesBase64 = await fileToBase64(appendicesFile);
      const functions = getFunctions();
      const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });
      const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: parsingMode });
      const questions = result.data.questions.map((q, idx) => ({ ...q, id: idx, type: q.type || 'multiple_choice', imageNeeded: q.imageNeeded || false, isCanceled: false, appealedIndexes: [] }));
      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');

      const updates = {};
      updates[`uploaded_exams/${examId}`] = {
        id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
        courseId: selectedCourseId, examYear, examMoed, title: `${examYear} - ${examMoed}`,
        questionCount: questions.length,
        hasAppendices: !!appendicesFile, parsingMode, uploadedAt: new Date().toISOString()
      };
      updates[`exam_contents/${examId}`] = questions;

      if (appendicesFile && appendicesBase64) {
        updates[`exam_appendices/${examId}`] = { fileData: appendicesBase64 };
      }

      await update(ref(db), updates);
      setStatus('success'); alert(`הועלה בהצלחה`); setFile(null); setAppendicesFile(null);
    } catch (e) { console.error(e); addLog("שגיאה: " + e.message); setStatus('idle'); }
  };

  const handleBulkUpload = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return alert("אנא בחר קבצים להעלאה.");
    if (!selectedCourseId) return alert("אנא בחר קורס לשיוך המבחנים.");

    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;

    if (!window.confirm(`האם אתה בטוח שברצונך להתחיל סריקה של ${bulkFiles.length} מבחנים לקורס "${courseName}"? התהליך ייקח כמה דקות, נא לא לסגור את החלון.`)) return;

    setStatus('processing');
    setDebugLog(`🚀 מתחיל תהליך אצווה עבור ${bulkFiles.length} קבצים...`);

    for (let i = 0; i < bulkFiles.length; i++) {
      const currentFile = bulkFiles[i];
      const filename = currentFile.name.toLowerCase();

      const yearMatch = filename.match(/(20\d{2})/);
      const extractedYear = yearMatch ? yearMatch[1] : "2026";

      let extractedMoed = "מועד א'";
      if (filename.includes("b")) extractedMoed = "מועד ב'";
      else if (filename.includes("c")) extractedMoed = "מועד מיוחד";

      addLog(`\n⏳ מעבד קובץ ${i + 1}/${bulkFiles.length}: ${currentFile.name}`);
      addLog(`   זוהה כשנה: ${extractedYear} | מועד: ${extractedMoed}`);

      try {
        const base64Data = await fileToBase64(currentFile);
        const functions = getFunctions();
        const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });
        const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: parsingMode });

        // --- התיקון נמצא כאן ---
        const questions = result.data.questions.map((q, idx) => ({
          ...q,
          id: idx,
          // פה אנחנו מכריחים אותו ליצור מפתח text, גם אם ג'מיני קרא לזה question
          text: q.text || q.question || "⚠️ שאלה זו הוחזרה ללא טקסט",
          type: q.type || 'multiple_choice',
          imageNeeded: q.imageNeeded || false,
          isCanceled: false,
          appealedIndexes: []
        }));

        const examId = `${courseName}_${extractedYear}_${extractedMoed}_${Date.now()}`.replace(/\s+/g, '_');

        const updates = {};
        updates[`uploaded_exams/${examId}`] = {
          id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
          courseId: selectedCourseId, examYear: extractedYear, examMoed: extractedMoed,
          title: `${extractedYear} - ${extractedMoed}`,
          questionCount: questions.length,
          hasAppendices: false, parsingMode, uploadedAt: new Date().toISOString()
        };
        updates[`exam_contents/${examId}`] = questions;

        await update(ref(db), updates);
        addLog(`✅ קובץ עבר בהצלחה ושומר במסד הנתונים!`);
      } catch (e) {
        console.error(`שגיאה בקובץ ${currentFile.name}:`, e);
        addLog(`❌ נכשל הקובץ ${currentFile.name}. מדלג לבא. שגיאה: ${e.message}`);
      }
    }

    setStatus('success');
    alert("🎉 סריקת האצווה הסתיימה! מומלץ לבדוק בלוגים אם היו שגיאות פרטניות.");
    setBulkFiles([]);
  };

  const handleUpdateAppendices = async (examId) => {
    if (!newAppendicesFile) return alert("בחר קובץ");
    try {
      setStatus('processing');
      const storage = getStorage();
      const fileRef = storageRef(storage, `exam_appendices/${examId}.pdf`);
      await uploadBytes(fileRef, newAppendicesFile);
      const downloadURL = await getDownloadURL(fileRef);
      await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: true });
      await set(ref(db, `exam_appendices/${examId}`), { fileUrl: downloadURL });
      alert("עודכן!"); setEditingExamId(null); setNewAppendicesFile(null); setStatus('idle');
    } catch (e) { alert(e.message); setStatus('idle'); }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("למחוק?")) return;
    try {
      setStatus('processing');
      const updates = {};
      updates[`uploaded_exams/${examId}`] = null;
      updates[`exam_contents/${examId}`] = null;
      updates[`exam_appendices/${examId}`] = null;
      updates[`exam_images/${examId}`] = null;
      await update(ref(db), updates);
      alert("נמחק."); setStatus('idle');
    } catch (e) { alert(e.message); setStatus('idle'); }
  };

  const openQuestionsEditor = async (exam) => {
    setQuestionsEditorId(exam.id);
    setEditingExamId(null);
    if (exam.questions && exam.questions.length > 0) {
      setExamQuestions(exam.questions);
      return;
    }
    setStatus('processing');
    try {
      const snapshot = await get(ref(db, `exam_contents/${exam.id}`));
      const questionsData = snapshot.val();
      setExamQuestions(questionsData || []);
    } catch (e) { alert("שגיאה בטעינת השאלות: " + e.message); } finally { setStatus('idle'); }
  };

  const getQuestionStatusColor = (q) => {
    if (q.isCanceled) return "bg-slate-100 border-slate-300 opacity-80";
    if (q.imageNeeded && !q.hasImage) return "bg-red-50 border-red-500 shadow-red-100";
    if (q.hasImage) return "bg-green-50 border-green-500 shadow-green-100";
    return "bg-white border-slate-200";
  };


  // ==========================================
  // משתני תצוגה
  // ==========================================
  const availableCourses = coursesList[selectedStudentYear]?.[selectedSemester] ? Object.entries(coursesList[selectedStudentYear][selectedSemester]) : [];
  const filteredExamsForEdit = selectedCourseId ? examsList.filter(exam => exam.courseId === selectedCourseId) : [];
  const filteredQuestions = showMissingImagesOnly ? examQuestions.filter(q => q.imageNeeded && !q.hasImage) : examQuestions;

  // ==========================================
  // רינדור המסכים
  // ==========================================
  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">בודק הרשאות...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">כניסה למנהלים</h2>
          <p className="text-center text-slate-400 mb-8 text-sm">הזן פרטי גישה כדי לנהל את המאגר</p>
          <button onClick={handleGoogleLogin} className="w-full bg-white text-slate-700 border border-slate-300 p-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            התחבר עם Google
          </button>
          <div className="mt-6 text-center border-t pt-6"><button onClick={() => window.location.href = '/'} className="text-slate-400 font-bold text-sm hover:text-slate-600 transition">חזור לאתר הראשי</button></div>
        </div>
      </div>
    );
  }

  if (user && !isAdminLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center px-4">
        <div className="text-5xl">⏳</div>
        <h2 className="text-xl font-bold text-slate-700">הבקשה בבדיקה</h2>
        <p className="text-slate-500 max-w-md">שלום <b>{user.email}</b>,<br />חשבונך נוצר בהצלחה!<br />כעת עליך להמתין שמנהל ראשי יאשר את הרשאותיך.</p>
        <div className="flex gap-4 mt-4">
          <button onClick={handleLogout} className="text-slate-500 font-bold border border-slate-300 px-4 py-2 rounded-lg hover:bg-white transition">התנתק</button>
          <button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition">חזרה לאתר</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      {/* מודאל עריכת קורס */}
      {editingCourseOldData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-800">עריכת קורס</h3>
            <input type="text" value={editCourseName} onChange={e => setEditCourseName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label><select value={editCourseYear} onChange={e => setEditCourseYear(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label><select value={editCourseSemester} onChange={e => setEditCourseSemester(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateCourse} disabled={status === 'processing'} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">{status === 'processing' ? 'שומר...' : 'שמור שינויים'}</button>
              <button onClick={() => setEditingCourseOldData(null)} className="px-6 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center">
        <button onClick={() => window.location.href = '/'} className="text-slate-500 font-bold hover:text-blue-600 transition">חזור לאתר</button>
        <div className="flex items-center gap-3">
          {userData?.role === 'super_admin' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Super Admin</span>}
          {userData?.role === 'editor' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">עורך {userData.allowed_years ? Object.keys(userData.allowed_years).join(', ') : ''}</span>}
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">{user.email}</span>
          <button onClick={handleLogout} className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition">התנתק</button>
        </div>
      </div>

      <div className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black mb-6 text-slate-800 text-center">ממשק ניהול</h2>

        {/* --- שורת הטאבים --- */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 overflow-x-auto">
          <button onClick={() => setActiveTab('upload')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><UploadIcon /> העלאה</button>
          <button onClick={() => setActiveTab('bulk')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'bulk' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><BulkIcon /> המונית</button>
          <button onClick={() => setActiveTab('manage_exams')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_exams' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}><EditIcon /> ניהול קיימים</button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}><PlusIcon /> קורסים</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'reports' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}><FlagIcon /> דיווחים {reportsList.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-1">{reportsList.length}</span>}</button>
          {userData?.role === 'super_admin' && <button onClick={() => setActiveTab('users')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'users' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}><UsersIcon /> משתמשים</button>}
        </div>

        {/* --- טאב ניהול משתמשים --- */}
        {activeTab === 'users' && userData?.role === 'super_admin' && (
          <UsersTab
            allUsers={allUsers}
            currentUser={user}
            studentYears={studentYears}
            onUpdateRole={handleUpdateUserRole}
            onToggleYear={handleToggleUserYear}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {/* --- טאב דיווחים --- */}
        {activeTab === 'reports' && (
          <ReportsTab
            reportsList={reportsList}
            onResolveReport={handleResolveReport}
            onNavigateToQuestion={handleNavigateToReportedQuestion}
          />
        )}

        {/* --- טאב ניהול קורסים --- */}
        {activeTab === 'manage_courses' && (
          <ManageCoursesTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            newCourseName={newCourseName}
            setNewCourseName={setNewCourseName}
            onAddCourse={handleAddCourse}
            coursesList={coursesList}
            onEditCourse={startEditingCourse}
          />
        )}

        {/* --- טאב ניהול מבחנים (Lazy Load) --- */}
        {activeTab === 'manage_exams' && (
          <ManageExamsTab
            questionsEditorId={questionsEditorId}
            setQuestionsEditorId={setQuestionsEditorId}
            status={status}
            showMissingImagesOnly={showMissingImagesOnly}
            setShowMissingImagesOnly={setShowMissingImagesOnly}
            newQuestionOptionsCount={newQuestionOptionsCount}
            setNewQuestionOptionsCount={setNewQuestionOptionsCount}
            handleAddQuestion={handleAddQuestion}
            filteredQuestions={filteredQuestions}
            examQuestions={examQuestions}
            getQuestionStatusColor={getQuestionStatusColor}
            handleDeleteQuestion={handleDeleteQuestion}
            handleQuestionTextChange={handleQuestionTextChange}
            saveQuestionText={saveQuestionText}
            handleOptionTextChange={handleOptionTextChange}
            saveOptionText={saveOptionText}
            handleRemoveOptionFromQuestion={handleRemoveOptionFromQuestion}
            handleSetMainCorrect={handleSetMainCorrect}
            handleToggleAppeal={handleToggleAppeal}
            handleAddOptionToQuestion={handleAddOptionToQuestion}
            handleUploadQuestionImage={handleUploadQuestionImage}
            handleToggleCancel={handleToggleCancel}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            studentYears={studentYears}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            semesters={semesters}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            filteredExamsForEdit={filteredExamsForEdit}
            handleDeleteExam={handleDeleteExam}
            editingExamId={editingExamId}
            setEditingExamId={setEditingExamId}
            newAppendicesFile={newAppendicesFile}
            setNewAppendicesFile={setNewAppendicesFile}
            handleUpdateAppendices={handleUpdateAppendices}
            openQuestionsEditor={openQuestionsEditor}
          />
        )}

        {/* --- טאב העלאה המונית (Bulk Upload) --- */}
        {activeTab === 'bulk' && (
          <BulkUploadTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            parsingMode={parsingMode}
            setParsingMode={setParsingMode}
            bulkFiles={bulkFiles}
            setBulkFiles={setBulkFiles}
            status={status}
            handleBulkUpload={handleBulkUpload}
            debugLog={debugLog}
          />
        )}

        {/* --- טאב העלאה בודדת --- */}
        {activeTab === 'upload' && (
          <UploadTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            examYear={examYear}
            setExamYear={setExamYear}
            examYearsList={examYearsList}
            examMoed={examMoed}
            setExamMoed={setExamMoed}
            moedList={moedList}
            parsingMode={parsingMode}
            setParsingMode={setParsingMode}
            file={file}
            setFile={setFile}
            appendicesFile={appendicesFile}
            setAppendicesFile={setAppendicesFile}
            handleUploadExam={handleUploadExam}
            status={status}
            debugLog={debugLog}
          />
        )}

      </div>
    </div>
  );
}