import { useState, useEffect } from 'react';
import { db } from '../firebase';
// הוספנו את get לייבוא
import { ref, set, onValue, push, update, get } from "firebase/database";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
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
// --- תוספת: אייקון דיווח ---
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  const examYearsList = Array.from({length: 11}, (_, i) => (2012 + i).toString());
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

  // --- States לעריכת קורס ---
  const [editingCourseOldData, setEditingCourseOldData] = useState(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseYear, setEditCourseYear] = useState("");
  const [editCourseSemester, setEditCourseSemester] = useState("");

  // --- תוספת: State לדיווחים ---
  const [reportsList, setReportsList] = useState([]);

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => setCoursesList(snap.val() || {}));
    onValue(ref(db, 'uploaded_exams'), (snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
    });
    
    // --- תוספת: משיכת הדיווחים מ-Firebase ---
    onValue(ref(db, 'reported_errors'), (snap) => {
      const data = snap.val();
      if (data) {
        const reportsArr = Object.entries(data).map(([id, val]) => ({id, ...val}));
        // מיון כך שהחדשים ביותר למעלה
        reportsArr.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setReportsList(reportsArr);
      } else {
        setReportsList([]);
      }
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("שגיאה בהתחברות: " + error.message);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  const handleAddCourse = async () => {
    if (!newCourseName) return alert("נא לכתוב שם קורס");
    try {
      const path = `courses/${selectedStudentYear}/${selectedSemester}`;
      const newCourseRef = push(ref(db, path));
      await set(newCourseRef, { name: newCourseName, createdAt: new Date().toISOString() });
      alert(`הקורס "${newCourseName}" נוסף בהצלחה!`);
      setNewCourseName(""); 
    } catch (e) { alert("שגיאה: " + e.message); }
  };

  // --- הפונקציות החדשות לעריכת קורסים ---
  const startEditingCourse = (year, sem, id, name) => {
    setEditingCourseOldData({ year, sem, id });
    setEditCourseName(name);
    setEditCourseYear(year);
    setEditCourseSemester(sem);
  };

  const handleUpdateCourse = async () => {
    if (!editCourseName) return alert("נא לכתוב שם קורס");
    try {
      setStatus('processing');
      const { year: oldYear, sem: oldSem, id: courseId } = editingCourseOldData;

      // 1. קבלת הנתונים הישנים של הקורס
      const oldCourseSnap = await get(ref(db, `courses/${oldYear}/${oldSem}/${courseId}`));
      const courseData = oldCourseSnap.val() || { createdAt: new Date().toISOString() };
      courseData.name = editCourseName;

      // 2. הכנת אובייקט של עדכונים גורפים
      const updates = {};

      // טיפול בקורס: אם המיקום (שנה/סמסטר) השתנה, מוחקים ישן ויוצרים חדש
      if (oldYear !== editCourseYear || oldSem !== editCourseSemester) {
        updates[`courses/${oldYear}/${oldSem}/${courseId}`] = null; // מחיקה מנתיב ישן
        updates[`courses/${editCourseYear}/${editCourseSemester}/${courseId}`] = courseData; // כתיבה לחדש
      } else {
        updates[`courses/${oldYear}/${oldSem}/${courseId}`] = courseData; // רק עדכון השם
      }

      // 3. טיפול במבחנים: מעדכנים את כל המבחנים ששייכים לקורס הזה!
      const examsToUpdate = examsList.filter(e => e.courseId === courseId);
      examsToUpdate.forEach(exam => {
        updates[`uploaded_exams/${exam.id}/course`] = editCourseName;
        updates[`uploaded_exams/${exam.id}/studentYear`] = editCourseYear;
        updates[`uploaded_exams/${exam.id}/semester`] = editCourseSemester;
      });

      // מריצים את כל העדכונים במכה אחת ל-DB
      await update(ref(db), updates);

      alert(`הקורס "${editCourseName}" וכל המבחנים שלו עודכנו בהצלחה!`);
      setEditingCourseOldData(null);
      setStatus('idle');
    } catch (e) { 
      alert("שגיאה בעדכון הקורס: " + e.message); 
      setStatus('idle'); 
    }
  };

  // --- תוספת: פונקציה למחיקת דיווח שטופל ---
  const handleResolveReport = async (reportId) => {
    try {
      await set(ref(db, `reported_errors/${reportId}`), null);
    } catch(e) {
      alert("שגיאה במחיקת הדיווח: " + e.message);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadExam = async () => {
    if (!file) return alert("אנא בחר קובץ PDF של המבחן");
    if (!selectedCourseId) return alert("אנא בחר קורס מהרשימה");
    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;

    setStatus('processing');
    setDebugLog(`מתחיל תהליך עבור: ${courseName} (${examYear} ${examMoed})...`);
    
    try {
      addLog("1. ממיר קובץ מבחן...");
      const base64Data = await fileToBase64(file);
      
      let appendicesBase64 = null;
      if (appendicesFile) {
        addLog("1.1. ממיר קובץ נספחים...");
        appendicesBase64 = await fileToBase64(appendicesFile);
      }
      
      addLog("2. שולח לעיבוד בשרת המאובטח (Cloud Functions)...");
      
      const functions = getFunctions();
      const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', {
        timeout: 540000 
      });      
      const result = await processExamWithGemini({ 
        fileBase64: base64Data, 
        parsingMode: parsingMode 
      });

      const questions = result.data.questions;
      addLog(`✅ השרת החזיר ${questions.length} שאלות.`);

      const processedQuestions = questions.map((q, idx) => ({ 
        ...q, 
        id: idx, 
        type: q.type || 'multiple_choice',
        imageNeeded: q.imageNeeded || false,
        isCanceled: false,
        appealedIndexes: [] 
      })); 
      
      const missingImagesCount = processedQuestions.filter(q => q.imageNeeded).length;

      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');

      await set(ref(db, 'uploaded_exams/' + examId), {
        id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
        courseId: selectedCourseId, examYear, examMoed, title: `${examYear} - ${examMoed}`,
        questions: processedQuestions, hasAppendices: !!appendicesFile, parsingMode, uploadedAt: new Date().toISOString()
      });

      if (appendicesFile && appendicesBase64) {
        await set(ref(db, 'exam_appendices/' + examId), { fileData: appendicesBase64 });
      }

      addLog("✅✅✅ הצלחה!");
      setStatus('success');
      
      if (missingImagesCount > 0) {
        alert(`✅ המבחן עלה!\n⚠️ שים לב: Gemini זיהה שחסרות תמונות ב-${missingImagesCount} שאלות. נא להעלות אותן ידנית ב"ניהול קיימים".`);
      } else {
        alert(`✅ המבחן עלה בהצלחה!`);
      }
      setFile(null); setAppendicesFile(null);
      
    } catch (e) { 
      console.error(e); addLog("❌ שגיאה: " + e.message); setStatus('idle'); 
    }
  };

  const handleUpdateAppendices = async (examId) => {
    if (!newAppendicesFile) return alert("אנא בחר קובץ נספחים");
    try {
      setStatus('processing');
      const storage = getStorage();
      const fileRef = storageRef(storage, `exam_appendices/${examId}.pdf`);
      await uploadBytes(fileRef, newAppendicesFile);
      const downloadURL = await getDownloadURL(fileRef);

      await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: true });
      await set(ref(db, `exam_appendices/${examId}`), { fileUrl: downloadURL });

      alert("הנספחים עודכנו בהצלחה!");
      setEditingExamId(null);
      setNewAppendicesFile(null);
      setStatus('idle');
    } catch (e) { alert("שגיאה: " + e.message); setStatus('idle'); }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את המבחן לצמיתות?")) return;
    try {
      setStatus('processing');
      await set(ref(db, `uploaded_exams/${examId}`), null);
      await set(ref(db, `exam_appendices/${examId}`), null);
      await set(ref(db, `exam_images/${examId}`), null);
      alert("המבחן וכל נתוניו נמחקו בהצלחה.");
      setStatus('idle');
    } catch (e) { alert("שגיאה במחיקה: " + e.message); setStatus('idle'); }
  };

  const handleUploadQuestionImage = async (questionIndex, imageFile) => {
    if (!questionsEditorId) return;
    try {
      setStatus('processing'); 
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, initialQuality: 0.7 };
      const compressedFile = await imageCompression(imageFile, options);
      const storage = getStorage();
      const fileRef = storageRef(storage, `exam_images/${questionsEditorId}/${questionIndex}_${Date.now()}`);
      await uploadBytes(fileRef, compressedFile);
      const downloadURL = await getDownloadURL(fileRef);
      await set(ref(db, `exam_images/${questionsEditorId}/${questionIndex}`), downloadURL);
      await update(ref(db, `uploaded_exams/${questionsEditorId}/questions/${questionIndex}`), { hasImage: true });
      setExamQuestions(prev => {
        const newQs = [...prev];
        newQs[questionIndex].hasImage = true;
        return newQs;
      });
      setStatus('idle');
    } catch (e) { console.error(e); alert("שגיאה בהעלאת תמונה: " + e.message); setStatus('idle'); }
  };

  const handleSetMainCorrect = async (questionIndex, optionIndex) => {
    try {
      await update(ref(db, `uploaded_exams/${questionsEditorId}/questions/${questionIndex}`), { correctIndex: optionIndex });
      setExamQuestions(prev => { const n = [...prev]; n[questionIndex].correctIndex = optionIndex; return n; });
    } catch (e) { alert("שגיאה בעדכון: " + e.message); }
  };

  const handleToggleAppeal = async (questionIndex, optionIndex) => {
    try {
      const q = examQuestions[questionIndex];
      const currentAppeals = q.appealedIndexes || [];
      const newAppeals = currentAppeals.includes(optionIndex) 
        ? currentAppeals.filter(i => i !== optionIndex) 
        : [...currentAppeals, optionIndex];
        
      await update(ref(db, `uploaded_exams/${questionsEditorId}/questions/${questionIndex}`), { appealedIndexes: newAppeals });
      setExamQuestions(prev => { const n = [...prev]; n[questionIndex].appealedIndexes = newAppeals; return n; });
    } catch (e) { alert("שגיאה בעדכון ערעור: " + e.message); }
  };

  const handleToggleCancel = async (questionIndex) => {
    try {
      const q = examQuestions[questionIndex];
      const newStatus = !q.isCanceled;
      await update(ref(db, `uploaded_exams/${questionsEditorId}/questions/${questionIndex}`), { isCanceled: newStatus });
      setExamQuestions(prev => { const n = [...prev]; n[questionIndex].isCanceled = newStatus; return n; });
    } catch (e) { alert("שגיאה בביטול שאלה: " + e.message); }
  };

  const openQuestionsEditor = (exam) => {
    setQuestionsEditorId(exam.id);
    setExamQuestions(exam.questions || []);
    setEditingExamId(null); 
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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
           <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">כניסה למנהלים</h2>
           <p className="text-center text-slate-400 mb-8 text-sm">הזן פרטי גישה כדי לנהל את המאגר</p>
           <form onSubmit={handleLogin} className="space-y-4">
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 outline-none transition bg-slate-50 focus:bg-white" placeholder="אימייל" required />
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 outline-none transition bg-slate-50 focus:bg-white" placeholder="סיסמה" required />
             <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">התחבר למערכת 🔐</button>
           </form>
           <div className="mt-6 text-center border-t pt-6">
             <button onClick={() => window.location.href='/'} className="text-slate-400 font-bold text-sm hover:text-slate-600 transition">חזור לאתר הראשי</button>
           </div>
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label>
                  <select value={editCourseYear} onChange={e => setEditCourseYear(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
                    {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label>
                  <select value={editCourseSemester} onChange={e => setEditCourseSemester(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
                    {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                  <button onClick={handleUpdateCourse} disabled={status === 'processing'} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
                      {status === 'processing' ? 'שומר...' : 'שמור שינויים'}
                  </button>
                  <button onClick={() => setEditingCourseOldData(null)} className="px-6 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">
                      ביטול
                  </button>
              </div>
           </div>
        </div>
      )}

       <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center">
        <button onClick={() => window.location.href = '/'} className="text-slate-500 font-bold hover:text-blue-600 transition">חזור לאתר</button>
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">{user.email}</span>
            <button onClick={handleLogout} className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition">התנתק</button>
        </div>
      </div>

      <div className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black mb-6 text-slate-800 text-center">ממשק ניהול</h2>

        {/* --- תוספת: שורת הטאבים עם overflow-x-auto ו-whitespace-nowrap כדי שלא ישבר בנייד --- */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 overflow-x-auto">
          <button onClick={() => setActiveTab('upload')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><UploadIcon /> העלאה חדשה</button>
          <button onClick={() => setActiveTab('manage_exams')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_exams' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}><EditIcon /> ניהול קיימים</button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}><PlusIcon /> קורסים</button>
          
          {/* טאב דיווחים החדש */}
          <button onClick={() => setActiveTab('reports')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'reports' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}>
            <FlagIcon /> דיווחים
            {reportsList.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{reportsList.length}</span>}
          </button>
        </div>

        {/* --- תוספת: תוכן טאב הדיווחים --- */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-slate-800 text-xl mb-4">דיווחי סטודנטים ({reportsList.length})</h3>
            {reportsList.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                אין דיווחים כרגע. הכל תקין! 🎉
              </div>
            ) : (
              reportsList.map(report => {
                const examTitle = report.examId !== "unknown" ? report.examId.split('_').slice(0, -1).join(' ') : 'מבחן לא ידוע';
                
                return (
                  <div key={report.id} className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold text-red-800 bg-red-100 px-2 py-1 rounded">
                        {examTitle} • שאלה {report.questionIndex + 1}
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleString('he-IL')}</span>
                    </div>
                    <p className="text-sm text-slate-700 font-bold mb-2 line-clamp-2">{report.questionText}</p>
                    <div className="bg-white p-3 rounded-lg border border-red-100 text-sm text-slate-600 mb-3">
                      <span className="font-bold text-red-500">דיווח: </span>
                      {report.reportText}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setActiveTab('manage_exams');
                        const examToEdit = examsList.find(e => e.id === report.examId);
                        if (examToEdit) {
                          setSelectedStudentYear(examToEdit.studentYear);
                          setSelectedSemester(examToEdit.semester);
                          setSelectedCourseId(examToEdit.courseId);
                          setTimeout(() => openQuestionsEditor(examToEdit), 500); 
                        } else {
                          alert("המבחן נמחק או שלא ניתן למצוא אותו.");
                        }
                      }} className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 transition">
                        עבור לשאלה
                      </button>
                      <button onClick={() => handleResolveReport(report.id)} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition">
                        סמן שטופל (מחק דיווח)
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

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

            {/* רשימת קורסים קיימים לעריכה */}
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
                              <button 
                                onClick={() => startEditingCourse(year, sem, id, course.name)} 
                                className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition"
                                title="ערוך קורס"
                              >
                                <EditIcon />
                              </button>
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

        {activeTab === 'manage_exams' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                {questionsEditorId ? (
                   <div>
                      <button onClick={() => setQuestionsEditorId(null)} className="text-sm text-purple-600 font-bold mb-4 flex items-center gap-1 hover:underline">← חזור לרשימת המבחנים</button>
                      <label className="flex items-center gap-2 mb-4 cursor-pointer"><input type="checkbox" checked={showMissingImagesOnly} onChange={e => setShowMissingImagesOnly(e.target.checked)} className="w-4 h-4 text-red-600 rounded" /> <span className="text-sm font-bold text-slate-600">הצג רק שאלות שחסרה להן תמונה 🚨</span></label>
                      <div className="space-y-4">
                        {filteredQuestions.map((q, idx) => {
   const realIndex = examQuestions.findIndex(orig => orig === q);
   const isCanceled = q.isCanceled === true;
   
   return (
     <div key={realIndex} className={`p-4 rounded-xl border-2 transition-all ${getQuestionStatusColor(q)}`}>
        <div className="flex justify-between items-center mb-3">
           <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-1 rounded-lg">
              שאלה {realIndex + 1}
           </span>
           <div className="flex gap-2">
             {isCanceled && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">מבוטלת</span>}
             {q.imageNeeded && !q.hasImage && (
               <span className="text-red-600 text-[10px] font-bold flex items-center gap-1">
                 <AlertIcon /> דרושה תמונה
               </span>
             )}
           </div>
        </div>
        
        <p className="text-sm text-slate-700 font-bold mb-4 leading-relaxed whitespace-pre-line">
           {q.text}
        </p>

        {q.type === 'multiple_choice' && (
            <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <div className="text-xs font-bold text-slate-500 mb-2">ניהול התשובות לשאלה:</div>
                {q.options?.map((opt, optIdx) => {
                    const isMainCorrect = q.correctIndex === optIdx;
                    const isAppealed = (q.appealedIndexes || []).includes(optIdx);
                    
                    return (
                        <div key={optIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                            <span className={`flex-1 leading-tight ${isMainCorrect ? 'font-bold text-green-700' : isAppealed ? 'font-bold text-orange-600' : 'text-slate-600'}`}>
                                {optIdx + 1}. {opt}
                            </span>
                            <div className="flex gap-1 shrink-0">
                                <button 
                                  onClick={() => handleSetMainCorrect(realIndex, optIdx)} 
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isMainCorrect ? 'bg-green-500 text-white shadow-md' : 'bg-white border text-slate-400 hover:bg-slate-100'}`}
                                >
                                    התשובה הנכונה
                                </button>
                                <button 
                                  onClick={() => handleToggleAppeal(realIndex, optIdx)} 
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isAppealed ? 'bg-orange-500 text-white shadow-md' : 'bg-white border text-slate-400 hover:bg-slate-100'}`}
                                  disabled={isMainCorrect}
                                >
                                    {isAppealed ? 'התקבל בערעור' : 'סמן כערעור'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm">
               <ImageIcon />
               {q.hasImage ? 'החלף תמונה' : 'העלה תמונה לשאלה'}
               <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(realIndex, e.target.files[0])} />
            </label>

            <button 
                onClick={() => handleToggleCancel(realIndex)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${isCanceled ? 'bg-slate-200 text-slate-600 border-slate-300 shadow-inner' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
            >
                {isCanceled ? 'שחזר שאלה (בטל פסילה)' : 'פסול שאלה'}
            </button>
        </div>
     </div>
   );
})}
                      </div>
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
                            <div><span className="font-bold text-slate-800">{exam.title}</span><span className="text-xs text-slate-400 mr-2">({exam.questions?.length} שאלות)</span></div>
                            {(() => {
                               const missingCount = (exam.questions || []).filter(q => q.imageNeeded && !q.hasImage).length;
                               if (missingCount > 0) {
                                 return (
                                   <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold animate-pulse border border-red-200">
                                     🚨 חסרות {missingCount} תמונות
                                   </span>
                                 );
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
      </div>
    </div>
  );
}