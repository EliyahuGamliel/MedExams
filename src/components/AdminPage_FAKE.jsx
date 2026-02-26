import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, get, set, onValue, push, update, remove } from "firebase/database";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';

// --- אייקונים ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
// אייקון חדש להעלאה המונית
const BulkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>;

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); 
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]); 

  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  const examYearsList = Array.from({length: 16}, (_, i) => (2012 + i).toString());
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
  const [newCourseName, setNewCourseName] = useState("");
  const [coursesList, setCoursesList] = useState({});
  const [examsList, setExamsList] = useState([]); 
  const [status, setStatus] = useState('idle');
  const [debugLog, setDebugLog] = useState(""); 

  const [editingCourseOldData, setEditingCourseOldData] = useState(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseYear, setEditCourseYear] = useState("");
  const [editCourseSemester, setEditCourseSemester] = useState("");

  const [reportsList, setReportsList] = useState([]);
  
  // State להעלאה המונית
  const [bulkFiles, setBulkFiles] = useState([]);

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  // --- 1. ניהול הרשאות והתחברות ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setIsAdminLogin(false);
        setAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setAuthLoading(true);
    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribeDB = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData(data);
        if (data.role === 'super_admin' || data.role === 'editor') {
          setIsAdminLogin(true);
          if (data.role === 'editor' && data.allowed_years) {
            const firstAllowed = Object.keys(data.allowed_years)[0];
            if (firstAllowed) setSelectedStudentYear(firstAllowed);
          }
        } else {
          setIsAdminLogin(false);
        }
      } else {
        await set(userRef, {
          email: user.email,
          role: 'guest',
          createdAt: new Date().toISOString()
        });
      }
      setAuthLoading(false);
    });
    return () => unsubscribeDB();
  }, [user]);

  // --- 2. טעינת משתמשים ---
  useEffect(() => {
    if (userData?.role === 'super_admin') {
        onValue(ref(db, 'users'), (snapshot) => {
            const data = snapshot.val();
            setAllUsers(data ? Object.entries(data).map(([uid, val]) => ({ uid, ...val })) : []);
        });
    }
  }, [userData]);

  // --- 3. טעינת נתונים (Lazy Load) ---
  useEffect(() => {
    get(ref(db, 'courses')).then((snap) => setCoursesList(snap.val() || {}));
    
    get(ref(db, 'uploaded_exams')).then((snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
    });
    
    onValue(ref(db, 'reported_errors'), (snap) => {
      const data = snap.val();
      if (data) {
        const reportsArr = Object.entries(data).map(([id, val]) => ({id, ...val}));
        reportsArr.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setReportsList(reportsArr);
      } else {
        setReportsList([]);
      }
    });
  }, []);

  const canEditYear = (yearToCheck) => {
    if (!userData) return false;
    if (userData.role === 'super_admin') return true;
    if (userData.role === 'editor' && userData.allowed_years && userData.allowed_years[yearToCheck]) return true;
    return false;
  };
  
  const allowedStudentYears = studentYears.filter(y => canEditYear(y));

  // --- פעולות ניהול ---
  const handleUpdateUserRole = async (targetUid, newRole) => {
      try {
          await update(ref(db, `users/${targetUid}`), { role: newRole });
          if (newRole !== 'editor') await update(ref(db, `users/${targetUid}`), { allowed_years: null });
      } catch (e) { alert("שגיאה: " + e.message); }
  };

  const handleToggleUserYear = async (targetUid, year, currentStatus) => {
      try {
          const updates = {};
          if (currentStatus) updates[`users/${targetUid}/allowed_years/${year}`] = null; 
          else updates[`users/${targetUid}/allowed_years/${year}`] = true; 
          await update(ref(db), updates);
      } catch (e) { alert("שגיאה: " + e.message); }
  };

  const handleDeleteUser = async (targetUid) => {
      if (!window.confirm("למחוק משתמש זה?")) return;
      try { await remove(ref(db, `users/${targetUid}`)); } catch (e) { alert("שגיאה: " + e.message); }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (error) { alert(error.message); }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    window.location.reload();
  };

  const handleAddCourse = async () => {
    if (!newCourseName) return alert("נא לכתוב שם קורס");
    if (!canEditYear(selectedStudentYear)) return alert("אין לך הרשאה לשנה זו");
    try {
      const path = `courses/${selectedStudentYear}/${selectedSemester}`;
      await set(push(ref(db, path)), { name: newCourseName, createdAt: new Date().toISOString() });
      alert(`הקורס "${newCourseName}" נוסף בהצלחה!`);
      setNewCourseName(""); 
    } catch (e) { alert("שגיאה: " + e.message); }
  };

  const startEditingCourse = (year, sem, id, name) => {
    setEditingCourseOldData({ year, sem, id });
    setEditCourseName(name);
    setEditCourseYear(year);
    setEditCourseSemester(sem);
  };

  const handleUpdateCourse = async () => {
    if (!editCourseName) return alert("נא לכתוב שם קורס");
    if (!canEditYear(editingCourseOldData.year) || !canEditYear(editCourseYear)) return alert("אין הרשאה לערוך בשנים אלו");
    try {
      setStatus('processing');
      const { year: oldYear, sem: oldSem, id: courseId } = editingCourseOldData;
      const oldCourseSnap = await get(ref(db, `courses/${oldYear}/${oldSem}/${courseId}`));
      const courseData = oldCourseSnap.val() || { createdAt: new Date().toISOString() };
      courseData.name = editCourseName;
      const updates = {};
      if (oldYear !== editCourseYear || oldSem !== editCourseSemester) {
        updates[`courses/${oldYear}/${oldSem}/${courseId}`] = null; 
        updates[`courses/${editCourseYear}/${editCourseSemester}/${courseId}`] = courseData; 
      } else { updates[`courses/${oldYear}/${oldSem}/${courseId}`] = courseData; }
      examsList.filter(e => e.courseId === courseId).forEach(exam => {
        updates[`uploaded_exams/${exam.id}/course`] = editCourseName;
        updates[`uploaded_exams/${exam.id}/studentYear`] = editCourseYear;
        updates[`uploaded_exams/${exam.id}/semester`] = editCourseSemester;
      });
      await update(ref(db), updates);
      alert("עודכן!"); setEditingCourseOldData(null); setStatus('idle');
    } catch (e) { alert(e.message); setStatus('idle'); }
  };

  const handleResolveReport = async (reportId) => {
    try { await set(ref(db, `reported_errors/${reportId}`), null); } catch(e) {}
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
      // שמירה רגילה (יחידנית) במבנה המפוצל
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

  // --- פונקציה חדשה: העלאה המונית (מותאמת למבנה החדש) ---
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
        
        // חילוץ שנה ומועד משם הקובץ
        const yearMatch = filename.match(/(20\d{2})/);
        const extractedYear = yearMatch ? yearMatch[1] : "2026"; 

        let extractedMoed = "מועד א'";
        if (filename.includes("b")) extractedMoed = "מועד ב'";
        else if (filename.includes("c")) extractedMoed = "מועד מיוחד";

        addLog(`\n⏳ מעבד קובץ ${i+1}/${bulkFiles.length}: ${currentFile.name}`);
        addLog(`   זוהה כשנה: ${extractedYear} | מועד: ${extractedMoed}`);

        try {
            const base64Data = await fileToBase64(currentFile);
            const functions = getFunctions();
            const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });      
            const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: parsingMode });

            const questions = result.data.questions.map((q, idx) => ({ 
              ...q, id: idx, type: q.type || 'multiple_choice', imageNeeded: q.imageNeeded || false, isCanceled: false, appealedIndexes: [] 
            })); 

            const examId = `${courseName}_${extractedYear}_${extractedMoed}_${Date.now()}`.replace(/\s+/g, '_');

            // --- שמירה אטומית במבנה המפוצל ---
            const updates = {};
            
            // 1. מטא-דאטה (קל)
            updates[`uploaded_exams/${examId}`] = {
              id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
              courseId: selectedCourseId, examYear: extractedYear, examMoed: extractedMoed, 
              title: `${extractedYear} - ${extractedMoed}`,
              questionCount: questions.length, // הוספת ספירת שאלות
              questions: null, // מוודאים שאין כפילות
              hasAppendices: false, parsingMode, uploadedAt: new Date().toISOString()
            };

            // 2. תוכן (כבד)
            updates[`exam_contents/${examId}`] = questions;

            await update(ref(db), updates);
            // ----------------------------------

            addLog(`✅ קובץ עבר בהצלחה ושומר במסד הנתונים!`);
        } catch(e) {
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
    } catch (e) {
        alert("שגיאה בטעינת השאלות: " + e.message);
    } finally {
        setStatus('idle');
    }
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
        updates[`exam_images/${questionsEditorId}/${idx}`] = downloadURL;
        updates[`exam_contents/${questionsEditorId}/${idx}/hasImage`] = true;
        await update(ref(db), updates);

        setExamQuestions(p => { const n=[...p]; n[idx].hasImage=true; return n; });
        setStatus('idle');
    } catch(e) { alert(e.message); setStatus('idle'); }
  };

  const handleSetMainCorrect = async (idx, optIdx) => {
      await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { correctIndex: optIdx });
      setExamQuestions(p => { const n=[...p]; n[idx].correctIndex=optIdx; return n; });
  };
  const handleToggleAppeal = async (idx, optIdx) => {
      const q = examQuestions[idx];
      const cur = q.appealedIndexes || [];
      const newer = cur.includes(optIdx) ? cur.filter(i=>i!==optIdx) : [...cur, optIdx];
      await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { appealedIndexes: newer });
      setExamQuestions(p => { const n=[...p]; n[idx].appealedIndexes=newer; return n; });
  };
  const handleToggleCancel = async (idx) => {
      const ns = !examQuestions[idx].isCanceled;
      await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { isCanceled: ns });
      setExamQuestions(p => { const n=[...p]; n[idx].isCanceled=ns; return n; });
  };
  
  const getQuestionStatusColor = (q) => {
    if (q.isCanceled) return "bg-slate-100 border-slate-300 opacity-80";
    if (q.imageNeeded && !q.hasImage) return "bg-red-50 border-red-500 shadow-red-100";
    if (q.hasImage) return "bg-green-50 border-green-500 shadow-green-100";
    return "bg-white border-slate-200";
  };

  const availableCourses = coursesList[selectedStudentYear]?.[selectedSemester] ? Object.entries(coursesList[selectedStudentYear][selectedSemester]) : [];
  const filteredExamsForEdit = selectedCourseId ? examsList.filter(exam => exam.courseId === selectedCourseId) : [];
  const filteredQuestions = showMissingImagesOnly ? examQuestions.filter(q => q.imageNeeded && !q.hasImage) : examQuestions;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">בודק הרשאות...</div>;

  // --- UI ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
           <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">כניסה למנהלים</h2>
           <p className="text-center text-slate-400 mb-8 text-sm">הזן פרטי גישה כדי לנהל את המאגר</p>
           <button onClick={handleGoogleLogin} className="w-full bg-white text-slate-700 border border-slate-300 p-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-3">
             <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
             התחבר עם Google
           </button>
           <div className="mt-6 text-center border-t pt-6"><button onClick={() => window.location.href='/'} className="text-slate-400 font-bold text-sm hover:text-slate-600 transition">חזור לאתר הראשי</button></div>
        </div>
      </div>
    );
  }

  if (user && !isAdminLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center px-4">
        <div className="text-5xl">⏳</div>
        <h2 className="text-xl font-bold text-slate-700">הבקשה בבדיקה</h2>
        <p className="text-slate-500 max-w-md">שלום <b>{user.email}</b>,<br/>חשבונך נוצר בהצלחה!<br/>כעת עליך להמתין שמנהל ראשי יאשר את הרשאותיך.</p>
        <div className="flex gap-4 mt-4">
            <button onClick={handleLogout} className="text-slate-500 font-bold border border-slate-300 px-4 py-2 rounded-lg hover:bg-white transition">התנתק</button>
            <button onClick={() => window.location.href='/'} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition">חזרה לאתר</button>
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
              <label className="block text-xs font-bold text-slate-500 mb-1">שם הקורס:</label>
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
          
          {/* הטאב החדש להעלאה המונית */}
          <button onClick={() => setActiveTab('bulk')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'bulk' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><BulkIcon /> המונית 📚</button>
          
          <button onClick={() => setActiveTab('manage_exams')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_exams' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}><EditIcon /> ניהול קיימים</button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}><PlusIcon /> קורסים</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'reports' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}><FlagIcon /> דיווחים {reportsList.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-1">{reportsList.length}</span>}</button>
          {userData?.role === 'super_admin' && <button onClick={() => setActiveTab('users')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'users' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}><UsersIcon /> משתמשים</button>}
        </div>

        {/* --- טאב ניהול משתמשים --- */}
        {activeTab === 'users' && userData?.role === 'super_admin' && (
            <div className="animate-fade-in space-y-4">
                <h3 className="font-bold text-slate-800 text-xl mb-2">ניהול הרשאות</h3>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-orange-800 mb-4">💡 <b>איך זה עובד?</b> משתמשים חדשים שנרשמו יופיעו כאן כ-<b>Guest</b>. כאן תוכל לאשר אותם.</div>
                {allUsers.length === 0 ? <div className="text-center text-slate-400">אין משתמשים נוספים.</div> : (
                    <div className="space-y-3">
                        {allUsers.map(u => (
                            <div key={u.uid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b pb-2 mb-1">
                                    <div><div className="font-bold text-slate-700">{u.email}</div><div className="text-xs text-slate-400 select-all font-mono">{u.uid}</div></div>
                                    {u.uid !== user.uid && <button onClick={() => handleDeleteUser(u.uid)} className="text-red-400 hover:text-red-600 p-1"><TrashIcon/></button>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-500 w-16">תפקיד:</span>
                                    <select value={u.role || 'guest'} onChange={(e) => handleUpdateUserRole(u.uid, e.target.value)} className={`flex-1 p-2 rounded-lg border text-sm font-bold ${u.role==='guest' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-slate-50 border-slate-300'}`} disabled={u.uid === user.uid}>
                                        <option value="guest">Guest (ממתין לאישור ⏳)</option><option value="editor">Editor (עורך)</option><option value="super_admin">Super Admin (מנהל על)</option>
                                    </select>
                                </div>
                                {u.role === 'editor' && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-xs font-bold text-slate-500 mb-2">שנים מותרות לעריכה:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {studentYears.map(year => {
                                                const isAllowed = u.allowed_years && u.allowed_years[year];
                                                return (<label key={year} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition"><input type="checkbox" checked={!!isAllowed} onChange={() => handleToggleUserYear(u.uid, year, isAllowed)} className="rounded text-blue-600"/>{year}</label>)
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- טאב דיווחים --- */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-800 text-xl mb-4">דיווחי סטודנטים ({reportsList.length})</h3>
            {reportsList.length === 0 ? <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">אין דיווחים כרגע. הכל תקין! 🎉</div> : 
              reportsList.map(report => {
                const examTitle = report.examId !== "unknown" ? report.examId.split('_').slice(0, -1).join(' ') : 'מבחן לא ידוע';
                return (
                  <div key={report.id} className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2"><div className="text-xs font-bold text-red-800 bg-red-100 px-2 py-1 rounded">{examTitle} • שאלה {report.questionIndex + 1}</div><span className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleString('he-IL')}</span></div>
                    <p className="text-sm text-slate-700 font-bold mb-2 line-clamp-2">{report.questionText}</p>
                    <div className="bg-white p-3 rounded-lg border border-red-100 text-sm text-slate-600 mb-3"><span className="font-bold text-red-500">דיווח: </span>{report.reportText}</div>
                    <div className="flex gap-2">
                      <button onClick={() => {setActiveTab('manage_exams'); const examToEdit = examsList.find(e => e.id === report.examId); if (examToEdit) { setSelectedStudentYear(examToEdit.studentYear); setSelectedSemester(examToEdit.semester); setSelectedCourseId(examToEdit.courseId); setTimeout(() => openQuestionsEditor(examToEdit), 500); } else { alert("המבחן נמחק או שלא ניתן למצוא אותו."); }}} className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 transition">עבור לשאלה</button>
                      <button onClick={() => handleResolveReport(report.id)} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition">סמן שטופל (מחק דיווח)</button>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {/* --- טאב ניהול קורסים --- */}
        {activeTab === 'manage_courses' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
              <h3 className="font-bold text-green-800 text-lg mb-4">הגדרת קורס חדש</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <select value={selectedStudentYear} onChange={e => setSelectedStudentYear(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <input type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="שם הקורס (למשל: המטולוגיה)" className="w-full p-3 rounded-xl border border-slate-300 mb-4 focus:ring-2 focus:ring-green-500 outline-none" />
              <button onClick={handleAddCourse} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition">שמור קורס +</button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="font-bold text-slate-700 text-lg mb-4">ניהול קורסים קיימים</h3>
              {studentYears.map(year => (
                semesters.map(sem => {
                  const courses = coursesList[year]?.[sem];
                  if (!courses) return null;
                  return (
                    <div key={`${year}-${sem}`} className="mb-6">
                      <h4 className="text-sm font-black text-slate-500 mb-2 border-b pb-1">{year} | {sem}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(courses).map(([id, course]) => (
                            <div key={id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                              <span className="font-bold text-slate-700 text-sm">{course.name}</span>
                              <button onClick={() => startEditingCourse(year, sem, id, course.name)} className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition" title="ערוך קורס"><EditIcon /></button>
                            </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        )}

        {/* --- טאב ניהול מבחנים (Lazy Load) --- */}
        {activeTab === 'manage_exams' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                {questionsEditorId ? (
                   <div>
                      <button onClick={() => setQuestionsEditorId(null)} className="text-sm text-purple-600 font-bold mb-4 flex items-center gap-1 hover:underline">← חזור לרשימת המבחנים</button>
                      
                      {status === 'processing' && <div className="text-center py-10 text-purple-600 font-bold animate-pulse">טוען שאלות...</div>}

                      {status !== 'processing' && (
                      <>
                      <label className="flex items-center gap-2 mb-4 cursor-pointer"><input type="checkbox" checked={showMissingImagesOnly} onChange={e => setShowMissingImagesOnly(e.target.checked)} className="w-4 h-4 text-red-600 rounded" /> <span className="text-sm font-bold text-slate-600">הצג רק שאלות שחסרה להן תמונה 🚨</span></label>
                      <div className="space-y-4">
                        {filteredQuestions.map((q, idx) => {
   const realIndex = examQuestions.findIndex(orig => orig === q);
   const isCanceled = q.isCanceled === true;
   return (
     <div key={realIndex} className={`p-4 rounded-xl border-2 transition-all ${getQuestionStatusColor(q)}`}>
        <div className="flex justify-between items-center mb-3">
           <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-1 rounded-lg">שאלה {realIndex + 1}</span>
           <div className="flex gap-2">
             {isCanceled && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">מבוטלת</span>}
             {q.imageNeeded && !q.hasImage && (<span className="text-red-600 text-[10px] font-bold flex items-center gap-1"><AlertIcon /> דרושה תמונה</span>)}
           </div>
        </div>
        <p className="text-sm text-slate-700 font-bold mb-4 leading-relaxed whitespace-pre-line">{q.text}</p>
        {q.type === 'multiple_choice' && (
            <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 mb-2">ניהול התשובות לשאלה:</div>
                {q.options?.map((opt, optIdx) => {
                    const isMainCorrect = q.correctIndex === optIdx;
                    const isAppealed = (q.appealedIndexes || []).includes(optIdx);
                    return (
                        <div key={optIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                            <span className={`flex-1 leading-tight ${isMainCorrect ? 'font-bold text-green-700' : isAppealed ? 'font-bold text-orange-600' : 'text-slate-600'}`}>{optIdx + 1}. {opt}</span>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => handleSetMainCorrect(realIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isMainCorrect ? 'bg-green-500 text-white shadow-md' : 'bg-white border text-slate-400 hover:bg-slate-100'}`}>התשובה הנכונה</button>
                                <button onClick={() => handleToggleAppeal(realIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isAppealed ? 'bg-orange-500 text-white shadow-md' : 'bg-white border text-slate-400 hover:bg-slate-100'}`} disabled={isMainCorrect}>{isAppealed ? 'התקבל בערעור' : 'סמן כערעור'}</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm"><ImageIcon /> {q.hasImage ? 'החלף תמונה' : 'העלה תמונה לשאלה'}<input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(realIndex, e.target.files[0])} /></label>
            <button onClick={() => handleToggleCancel(realIndex)} className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${isCanceled ? 'bg-slate-200 text-slate-600 border-slate-300 shadow-inner' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>{isCanceled ? 'שחזר שאלה (בטל פסילה)' : 'פסול שאלה'}</button>
        </div>
     </div>
   );
})}
                      </div>
                      </>
                      )}
                   </div>
                ) : (
                   <>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                        <select value={selectedStudentYear} onChange={e => {setSelectedStudentYear(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={selectedSemester} onChange={e => {setSelectedSemester(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                     </div>
                     <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 mb-6 bg-white"><option value="">-- בחר מהרשימה --</option>{availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}</select>
                     {filteredExamsForEdit.map(exam => (
                       <div key={exam.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                         <div className="flex justify-between items-center">
                            <div><span className="font-bold text-slate-800">{exam.title}</span></div>
                            {(() => {
                               const missingCount = (exam.questions || []).filter(q => q.imageNeeded && !q.hasImage).length;
                               if (missingCount > 0) {
                                 return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold animate-pulse border border-red-200">🚨 חסרות {missingCount} תמונות</span>;
                               }
                               return null;
                            })()}
                            <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="מחק מבחן"><TrashIcon /></button>
                         </div>
                         <div className="flex gap-2 mt-2">
                            <button onClick={() => setEditingExamId(exam.id)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1"><PaperclipIcon /> נספחים</button>
                            <button onClick={() => openQuestionsEditor(exam)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><ImageIcon /> עריכת שאלות</button>
                         </div>
                         {editingExamId === exam.id && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 animate-fade-in">
                               <input type="file" accept="application/pdf" onChange={e => setNewAppendicesFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                               <div className="flex gap-2 mt-3">
                                 <button onClick={() => handleUpdateAppendices(exam.id)} disabled={!newAppendicesFile || status === 'processing'} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">{status === 'processing' ? 'מעלה...' : 'שמור'}</button>
                                 <button onClick={() => {setEditingExamId(null); setNewAppendicesFile(null);}} className="text-slate-400 px-4 py-2 text-sm font-bold hover:text-slate-600">ביטול</button>
                               </div>
                            </div>
                         )}
                       </div>
                     ))}
                   </>
                )}
             </div>
          </div>
        )}

        {/* --- טאב העלאה יחידנית --- */}
        {activeTab === 'upload' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">1. שיוך הקורס</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select value={selectedStudentYear} onChange={e => {setSelectedStudentYear(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <select value={selectedSemester} onChange={e => {setSelectedSemester(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"><option value="">-- בחר מהרשימה --</option>{availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}</select>
             </div>

             {selectedCourseId && (
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-fade-in-up">
                  <h3 className="font-bold text-blue-800 mb-3 text-sm uppercase tracking-wider">2. פרטי המבחן</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <select value={examYear} onChange={e => setExamYear(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">{examYearsList.map(y => <option key={y} value={y}>{y}</option>)}</select>
                    <select value={examMoed} onChange={e => setExamMoed(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">{moedList.map(m => <option key={m} value={m}>{m}</option>)}</select>
                  </div>
               </div>
             )}
             
             {selectedCourseId && (
               <div className="bg-white p-4 rounded-2xl border border-slate-200 animate-fade-in-up">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">3. סוג הקובץ לפענוח</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button onClick={() => setParsingMode('standard')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'standard' ? 'border-blue-600' : 'border-slate-300'}`}>{parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}</div><div className="text-right"><div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div><div className="text-xs opacity-70">טופס 0</div></div></button>
                     <button onClick={() => setParsingMode('computerized')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'computerized' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'computerized' ? 'border-blue-600' : 'border-slate-300'}`}>{parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}</div><div className="text-right"><div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div></div></button>
                  </div>
               </div>
             )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative ${file ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50'} transition`}>
                    <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                    <span className="text-2xl block mb-2">{file ? '📄' : '📝'}</span>
                    <p className="font-bold text-slate-600 text-sm">{file ? file.name : "קובץ מבחן (PDF)"}</p>
                </div>
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative ${appendicesFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'} transition`}>
                    <input type="file" accept="application/pdf" onChange={e=>setAppendicesFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                    <span className="text-2xl block mb-2">{appendicesFile ? '📎' : '➕'}</span>
                    <p className="font-bold text-slate-600 text-sm">{appendicesFile ? appendicesFile.name : "קובץ נספחים (אופציונלי)"}</p>
                </div>
              </div>

              <button onClick={handleUploadExam} disabled={status==='processing' || !file || !selectedCourseId} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition">{status==='processing' ? '⏳ מעבד שאלות...' : '🚀 העלה הכל'}</button>

              {debugLog && <div className="bg-black text-green-400 p-4 rounded-xl text-left h-32 overflow-auto text-xs" dir="ltr">{debugLog}</div>}
          </div>
        )}

        {/* --- טאב העלאה המונית (Bulk Upload) --- */}
        {activeTab === 'bulk' && (
          <div className="space-y-6 animate-fade-in bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
             <div className="text-center mb-6">
                 <h3 className="font-black text-indigo-900 text-2xl mb-2">העלאה המונית (Batch Upload)</h3>
                 <p className="text-indigo-600 text-sm font-medium">העלה עשרות מבחנים במכה אחת. <br/>המערכת תסרוק את שמות הקבצים כדי לשייך שנה ומועד אוטומטית.</p>
             </div>

             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">1. לאיזה קורס לשייך את המבחנים?</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select value={selectedStudentYear} onChange={e => {setSelectedStudentYear(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                  <select value={selectedSemester} onChange={e => {setSelectedSemester(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- בחר מהרשימה --</option>{availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}</select>
             </div>

             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">2. סוג הקבצים לפענוח</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button onClick={() => setParsingMode('standard')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'standard' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'standard' ? 'border-indigo-600' : 'border-slate-300'}`}>{parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}</div><div className="text-right"><div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div></div></button>
                     <button onClick={() => setParsingMode('computerized')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'computerized' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'computerized' ? 'border-indigo-600' : 'border-slate-300'}`}>{parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}</div><div className="text-right"><div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div></div></button>
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-indigo-300 hover:bg-indigo-50 transition text-center relative cursor-pointer">
                 <input type="file" multiple accept="application/pdf" onChange={e => setBulkFiles(Array.from(e.target.files))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                 <span className="text-4xl block mb-2">📁</span>
                 <p className="font-bold text-indigo-900">בחר מספר קבצים להעלאה (PDF)</p>
                 <p className="text-xs text-indigo-500 mt-1">גרור לכאן או לחץ לבחירה. מומלץ לקרוא לקבצים עם שנת המבחן והמועד.</p>
             </div>

             {bulkFiles.length > 0 && (
                 <div className="bg-white p-4 rounded-2xl border border-indigo-200">
                     <div className="font-bold text-slate-700 mb-2 border-b pb-2">נבחרו {bulkFiles.length} קבצים:</div>
                     <ul className="text-sm text-slate-600 space-y-1 max-h-40 overflow-y-auto pl-2" dir="ltr">
                         {bulkFiles.map((f, i) => (
                             <li key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                 <span className="truncate flex-1">{f.name}</span>
                             </li>
                         ))}
                     </ul>
                     <button onClick={handleBulkUpload} disabled={status === 'processing' || !selectedCourseId} className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 disabled:bg-slate-300 transition">
                         {status === 'processing' ? '⏳ מעבד קבצים (נא לא לסגור את החלון)...' : '🚀 התחל העלאה המונית'}
                     </button>
                 </div>
             )}

             {debugLog && <div className="bg-black text-green-400 p-4 rounded-xl text-left h-48 overflow-auto text-xs" dir="ltr"><pre>{debugLog}</pre></div>}
          </div>
        )}
      </div>
    </div>
  );
}