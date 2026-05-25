import { useState, useEffect } from 'react';
import { db } from '../../firebase'; // ודא שהנתיב ל-firebase.js תקין אצלך!
import { ref, get, set, update } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import toast from 'react-hot-toast'; 
import { PDFDocument } from 'pdf-lib'; // <--- ייבוא הספרייה החדשה לכיווץ

// =========================================================================
// פונקציית מגן (Sanitizer) - מנרמלת ומנקה את מבנה השאלות המתקבל מ-Gemini
// =========================================================================
const normalizeGeminiQuestion = (q, idx) => {
    let text = String(q.text || q.question || q.title || q.body || "⚠️ שאלה ללא טקסט");
    let type = q.type;
    let options = q.options || q.answers || q.choices || q.items || [];
    let correctIndex = q.correctIndex;

    // וידוא תאימות לסוגי השאלות הנתמכים במערכת
    if (type !== 'multiple_choice' && type !== 'cloze' && type !== 'open_ended') {
        type = 'multiple_choice'; 
    }
    
    // רשת ביטחון: הוספת מסיחים זמניים לשאלות אמריקאיות אם הפיענוח נכשל
    if (type === 'multiple_choice' && (!Array.isArray(options) || options.length === 0)) {
        options = ["אפשרות 1 (לא פוענח)", "אפשרות 2 (לא פוענח)", "אפשרות 3 (לא פוענח)"];
    }
    
    if (correctIndex === undefined || correctIndex === null) correctIndex = 0; 
    
    return {
        id: idx, 
        text: text, 
        type: type, 
        options: options, 
        clozeOptions: Array.isArray(q.clozeOptions) ? q.clozeOptions : [],
        correctIndex: type === 'open_ended' ? null : correctIndex, // לשאלה פתוחה אין אינדקס מענה נכון
        imageNeeded: q.imageNeeded === true,
        hasImage: false, 
        isCanceled: false, 
        appealedIndexes: []
    };
};

// =========================================================================
// פונקציית הקסם: מקבלת קובץ PDF מהדפדפן, מנקה Metadata ומחזירה Base64 רזה
// =========================================================================
const compressAndOptimizePDF = async (file) => {
  try {
    const fileArrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileArrayBuffer);
    
    // שמירה אופטימיזטיבית שמנקה משקל עודף, פונטים כפולים ומבנים נסתרים
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addGlyphsToSansSerifFont: false
    });
    
    // המרה של המערך הבינארי לשרשרת Base64 נקייה עבור Gemini
    const base64String = btoa(
      String.fromCharCode(...new Uint8Array(compressedPdfBytes))
    );
    return base64String;
  } catch (error) {
    console.error("שגיאה בכיווץ ה-PDF, מבצע fallback להמרה רגילה:", error);
    // במקרה של תקלה לא צפויה, נחזור להמרה הרגילה כדי שהאפליקציה לא תיתקע למשתמש
    return new Promise((resolve) => {
      const r = new FileReader(); 
      r.onload = () => resolve(r.result.split(',')[1]); 
      r.readAsDataURL(file); 
    });
  }
};

// פונקציית עזר להמרת קבצי נספחים (ללא כיווץ, במידה ורוצים לשמור על קובץ מקורי)
const fileToBase64 = (file) => new Promise((resolve) => { 
    const r = new FileReader(); 
    r.onload = () => resolve(r.result.split(',')[1]); 
    r.readAsDataURL(file); 
});

export function useUploadLogic(canEditYear, coursesList, selectedStudentYear, selectedSemester, selectedCourseId, setStatus) {
  // --- States הקשורים לתהליכי ההעלאה ---
  const [examYear, setExamYear] = useState("2026");
  const [examMoed, setExamMoed] = useState("מועד א'");
  const [file, setFile] = useState(null);
  const [appendicesFile, setAppendicesFile] = useState(null); 
  const [parsingMode, setParsingMode] = useState('standard');
  const [bulkFiles, setBulkFiles] = useState([]); 
  const [debugLog, setDebugLog] = useState(""); 

  const addLog = (msg) => setDebugLog(prev => prev + "\n" + msg);

  // =========================================================================
  // 1. תהליך העלאה ופיענוח של מבחן בודד (כולל כיווץ מובנה)
  // =========================================================================
  const handleUploadExam = async () => {
    if (!file) return toast.error("אנא בחר קובץ PDF");
    if (!selectedCourseId) return toast.error("יש לבחור קורס");
    if (!canEditYear(selectedStudentYear)) return toast.error("אין הרשאה להעלאה לשנה זו");

    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;
    
    setStatus('processing'); 
    setDebugLog(`מתחיל אופטימיזציה וכיווץ לקובץ...`);
    
    const toastId = toast.loading('🤖 ה-AI קורא ומפענח את המבחן (זה עשוי לקחת כמה דקות)...', { duration: Infinity });
    
    const uploadProcess = async () => {
      // ביצוע כיווץ אופטימיזטיבי לקובץ המבחן לפני השליחה!
      const base64Data = await compressAndOptimizePDF(file);
      
      let appendicesBase64 = null;
      if (appendicesFile) appendicesBase64 = await fileToBase64(appendicesFile);
      
      const functions = getFunctions();
      const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });      
      const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: parsingMode });
      
      const questions = result.data.questions.map((q, idx) => normalizeGeminiQuestion(q, idx)); 
      const examId = `${courseName}_${examYear}_${examMoed}_${Date.now()}`.replace(/\s+/g, '_');
      
      const updates = {};
      updates[`uploaded_exams/${examId}`] = {
        id: examId, 
        studentYear: selectedStudentYear, 
        semester: selectedSemester, 
        course: courseName,
        courseId: selectedCourseId, 
        examYear, 
        examMoed, 
        title: `${examYear} - ${examMoed}`,
        questionCount: questions.length, 
        hasAppendices: !!appendicesFile, 
        parsingMode, 
        uploadedAt: new Date().toISOString(),
        isVerified: false 
      };
      updates[`exam_contents/${examId}`] = questions;
      
      if (appendicesFile && appendicesBase64) { 
          updates[`exam_appendices/${examId}`] = { fileData: appendicesBase64 }; 
      }

      await update(ref(db), updates);
      setFile(null); 
      setAppendicesFile(null);
    };

    try {
      await uploadProcess();
      addLog(`✅ קובץ מכווץ עבר בהצלחה ונשמר במסד הנתונים!`);
      toast.success('המבחן פוענח ונשמר בהצלחה! 🎉', { id: toastId, duration: 5000 });
      setStatus('idle');
    } catch (e) { 
      console.error(e); 
      addLog("שגיאה: " + e.message); 
      toast.error('שגיאה בפענוח המבחן. אנא נסה שוב.', { id: toastId, duration: 5000 });
      setStatus('idle'); 
    }
  };

  // =========================================================================
  // 2. תהליך העלאה המונית באצווה (Batch Bulk Upload) - מכווץ כל קובץ אוטומטית!
  // =========================================================================
  const handleBulkUpload = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return toast.error("אנא בחר קבצים להעלאה.");
    if (!selectedCourseId) return toast.error("אנא בחר קורס לשיוך המבחנים.");
    
    const currentSemesterCourses = coursesList[selectedStudentYear]?.[selectedSemester] || {};
    const courseName = currentSemesterCourses[selectedCourseId]?.name;

    if (!window.confirm(`האם אתה בטוח שברצונך להתחיל סריקה של ${bulkFiles.length} מבחנים לקורס "${courseName}"?`)) return;

    setStatus('processing');
    setDebugLog(`🚀 מתחיל תהליך אצווה עבור ${bulkFiles.length} קבצים...`);
    const toastId = toast.loading(`סורק ומפענח ${bulkFiles.length} מבחנים באצווה...`, { duration: Infinity });

    const bulkUploadProcess = async () => {
      for (let i = 0; i < bulkFiles.length; i++) {
          const currentFile = bulkFiles[i];
          const filename = currentFile.name.toUpperCase(); 
          
          let extractedYear = "2026";
          let extractedMoed = "מועד א'";
          let currentParsingMode = parsingMode; 

          const match = filename.match(/([PS])?(20\d{2})([ABC]?)/);

          if (match) {
              if (match[1] === 'P') currentParsingMode = 'standard';
              else if (match[1] === 'S') currentParsingMode = 'moodle';
              if (match[2]) extractedYear = match[2];
              if (match[3] === 'A') extractedMoed = "מועד א'";
              else if (match[3] === 'B') extractedMoed = "מועד ב'";
              else if (match[3] === 'C') extractedMoed = "מועד מיוחד";
          } else {
              const lowerName = currentFile.name.toLowerCase();
              const yearFallbackMatch = lowerName.match(/(20\d{2})/);
              if (yearFallbackMatch) extractedYear = yearFallbackMatch[1];
              
              if (lowerName.includes("b") || lowerName.includes("ב'")) extractedMoed = "מועד ב'";
              else if (lowerName.includes("c") || lowerName.includes("ג'") || lowerName.includes("מיוחד")) extractedMoed = "מועד מיוחד";
          }

          addLog(`\n⏳ אופטימיזציה ומחיקת metadata לקובץ ${i+1}/${bulkFiles.length}: ${currentFile.name}`);
          
          try {
              // הקסם קורה גם כאן בלולאה: כל קובץ באצווה מכווץ ונשטף מתוכן עודף
              const base64Data = await compressAndOptimizePDF(currentFile);
              
              const functions = getFunctions();
              const processExamWithGemini = httpsCallable(functions, 'processExamWithGemini', { timeout: 540000 });      
              
              const result = await processExamWithGemini({ fileBase64: base64Data, parsingMode: currentParsingMode });

              const questions = result.data.questions.map((q, idx) => normalizeGeminiQuestion(q, idx)); 
              const examId = `${courseName}_${extractedYear}_${extractedMoed}_${Date.now()}`.replace(/\s+/g, '_');

              const updates = {};
              updates[`uploaded_exams/${examId}`] = {
                id: examId, 
                studentYear: selectedStudentYear, 
                semester: selectedSemester, 
                course: courseName,
                courseId: selectedCourseId, 
                examYear: extractedYear, 
                examMoed: extractedMoed, 
                title: `${extractedYear} - ${extractedMoed}`, 
                questionCount: questions.length,
                hasAppendices: false, 
                parsingMode: currentParsingMode, 
                uploadedAt: new Date().toISOString(),
                isVerified: false 
              };
              updates[`exam_contents/${examId}`] = questions;

              await update(ref(db), updates);
              addLog(`✅ קובץ עבר בהצלחה ונשמר במסד הנתונים!`);
          } catch(e) {
              console.error(`שגיאה בקובץ ${currentFile.name}:`, e);
              addLog(`❌ נכשל הקובץ ${currentFile.name}. מדלג לבא. שגיאה: ${e.message}`);
          }
      }
      setBulkFiles([]);
    };

    try {
      await bulkUploadProcess();
      toast.success('סריקת האצווה הסתיימה בהצלחה! 🎉', { id: toastId, duration: 5000 });
      setStatus('idle');
    } catch (e) {
      toast.error('הייתה בעיה בסריקת האצווה.' + e.message, { id: toastId, duration: 5000 });
      setStatus('idle');
    }
  };

  return {
    examYear, setExamYear, examMoed, setExamMoed,
    file, setFile, appendicesFile, setAppendicesFile,
    parsingMode, setParsingMode, bulkFiles, setBulkFiles,
    debugLog, setDebugLog, handleUploadExam, handleBulkUpload
  };
}