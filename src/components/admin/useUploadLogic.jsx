import { useState } from 'react';
import { db } from '../../firebase';
import { ref, update } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

// ==========================================
// פונקציית מגן - מנרמלת ומנקה את המידע מג'מיני
// ==========================================
const normalizeGeminiQuestion = (q, idx) => {
    const text = q.text || q.question || q.title || q.body || "⚠️ שאלה ללא טקסט (שגיאת פענוח)";
    let type = q.type;
    if (type !== 'multiple_choice' && type !== 'cloze') type = 'multiple_choice'; 
    let options = q.options || q.answers || q.choices || q.items;
    if (type === 'multiple_choice' && (!Array.isArray(options) || options.length === 0)) {
        options = ["אפשרות 1 (לא פוענח)", "אפשרות 2 (לא פוענח)", "אפשרות 3 (לא פוענח)"];
    }
    let correctIndex = q.correctIndex;
    if (correctIndex === undefined || correctIndex === null) correctIndex = 0; 
    return {
        id: idx, text: text, type: type, options: options || [], 
        clozeOptions: Array.isArray(q.clozeOptions) ? q.clozeOptions : [],
        correctIndex: correctIndex, imageNeeded: q.imageNeeded === true,
        hasImage: false, isCanceled: false, appealedIndexes: []
    };
};

const fileToBase64 = (file) => new Promise((resolve) => { 
    const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(file); 
});

export function useUploadLogic(canEditYear, coursesList, selectedStudentYear, selectedSemester, selectedCourseId, setStatus) {
  // --- States הקשורים להעלאה ---
  const [examYear, setExamYear] = useState("2026");
  const [examMoed, setExamMoed] = useState("מועד א'");
  const [file, setFile] = useState(null);
  const [appendicesFile, setAppendicesFile] = useState(null); 
  const [parsingMode, setParsingMode] = useState('standard');
  const [bulkFiles, setBulkFiles] = useState([]); 
  const [debugLog, setDebugLog] = useState(""); 

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  // --- העלאה בודדת ---
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
      
      const questions = result.data.questions.map((q, idx) => normalizeGeminiQuestion(q, idx)); 
      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');
      
      const updates = {};
      updates[`uploaded_exams/${examId}`] = {
        id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
        courseId: selectedCourseId, examYear, examMoed, title: `${examYear} - ${examMoed}`,
        questionCount: questions.length, hasAppendices: !!appendicesFile, parsingMode, uploadedAt: new Date().toISOString()
      };
      updates[`exam_contents/${examId}`] = questions;
      if (appendicesFile && appendicesBase64) { updates[`exam_appendices/${examId}`] = { fileData: appendicesBase64 }; }

      await update(ref(db), updates);
      setStatus('success'); alert(`הועלה בהצלחה`); setFile(null); setAppendicesFile(null);
    } catch (e) { console.error(e); addLog("שגיאה: " + e.message); setStatus('idle'); }
  };

  // --- העלאה המונית ---
  const handleBulkUpload = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return alert("אנא בחר קבצים להעלאה.");
    if (!selectedCourseId) return alert("אנא בחר קורס לשיוך המבחנים.");
    
    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;

    if (!window.confirm(`האם אתה בטוח שברצונך להתחיל סריקה של ${bulkFiles.length} מבחנים לקורס "${courseName}"?`)) return;

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

        addLog(`\n⏳ מעבד קובץ ${i+1}/${bulkFiles.length}: ${currentFile.name}`);
        
        try {
            const base64Data = await fileToBase64(currentFile);
            const functions = getFunctions();
            const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });      
            const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: parsingMode });

            const questions = result.data.questions.map((q, idx) => normalizeGeminiQuestion(q, idx)); 
            const examId = `${courseName}_${extractedYear}_${extractedMoed}_${Date.now()}`.replace(/\s+/g, '_');

            const updates = {};
            updates[`uploaded_exams/${examId}`] = {
              id: examId, studentYear: selectedStudentYear, semester: selectedSemester, course: courseName,
              courseId: selectedCourseId, examYear: extractedYear, examMoed: extractedMoed, 
              title: `${extractedYear} - ${extractedMoed}`, questionCount: questions.length,
              hasAppendices: false, parsingMode, uploadedAt: new Date().toISOString()
            };
            updates[`exam_contents/${examId}`] = questions;

            await update(ref(db), updates);
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

  return {
    examYear, setExamYear, examMoed, setExamMoed,
    file, setFile, appendicesFile, setAppendicesFile,
    parsingMode, setParsingMode, bulkFiles, setBulkFiles,
    debugLog, setDebugLog, handleUploadExam, handleBulkUpload
  };
}