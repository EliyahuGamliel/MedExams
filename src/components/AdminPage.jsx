import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../firebase';
import { ref, set, onValue, push, update } from "firebase/database";

// אייקונים
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
export default function AdminPage() {
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY; 

  // --- קבועים ורשימות עזר (הועברו לראש הקובץ למניעת שגיאות) ---
  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  const examYearsList = Array.from({length: 11}, (_, i) => (2018 + i).toString());
  const moedList = ["מועד א'", "מועד ב'", "מועד מיוחד"];
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('upload'); 
  
  const [selectedStudentYear, setSelectedStudentYear] = useState("שנה א'");
  const [selectedSemester, setSelectedSemester] = useState("סמסטר א'");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  const [examYear, setExamYear] = useState("2026");
  const [examMoed, setExamMoed] = useState("מועד א'");
  const [file, setFile] = useState(null);
  const [appendicesFile, setAppendicesFile] = useState(null); 
  const [parsingMode, setParsingMode] = useState('standard');

  // עריכת מבחן
  const [editingExamId, setEditingExamId] = useState(null);
  const [newAppendicesFile, setNewAppendicesFile] = useState(null);
  
  // עריכת שאלות (להוספת תמונות)
  const [questionsEditorId, setQuestionsEditorId] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);

  const [newCourseName, setNewCourseName] = useState("");
  const [coursesList, setCoursesList] = useState({});
  const [examsList, setExamsList] = useState([]); 
  const [status, setStatus] = useState('idle');
  const [debugLog, setDebugLog] = useState(""); 

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  // --- ערכים מחושבים ---
  const availableCourses = coursesList[selectedStudentYear]?.[selectedSemester] ? Object.entries(coursesList[selectedStudentYear][selectedSemester]) : [];
  const filteredExamsForEdit = selectedCourseId ? examsList.filter(exam => exam.courseId === selectedCourseId) : [];
  const filteredQuestions = showMissingImagesOnly 
    ? examQuestions.filter(q => q.imageNeeded && !q.hasImage)
    : examQuestions;

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => setCoursesList(snap.val() || {}));
    onValue(ref(db, 'uploaded_exams'), (snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
    });
  }, []);

  const handleAddCourse = async () => {
    if (!newCourseName) return alert("נא לכתוב שם קורס");
    try {
      const path = `courses/${selectedStudentYear}/${selectedSemester}`;
      const newCourseRef = push(ref(db, path));
      await set(newCourseRef, { name: newCourseName, createdAt: new Date().toISOString() });
      alert(`הקורס "${newCourseName}" נוסף בהצלחה!`);
      setNewCourseName(""); 
    } catch (e) {
      alert("שגיאה: " + e.message);
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
      
      addLog("2. שולח ל-Gemini Flash Latest...");
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 

      let prompt;

      if (parsingMode === 'standard') {
        // --- מצב רגיל (טופס 0) ---
        prompt = `Extract questions from this exam PDF to JSON. 
        The first option is ALWAYS correct (Form 0 style).
        CRITICAL FOR IMAGES: Set "imageNeeded": true ONLY IF text explicitly refers to a missing diagram/graph.
        Return ONLY raw JSON array: [{"id": 1, "text": "Q", "options": ["Correct", "W1", "W2"], "correctIndex": 0, "imageNeeded": false}]`;
      } else {
        // --- מצב ממוחשב (Moodle) - הפרומפט החדש והגמיש ---
        prompt = `You are parsing a "Review" PDF of a solved Moodle exam.
        Extract questions into a JSON array. 
        
        The exam contains two main types of logical questions. Use your intelligence to detect the type:

        TYPE 1: Single Choice (Radio Buttons / Checkboxes)
        - The user selects ONE answer from a list.
        - The correct answer is marked with "התשובה הנכונה:", a checkmark (✓/☑), or bold text.
        - Output format: {"type": "multiple_choice", "text": "Question?", "options": ["Opt1", "Opt2"], "correctIndex": X, "imageNeeded": false}

        TYPE 2: Complex / Multi-Part / Matching / Cloze
        - DETECT IF: The question asks to match items, fill multiple blanks, or classify items.
        - EXAMPLES: 
          * "Match item A to X, item B to Y..."
          * "Complete the sentence: The heart is {{0}} and the liver is {{1}}..."
          * A list of sub-questions (1, 2, 3...) where each has its own correct answer displayed.
        
        - ACTION for Type 2:
          1. Consolidate the main question text and the sub-items into one clear string.
          2. Identify the CORRECT answer for EACH sub-item/blank.
          3. Replace the correct answers in the text with {{0}}, {{1}}, {{2}}...
          4. Create a "clozeOptions" array. For each blank/item:
             - Put the correct answer as the first option.
             - GENERATE 3 plausible distractors (wrong answers) relevant to that specific item.
        
        - Output format for Type 2:
          {
            "type": "cloze", 
            "text": "Match the following:\nLung Pattern A: {{0}}\nLung Pattern B: {{1}}", 
            "clozeOptions": [
               {"options": ["Alveolar", "Interstitial", "Normal", "Cystic"], "correctIndex": 0},
               {"options": ["Interstitial", "Alveolar", "Normal", "Cystic"], "correctIndex": 0}
            ],
            "imageNeeded": true 
          }

        CRITICAL RULES:
        1. If a question refers to an image (X-ray, Graph, Diagram) -> Set "imageNeeded": true.
        2. If you see a text box inside a sentence -> It is a Type 2 (Cloze) question.
        3. If there are multiple correct answers for different parts of the question -> It is a Type 2 (Cloze) question.

        Return ONLY the raw JSON array.`;
      }
      
      const result = await model.generateContent([
        prompt, { inlineData: { data: base64Data, mimeType: "application/pdf" } }
      ]);
      
      const response = await result.response;
      const text = response.text();
      addLog("✅ התקבלה תשובה! מפענח...");

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("לא נמצא JSON תקין בתשובה");
      const questions = JSON.parse(jsonMatch[0]);

      const processedQuestions = questions.map((q, idx) => ({
        ...q,
        id: idx,
        type: q.type || 'multiple_choice' 
      }));

      const missingImagesCount = processedQuestions.filter(q => q.imageNeeded).length;

      addLog(`✅ זוהו ${processedQuestions.length} שאלות (${missingImagesCount} דורשות תמונה).`);
      addLog("4. שומר לענן...");
      
      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');

      await set(ref(db, 'uploaded_exams/' + examId), {
        id: examId,
        studentYear: selectedStudentYear,
        semester: selectedSemester,
        course: courseName,
        courseId: selectedCourseId,
        examYear: examYear,
        examMoed: examMoed,
        title: `${examYear} - ${examMoed}`,
        questions: processedQuestions,
        hasAppendices: !!appendicesFile,
        parsingMode: parsingMode, 
        uploadedAt: new Date().toISOString()
      });

      if (appendicesFile && appendicesBase64) {
        await set(ref(db, 'exam_appendices/' + examId), {
          fileData: appendicesBase64
        });
      }

      addLog("✅✅✅ הצלחה!");
      setStatus('success');
      
      if (missingImagesCount > 0) {
        alert(`✅ המבחן עלה!\n⚠️ שים לב: חסרות תמונות ב-${missingImagesCount} שאלות.`);
      } else {
        alert(`✅ המבחן עלה בהצלחה!`);
      }

      setFile(null);
      setAppendicesFile(null);

    } catch (e) {
      console.error(e);
      addLog("❌ שגיאה: " + e.message);
      setStatus('idle');
    }
  };

  const handleUpdateAppendices = async (examId) => {
    if (!newAppendicesFile) return alert("אנא בחר קובץ נספחים");
    try {
      setStatus('processing');
      const base64 = await fileToBase64(newAppendicesFile);
      await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: true });
      await set(ref(db, `exam_appendices/${examId}`), { fileData: base64 });
      alert("הנספחים עודכנו בהצלחה!");
      setEditingExamId(null);
      setNewAppendicesFile(null);
      setStatus('idle');
    } catch (e) {
      alert("שגיאה: " + e.message);
      setStatus('idle');
    }
  };

const handleDeleteExam = async (examId) => {
  // אישור לפני מחיקה
  if (!window.confirm("האם אתה בטוח שברצונך למחוק את המבחן לצמיתות? לא ניתן לשחזר פעולה זו.")) return;
  
  try {
    setStatus('processing');
    addLog(`מוחק מבחן: ${examId}...`);

    // 1. מחיקת נתוני המבחן והשאלות
    await set(ref(db, `uploaded_exams/${examId}`), null);
    
    // 2. מחיקת הנספחים (אם קיימים)
    await set(ref(db, `exam_appendices/${examId}`), null);
    
    // 3. מחיקת התמונות של השאלות (אם קיימות)
    await set(ref(db, `exam_images/${examId}`), null);

    alert("המבחן וכל נתוניו נמחקו בהצלחה.");
    setStatus('idle');
  } catch (e) {
    alert("שגיאה בתהליך המחיקה: " + e.message);
    setStatus('idle');
  }
};

  // --- העלאת תמונה לשאלה ---
  const handleUploadQuestionImage = async (questionIndex, imageFile) => {
    if (!questionsEditorId) return;
    
    try {
      const base64 = await fileToBase64(imageFile);
      
      // 1. שמירת התמונה
      await set(ref(db, `exam_images/${questionsEditorId}/${questionIndex}`), base64);
      
      // 2. עדכון השאלה - שינינו ל hasImage (המשתמש העלה)
      await update(ref(db, `uploaded_exams/${questionsEditorId}/questions/${questionIndex}`), {
        hasImage: true // זה אומר "יש תמונה בפועל"
      });
      
      // עדכון לוקאלי
      setExamQuestions(prev => {
        const newQs = [...prev];
        newQs[questionIndex].hasImage = true;
        return newQs;
      });

    } catch (e) {
      alert("שגיאה בהעלאת תמונה: " + e.message);
    }
  };

  const openQuestionsEditor = (exam) => {
    setQuestionsEditorId(exam.id);
    setExamQuestions(exam.questions || []);
    setEditingExamId(null); 
  };

  // פונקציות עזר לצבעים
  const getQuestionStatusColor = (q) => {
    if (q.imageNeeded && !q.hasImage) return "bg-red-50 border-red-500 shadow-red-100";
    if (q.hasImage) return "bg-green-50 border-green-500 shadow-green-100";
    return "bg-white border-slate-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
       <div className="max-w-2xl mx-auto mb-6">
        <button onClick={() => window.location.href = '/'} className="text-slate-500 font-bold hover:text-blue-600">חזור לדף הבית</button>
      </div>

      <div className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black mb-6 text-slate-800 text-center">ממשק ניהול</h2>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button onClick={() => setActiveTab('upload')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
            <UploadIcon /> העלאה חדשה
          </button>
          <button onClick={() => setActiveTab('manage_exams')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${activeTab === 'manage_exams' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>
            <EditIcon /> ניהול קיימים
          </button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>
            <PlusIcon /> קורסים
          </button>
        </div>

        {/* --- טאב ניהול קורסים --- */}
        {activeTab === 'manage_courses' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
              <h3 className="font-bold text-green-800 text-lg mb-4">הגדרת קורס חדש</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label>
                  <select value={selectedStudentYear} onChange={e => setSelectedStudentYear(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
                    {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label>
                  <select value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">
                    {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <input type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="שם הקורס (למשל: המטולוגיה)" className="w-full p-3 rounded-xl border border-slate-300 mb-4 focus:ring-2 focus:ring-green-500 outline-none" />
              <button onClick={handleAddCourse} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition">שמור קורס +</button>
            </div>
          </div>
        )}

        {/* --- טאב ניהול מבחנים --- */}
        {activeTab === 'manage_exams' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                <h3 className="font-bold text-purple-800 text-lg mb-4">ניהול מבחנים ושאלות</h3>
                
                {/* --- עורך השאלות --- */}
                {questionsEditorId ? (
                   <div>
                      <button onClick={() => setQuestionsEditorId(null)} className="text-sm text-purple-600 font-bold mb-4 flex items-center gap-1 hover:underline">
                         ← חזור לרשימת המבחנים
                      </button>
                      <h4 className="font-bold text-xl mb-2 text-slate-800">עריכת תמונות</h4>
                      
                      <div className="flex items-center justify-between mb-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:border-red-300 transition">
                             <input type="checkbox" checked={showMissingImagesOnly} onChange={e => setShowMissingImagesOnly(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                             <span className="text-sm font-bold text-slate-600">הצג רק שאלות שחסרה להן תמונה 🚨</span>
                          </label>
                          <span className="text-xs text-slate-400 font-bold">סה"כ: {filteredQuestions.length}</span>
                      </div>
                      
                      {filteredQuestions.length === 0 && (
                          <div className="text-center p-8 bg-white rounded-xl border border-dashed text-slate-400">
                             {showMissingImagesOnly ? "מעולה! אין שאלות שמחכות לתמונה." : "אין שאלות במבחן זה."}
                          </div>
                      )}

                      <div className="space-y-4">
                        {filteredQuestions.map((q, idx) => {
                           const realIndex = examQuestions.findIndex(orig => orig === q);
                           
                           return (
                             <div key={realIndex} className={`p-4 rounded-xl border-2 transition-all ${getQuestionStatusColor(q)}`}>
                                <div className="flex justify-between items-start mb-2">
                                   <div className="flex gap-2">
                                     <span className="bg-slate-200/50 text-slate-600 text-xs font-bold px-2 py-1 rounded">שאלה {realIndex + 1}</span>
                                     {q.imageNeeded && !q.hasImage && (
                                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold animate-pulse flex items-center gap-1">
                                           <AlertIcon /> חסרה תמונה!
                                        </span>
                                     )}
                                     {q.hasImage && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">טופל ✅</span>}
                                   </div>
                                </div>
                                <p className="text-sm text-slate-700 font-bold mb-3 leading-relaxed">{q.text}</p>
                                
                                <div className="flex items-center gap-3">
                                   <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${q.hasImage ? 'bg-white border border-slate-200 text-slate-600' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}>
                                      <ImageIcon /> {q.hasImage ? 'החלף תמונה קיימת' : 'העלה תמונה'}
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(realIndex, e.target.files[0])} />
                                   </label>
                                </div>
                             </div>
                           );
                        })}
                      </div>
                   </div>
                ) : (
                   /* --- רשימת המבחנים --- */
                   <>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label>
                          <select value={selectedStudentYear} onChange={e => {setSelectedStudentYear(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                            {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label>
                          <select value={selectedSemester} onChange={e => {setSelectedSemester(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                     </div>
                     <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 mb-1">בחר קורס:</label>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                          <option value="">-- בחר מהרשימה --</option>
                          {availableCourses.map(([id, course]) => (
                            <option key={id} value={id}>{course.name}</option>
                          ))}
                        </select>
                     </div>

                     {selectedCourseId && (
                        <div className="space-y-3">
                           {filteredExamsForEdit.length === 0 ? (
                             <p className="text-slate-400 text-center">אין מבחנים בקורס זה.</p>
                           ) : (
                             filteredExamsForEdit.map(exam => (
                               <div key={exam.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                 <div className="flex justify-between items-center">
                                   {/* כפתור המחיקה - הוספה חדשה */}
                                    {/* שורת הכותרת עם כפתור המחיקה צמוד אליה */}
    <div className="flex justify-between items-center">
      <div>
         <span className="font-bold text-slate-800">{exam.title}</span>
         <span className="text-xs text-slate-400 mr-2">({exam.questions?.length} שאלות)</span>
      </div>
      
      {/* כפתור המחיקה - מופיע ליד הכותרת */}
      <button 
        onClick={() => handleDeleteExam(exam.id)}
        className="text-slate-300 hover:text-red-500 transition-colors p-1"
        title="מחק מבחן"
      >
        <TrashIcon />
      </button>
    </div>
                                   {(() => {
                                      const missingCount = (exam.questions || []).filter(q => q.imageNeeded && !q.hasImage).length;
                                      if (missingCount > 0) return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold animate-pulse">חסרות {missingCount} תמונות!</span>;
                                      return null;
                                   })()}
                                 </div>
                                 
                                 <div className="flex gap-2 mt-2">
                                    <button onClick={() => setEditingExamId(exam.id)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1">
                                       <PaperclipIcon /> נספחים
                                    </button>
                                    
                                    <button onClick={() => openQuestionsEditor(exam)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1">
                                       <ImageIcon /> תמונות
                                    </button>
                                 </div>

                                 {editingExamId === exam.id && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 animate-fade-in">
                                       <p className="text-xs font-bold text-slate-500 mb-2">בחר קובץ נספחים חדש:</p>
                                       <input type="file" accept="application/pdf" onChange={e => setNewAppendicesFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                                       <div className="flex gap-2 mt-3">
                                         <button onClick={() => handleUpdateAppendices(exam.id)} disabled={!newAppendicesFile || status === 'processing'} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">
                                            {status === 'processing' ? 'מעלה...' : 'שמור'}
                                         </button>
                                         <button onClick={() => {setEditingExamId(null); setNewAppendicesFile(null);}} className="text-slate-400 px-4 py-2 text-sm font-bold hover:text-slate-600">ביטול</button>
                                       </div>
                                    </div>
                                 )}
                               </div>
                             ))
                           )}
                        </div>
                     )}
                   </>
                )}
             </div>
          </div>
        )}

        {/* --- טאב העלאה חדשה --- */}
        {activeTab === 'upload' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">1. שיוך הקורס</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label>
                    <select value={selectedStudentYear} onChange={e => {setSelectedStudentYear(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                      {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label>
                    <select value={selectedSemester} onChange={e => {setSelectedSemester(e.target.value); setSelectedCourseId("");}} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                      {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">בחר קורס:</label>
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- בחר מהרשימה --</option>
                    {availableCourses.map(([id, course]) => (
                      <option key={id} value={id}>{course.name}</option>
                    ))}
                  </select>
                </div>
             </div>

             {selectedCourseId && (
               <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-fade-in-up">
                  <h3 className="font-bold text-blue-800 mb-3 text-sm uppercase tracking-wider">2. פרטי המבחן</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">שנת המבחן:</label>
                      <select value={examYear} onChange={e => setExamYear(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">
                        {examYearsList.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">מועד:</label>
                      <select value={examMoed} onChange={e => setExamMoed(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">
                        {moedList.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
               </div>
             )}
             
             {selectedCourseId && (
               <div className="bg-white p-4 rounded-2xl border border-slate-200 animate-fade-in-up">
                  <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">3. סוג הקובץ לפענוח</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <button 
                       onClick={() => setParsingMode('standard')} 
                       className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                     >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'standard' ? 'border-blue-600' : 'border-slate-300'}`}>
                           {parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                        </div>
                        <div className="text-right">
                           <div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div>
                           <div className="text-xs opacity-70">טופס 0 / תשובה ראשונה היא הנכונה</div>
                        </div>
                     </button>

                     <button 
                       onClick={() => setParsingMode('computerized')} 
                       className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'computerized' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                     >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'computerized' ? 'border-blue-600' : 'border-slate-300'}`}>
                           {parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                        </div>
                        <div className="text-right">
                           <div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div>
                           <div className="text-xs opacity-70">"התשובה הנכונה:" מופיעה בטקסט</div>
                        </div>
                     </button>
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

              <button onClick={handleUploadExam} disabled={status==='processing' || !file || !selectedCourseId} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition">
                {status==='processing' ? '⏳ מעבד שאלות...' : '🚀 העלה הכל'}
              </button>

              {debugLog && <div className="bg-black text-green-400 p-4 rounded-xl text-left h-32 overflow-auto text-xs" dir="ltr">{debugLog}</div>}
          </div>
        )}

      </div>
    </div>
  );
}