import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../firebase';
import { ref, set, onValue, push } from "firebase/database";

// אייקונים
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;

export default function AdminPage() {
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY; 
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('upload'); 
  
  // נתונים לסינון הקורס (כדי למצוא לאן להעלות)
  const [selectedStudentYear, setSelectedStudentYear] = useState("שנה א'"); // שנת הלימוד (א,ב,ג,ד)
  const [selectedSemester, setSelectedSemester] = useState("סמסטר א'");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  // נתונים ספציפיים למבחן עצמו (התוספת החדשה)
  const [examYear, setExamYear] = useState("2025"); // שנת המבחן הקלנדרית
  const [examMoed, setExamMoed] = useState("מועד א'");

  const [file, setFile] = useState(null);
  const [newCourseName, setNewCourseName] = useState("");
  
  const [coursesList, setCoursesList] = useState({});
  const [status, setStatus] = useState('idle');
  const [debugLog, setDebugLog] = useState(""); 

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  // --- טעינת הקורסים ---
  useEffect(() => {
    const coursesRef = ref(db, 'courses');
    onValue(coursesRef, (snapshot) => {
      setCoursesList(snapshot.val() || {});
    });
  }, []);

  // --- הוספת קורס חדש ---
  const handleAddCourse = async () => {
    if (!newCourseName) return alert("נא לכתוב שם קורס");
    
    try {
      const path = `courses/${selectedStudentYear}/${selectedSemester}`;
      const newCourseRef = push(ref(db, path));
      
      await set(newCourseRef, {
        name: newCourseName,
        createdAt: new Date().toISOString()
      });

      alert(`הקורס "${newCourseName}" נוסף בהצלחה!`);
      setNewCourseName(""); 
    } catch (e) {
      alert("שגיאה: " + e.message);
    }
  };

  // --- העלאת מבחן ---
  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadExam = async () => {
    if (!file) return alert("אנא בחר קובץ PDF");
    if (!selectedCourseId) return alert("אנא בחר קורס מהרשימה");

    // מציאת שם הקורס
    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;

    setStatus('processing');
    setDebugLog(`מתחיל תהליך עבור: ${courseName} (${examYear} ${examMoed})...`);
    
    try {
      addLog("1. קורא קובץ...");
      const base64Data = await fileToBase64(file);
      
      addLog("2. שולח ל-Gemini Flash Latest...");
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `Extract questions from this exam PDF to JSON. 
      The first option is ALWAYS correct.
      Return ONLY raw JSON array: [{"id": 1, "text": "Q", "options": ["Correct", "W1", "W2"], "correctIndex": 0}]`;
      
      const result = await model.generateContent([
        prompt, { inlineData: { data: base64Data, mimeType: "application/pdf" } }
      ]);
      
      const response = await result.response;
      const text = response.text();
      addLog("✅ התקבלה תשובה! מפענח...");

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("לא נמצא JSON תקין בתשובה");
      const questions = JSON.parse(jsonMatch[0]);

      addLog(`✅ זוהו ${questions.length} שאלות.`);
      addLog("4. שומר לענן...");
      
      // יצירת מזהה ייחודי
      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');

      await set(ref(db, 'uploaded_exams/' + examId), {
        id: examId,
        
        // נתוני סינון (איפה זה יופיע באתר)
        studentYear: selectedStudentYear,
        semester: selectedSemester,
        course: courseName,
        courseId: selectedCourseId,
        
        // נתוני המבחן הספציפי (מה יוצג בכותרת)
        examYear: examYear,
        examMoed: examMoed,
        title: `${examYear} - ${examMoed}`, // הכותרת שתוצג לסטודנט
        
        questions: questions,
        uploadedAt: new Date().toISOString()
      });

      addLog("✅✅✅ הצלחה!");
      setStatus('success');
      alert(`המבחן (${examYear} - ${examMoed}) עלה בהצלחה!`);
      setFile(null);

    } catch (e) {
      console.error(e);
      addLog("❌ שגיאה: " + e.message);
      setStatus('idle');
    }
  };

  // רשימות עזר
  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  
  // רשימת שנים למבחן (2018-2028)
  const examYearsList = Array.from({length: 11}, (_, i) => (2018 + i).toString());
  const moedList = ["מועד א'", "מועד ב'", "מועד מיוחד"];

  const availableCourses = coursesList[selectedStudentYear]?.[selectedSemester] 
    ? Object.entries(coursesList[selectedStudentYear][selectedSemester]) 
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
       <div className="max-w-2xl mx-auto mb-6">
        <button onClick={() => window.location.href = '/'} className="text-slate-500 font-bold hover:text-blue-600">חזור לדף הבית</button>
      </div>

      <div className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black mb-6 text-slate-800 text-center">ממשק ניהול</h2>

        {/* טאבים */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button onClick={() => setActiveTab('upload')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
            <UploadIcon /> העלאת מבחן
          </button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>
            <PlusIcon /> הוספת קורסים
          </button>
        </div>

        {/* --- טאב הוספת קורסים --- */}
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

        {/* --- טאב העלאת מבחן --- */}
        {activeTab === 'upload' && (
          <div className="space-y-6 animate-fade-in">
             
             {/* שלב 1: בחירת המיקום (לאן להעלות) */}
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
                  {availableCourses.length === 0 && <p className="text-xs text-red-500 mt-1">אין קורסים. עבור ללשונית "הוספת קורסים".</p>}
                </div>
             </div>

             {/* שלב 2: פרטי המבחן (החלק החדש) */}
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

              {/* שלב 3: העלאה */}
              <div className={`border-4 border-dashed p-8 rounded-2xl text-center cursor-pointer relative ${file ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50'} transition`}>
                <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                <span className="text-3xl block mb-2">{file ? '📄' : '📤'}</span>
                <p className="font-bold text-slate-600">{file ? file.name : "בחר קובץ PDF"}</p>
              </div>

              <button onClick={handleUploadExam} disabled={status==='processing' || !file || !selectedCourseId} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition">
                {status==='processing' ? '⏳ מעבד שאלות...' : '🚀 העלה מבחן'}
              </button>

              {debugLog && <div className="bg-black text-green-400 p-4 rounded-xl text-left h-32 overflow-auto text-xs" dir="ltr">{debugLog}</div>}
          </div>
        )}

      </div>
    </div>
  );
}