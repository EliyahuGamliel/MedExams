import { useState, useEffect, useMemo, memo } from 'react';
import { db } from '../firebase';
import { ref, push, set } from "firebase/database";
import toast from 'react-hot-toast';
import ExplanationBox from './home/ExplanationBox';
import { useAuth } from '../context/AuthContext'; 

const BookmarkIcon = ({ filled }) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>;

// --- אייקונים לפסילת תשובות ---
const EliminateIconOpen = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const EliminateIconClosed = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;

const shuffleArray = (array) => {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const isArrayEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort((a, b) => a - b);
    const sorted2 = [...arr2].sort((a, b) => a - b);
    return sorted1.every((val, index) => val === sorted2[index]);
};

const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const PenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;

const QuestionCard = memo(function QuestionCard({ 
  question, 
  index, 
  mode, 
  onAnswer, 
  isSubmitted, 
  imageUrl, 
  examId, 
  isFlagged, 
  onToggleFlag, 
  isUserExcluded, 
  onToggleUserExclude, 
  eliminatedOptions = [], 
  onToggleEliminate, 
  resetTick, 
  examSessionId,

}) {  
  const { user } = useAuth();
  if (!question) return null;

  const isMultiSelect = Array.isArray(question.correctIndex);
  const qStorageKey = `q_state_${examId}_${mode}_${index}`;

  const [selectedOptionId, setSelectedOptionId] = useState(() => {
      const saved = localStorage.getItem(`${qStorageKey}_single`);
      return saved ? JSON.parse(saved) : null;
  });
  const [testSelections, setTestSelections] = useState(() => {
      const saved = localStorage.getItem(`${qStorageKey}_multi`);
      return saved ? JSON.parse(saved) : [];
  });
  
  const [practiceSelections, setPracticeSelections] = useState(() => {
      const saved = localStorage.getItem(`${qStorageKey}_prac`);
      return saved ? JSON.parse(saved) : [];
  });

  const [clozeSelections, setClozeSelections] = useState(() => {
      const saved = localStorage.getItem(`${qStorageKey}_cloze`);
      return saved ? JSON.parse(saved) : {};
  });
  const [clozeWrongAttempts, setClozeWrongAttempts] = useState({}); 

  useEffect(() => {
      if (resetTick > 0) {
          setSelectedOptionId(null);
          setTestSelections([]);
          setPracticeSelections([]);
          setClozeSelections({});
          setClozeWrongAttempts({});
      }
  }, [resetTick]);

  useEffect(() => {
      localStorage.setItem(`${qStorageKey}_single`, JSON.stringify(selectedOptionId));
      localStorage.setItem(`${qStorageKey}_multi`, JSON.stringify(testSelections));
      localStorage.setItem(`${qStorageKey}_prac`, JSON.stringify(practiceSelections));
      localStorage.setItem(`${qStorageKey}_cloze`, JSON.stringify(clozeSelections));
  }, [selectedOptionId, testSelections, practiceSelections, clozeSelections, qStorageKey]);

  const [isReporting, setIsReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState('idle');

  const shuffledOptions = useMemo(() => {
    if (question.type === 'cloze' || question.type === 'open_ended') return null;

    const optionsSafe = question.options || [];
    const appeals = question.appealedIndexes || [];
    const isCanceled = question.isCanceled === true;

    const optionsWithData = optionsSafe.map((opt, idx) => {
      const isMainCorrect = isMultiSelect 
          ? question.correctIndex.includes(idx) 
          : idx === question.correctIndex;

      return {
        id: idx,
        text: opt,
        isCorrect: isCanceled || isMainCorrect || appeals.includes(idx),
        isAppealed: appeals.includes(idx),
        isMainCorrect: isMainCorrect
      };
    });
    return shuffleArray(optionsWithData);
  }, [question.text, isMultiSelect, examSessionId]); 

  const shuffledClozeOptions = useMemo(() => {
    if (question.type !== 'cloze') return null;
    const clozeOptsSafe = question.clozeOptions || [];
    
    return clozeOptsSafe.map(blank => {
      const opts = (blank.options || []).map((opt, idx) => ({
        id: idx,
        text: opt,
        isCorrect: idx === blank.correctIndex || (blank.appealedIndexes || []).includes(idx)
      }));
      return shuffleArray(opts);
    });
  }, [question.text, examSessionId]); 

  useEffect(() => {
    const hasSavedData = localStorage.getItem(`${qStorageKey}_single`) || 
                         localStorage.getItem(`${qStorageKey}_multi`) ||
                         localStorage.getItem(`${qStorageKey}_prac`) ||
                         localStorage.getItem(`${qStorageKey}_cloze`);
    
    if (!hasSavedData) {
        setSelectedOptionId(null);
        setTestSelections([]);
        setPracticeSelections([]); 
        setClozeSelections({});
        setClozeWrongAttempts({});
    }
    
    if (onAnswer) {
        if (question.isCanceled || isUserExcluded) {
            onAnswer(index, 'canceled');
        } else if (question.type === 'open_ended') {
            onAnswer(index, 'ignored');
        } else if (!hasSavedData) {
            onAnswer(index, null);
        }
    }
  }, [question, mode, question.isCanceled, isUserExcluded, qStorageKey, onAnswer, index]);

  const calculateClozeStatus = (currentSelections) => {
    if (!shuffledClozeOptions || shuffledClozeOptions.length === 0) return { correctCount: 0, total: 0, status: 'empty' };
    
    if (question.isCanceled) {
       return { correctCount: shuffledClozeOptions.length, total: shuffledClozeOptions.length, status: 'perfect', answeredCount: shuffledClozeOptions.length };
    }

    const total = shuffledClozeOptions.length;
    let correctCount = 0;
    let answeredCount = 0;

    for (let i = 0; i < total; i++) {
        const selectedId = currentSelections[i];
        if (selectedId !== undefined) {
            answeredCount++;
            const opt = shuffledClozeOptions[i].find(o => o.id === selectedId);
            if (opt?.isCorrect) correctCount++;
        }
    }

    let status = 'empty';
    if (answeredCount === 0) status = 'empty';
    else if (correctCount === total) status = 'perfect'; 
    else if (correctCount === 0 && answeredCount === total) status = 'wrong'; 
    else status = 'partial'; 

    return { correctCount, total, status, answeredCount };
  };

  const clozeState = calculateClozeStatus(clozeSelections);

  const handleSelectStandard = (optionId) => {
    if (mode === 'test' && isSubmitted) return;

    const toggleSelection = (prevList) => {
        if (prevList.includes(optionId)) {
            return prevList.filter(id => id !== optionId);
        } else {
            return [...prevList, optionId];
        }
    };

    const appeals = question.appealedIndexes || [];

    if (mode === 'practice') {
       setPracticeSelections(prev => toggleSelection(prev));
    } else {
       if (isMultiSelect) {
           setTestSelections(prev => {
               const newList = toggleSelection(prev);
               let status = null;
               if (newList.length > 0) {
                   if (question.isCanceled) {
                       status = 'perfect';
                   } else {
                       const correctArr = Array.isArray(question.correctIndex) ? question.correctIndex : [question.correctIndex];
                       const allValidOptions = [...correctArr, ...appeals];
                       const isExactOriginal = isArrayEqual(newList, correctArr);
                       const isAllValidAndCorrectLength = newList.every(val => allValidOptions.includes(val)) && newList.length === correctArr.length;
                       
                       if (isExactOriginal || isAllValidAndCorrectLength) {
                           status = 'perfect'; 
                       } else if (newList.every(val => allValidOptions.includes(val))) {
                           status = 'partial';
                       } else {
                           status = 'wrong';
                       }
                   }
               }
               if (onAnswer) onAnswer(index, status);
               return newList;
           });
       } else {
           if (selectedOptionId === optionId) {
              setSelectedOptionId(null);
              if (onAnswer) onAnswer(index, question.isCanceled ? 'perfect' : null);
           } else {
              setSelectedOptionId(optionId);
              const isCorrect = (optionId === question.correctIndex) || appeals.includes(optionId) || question.isCanceled;
              if (onAnswer) onAnswer(index, isCorrect ? 'perfect' : 'wrong');
           }
       }
    }
  };

  const handleSelectCloze = (blankIndex, selectedId) => {
    if (mode === 'test' && isSubmitted) return;

    const newSelections = { ...clozeSelections, [blankIndex]: selectedId };
    setClozeSelections(newSelections);

    const optionsForBlank = shuffledClozeOptions[blankIndex];
    const isChoiceCorrect = optionsForBlank.find(o => o.id === selectedId)?.isCorrect;

    if (mode === 'practice' && !isChoiceCorrect && !question.isCanceled) {
      setClozeWrongAttempts(prev => ({
        ...prev,
        [blankIndex]: [...(prev[blankIndex] || []), selectedId]
      }));
    }

    if (onAnswer) {
      const { status } = calculateClozeStatus(newSelections);
      onAnswer(index, status);
    }
  };

  // --- הגבלת פתיחת חלון הדיווח למשתמשים מחוברים בלבד ---
  const handleOpenReport = () => {
    if (!user) {
        toast.error("רק משתמשים מחוברים יכולים לדווח על טעויות 🔒");
        return;
    }
    setIsReporting(true);
  };

  // --- שמירת הדיווח עם נתוני המשתמש ---
  const handleReportSubmit = async () => {
    if (!reportText.trim() || !user) return;
    setReportStatus('submitting');
    
    try {
      const reportRef = push(ref(db, 'reported_errors'));
      await set(reportRef, {
        examId: examId || "unknown",
        questionIndex: index,
        questionText: question.text,
        reportText: reportText,
        timestamp: new Date().toISOString(),
        reporterId: user.uid,
        reporterEmail: user.email || 'לא סופק אימייל',
        reporterName: user.displayName || 'ללא שם'
      });
      
      setReportStatus('success');
      setTimeout(() => {
        setIsReporting(false);
        setReportStatus('idle');
        setReportText("");
      }, 2000); 
    } catch (error) {
      console.error(error);
      toast.error("אירעה שגיאה בשליחת הדיווח.");
      setReportStatus('idle');
    }
  };

  const renderClozeContent = () => {
    if (!question.text) return null;
    return (
      <div className="text-lg text-slate-800 dark:text-slate-200 whitespace-pre-line leading-loose transition-colors" dir="rtl">
        {question.text.split(/(\{\{\d+\}\})/g).map((part, i) => {
          const match = part.match(/\{\{(\d+)\}\}/);
          if (match) {
            const blankIndex = parseInt(match[1]);
            if (!shuffledClozeOptions || !shuffledClozeOptions[blankIndex]) return <span key={i} className="text-red-400 dark:text-red-500 font-bold">[חסר]</span>;

            const options = shuffledClozeOptions[blankIndex];
            const currentSelection = clozeSelections[blankIndex];
            
            let borderClass = "border-slate-300 dark:border-slate-600";
            let bgClass = "bg-white dark:bg-slate-800";
            let textClass = "text-slate-700 dark:text-slate-200";

            const selectedOpt = options.find(o => o.id === currentSelection);
            const isCorrect = selectedOpt?.isCorrect || question.isCanceled;

            if (mode === 'test' && isSubmitted) {
                if (isCorrect) { borderClass = "border-green-500"; bgClass = "bg-green-50 dark:bg-green-950/30"; textClass = "text-green-800 dark:text-green-400 font-bold"; }
                else { borderClass = "border-red-500"; bgClass = "bg-red-50 dark:bg-red-950/30"; textClass = "text-red-800 dark:text-red-400 line-through"; }
            } else if (mode === 'practice' && currentSelection !== undefined) {
                if (isCorrect) { borderClass = "border-green-500"; bgClass = "bg-green-50 dark:bg-green-950/20"; textClass = "text-green-800 dark:text-green-400"; }
                else { borderClass = "border-red-500"; bgClass = "bg-red-50 dark:bg-red-950/20"; textClass = "text-red-800 dark:text-red-400"; }
            } else if (currentSelection !== undefined) {
                borderClass = "border-blue-500 dark:border-blue-500"; bgClass = "bg-blue-50 dark:bg-blue-950/40"; textClass = "text-blue-800 dark:text-blue-300";
            }

            return (
              <span key={i} className="inline-block mx-1 align-middle">
                 <select
                    value={currentSelection ?? ""}
                    onChange={(e) => handleSelectCloze(blankIndex, parseInt(e.target.value))}
                    disabled={mode === 'test' && isSubmitted}
                    className={`px-2 py-1 rounded-lg border-2 focus:outline-none cursor-pointer text-sm transition-all ${borderClass} ${bgClass} ${textClass}`}
                    dir="rtl"
                  >
                    <option value="" disabled>...</option>
                    {options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.text}</option>
                    ))}
                  </select>
                  {(mode === 'test' && isSubmitted && !isCorrect && !question.isCanceled) && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-bold mr-1">
                          ({options.find(o=>o.isCorrect)?.text})
                      </span>
                  )}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className={`rounded-3xl shadow-sm border p-6 mb-6 relative overflow-hidden transition-all ${question.isCanceled ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60'} ${isUserExcluded ? 'opacity-40 grayscale-[0.5]' : ''}`}>
      
      {/* מודאל דיווח */}
      {isReporting && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex flex-col p-6 animate-fade-in">
           <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">מצאת טעות בשאלה?</h4>
           {reportStatus === 'success' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-green-600 dark:text-green-400 font-bold text-center">
               <span className="text-4xl mb-2">✅</span>
               תודה! הדיווח נשלח למנהל המערכת.
             </div>
           ) : (
             <>
               <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">תאר בקצרה מה הבעיה.</p>
               <textarea 
                 value={reportText} 
                 onChange={(e) => setReportText(e.target.value)}
                 className="flex-1 w-full border border-slate-300 dark:border-slate-600 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                 placeholder="פירוט הטעות..."
               />
               <div className="flex gap-2 mt-4">
                 <button onClick={handleReportSubmit} disabled={!reportText.trim() || reportStatus === 'submitting'} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl text-sm hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition">
                   {reportStatus === 'submitting' ? 'שולח...' : 'שלח דיווח'}
                 </button>
                 <button onClick={() => setIsReporting(false)} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition">ביטול</button>
               </div>
             </>
           )}
        </div>
      )}

      {question.isCanceled && (
        <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-center py-1 text-xs font-bold tracking-widest shadow-md">
          שאלה מבוטלת - אינה נכללת בציון (כל תשובה נכונה)
        </div>
      )}

      {question.type === 'multiple_choice' && (!question.options || question.options.length === 0) && (
           <div className="text-center p-4 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl mb-4 border border-red-200 dark:border-red-900/40">
               <div className="flex justify-center mb-1"><AlertIcon /></div>
               <span className="font-bold text-sm">שגיאה: נתוני השאלה חסרים.</span>
           </div>
      )}

      <div className={`flex justify-between items-center mb-4 ${question.isCanceled ? 'mt-4' : ''}`}>
        <div className="flex items-center gap-3">
         <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full transition-colors">
          שאלה {index + 1}
        </span>
            <button 
                onClick={() => onToggleFlag(index)}
                className={`print:hidden flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg transition-colors ${isFlagged ? 'text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50' : 'text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-red-500 dark:hover:text-red-400 border border-transparent'}`}
                title="סמן שאלה זו כדי לחזור אליה מאוחר יותר"
            >
                <BookmarkIcon filled={isFlagged} />
                {isFlagged ? 'בטל סימון' : 'סמן שאלה'}
            </button>
        {mode === 'test' && (
            <button 
                onClick={() => onToggleUserExclude(index)}
                className={`print:hidden flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${isUserExcluded ? 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50' : 'text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-500 dark:hover:text-purple-400 border border-transparent'}`}
                title="התעלם משאלה זו בחישוב הציון"
            >
                <EyeOffIcon />
                {isUserExcluded ? 'השאלה הוחרגה' : 'התעלם בציון'}
            </button>
        )}
         </div>
         {/* --- כפתור הדיווח המעודכן --- */}
        <button onClick={handleOpenReport} className="text-slate-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 print:hidden transition-colors text-xs font-bold flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 rounded-lg border border-transparent">
           <FlagIcon /> דווח על טעות
        </button>
      </div>

      {(question.type === 'multiple_choice' || question.type === 'open_ended') && (
         <h3 className={`text-xl font-bold mb-4 whitespace-pre-wrap leading-relaxed transition-colors ${question.isCanceled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
           {question.text}
           {isMultiSelect && question.type === 'multiple_choice' && <span className="block text-sm text-blue-500 dark:text-blue-400 font-normal mt-2">(זוהי שאלה מרובת בחירות - סמן את כל התשובות הנכונות)</span>}
         </h3>
      )}

      {question.hasImage && imageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white flex justify-center">
            <img 
              src={imageUrl} 
              alt="Question illustration" 
              className="w-full max-h-96 object-contain dark:bg-slate-800" 
              loading="lazy"
            />
          </div>
      )}
      {question.hasImage && !imageUrl && (
        <div className="mb-6 h-48 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl flex items-center justify-center animate-pulse text-slate-400 dark:text-slate-500">
           <span className="font-bold text-sm">טוען תמונה... 🖼️</span>
        </div>
      )}

      {question.type === 'open_ended' ? (
        <div className="mt-4 p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/60 text-center">
          <div className="flex justify-center mb-3 text-blue-500 dark:text-blue-400">
            <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-full">
              <PenIcon />
            </div>
          </div>
          <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">שאלה פתוחה (טקסט חופשי)</h4>
          <p className="text-sm text-blue-700/80 dark:text-blue-400 max-w-sm mx-auto">
            שאלה זו דורשת כתיבת תשובה חופשית במבחן האמיתי. <br/>היא מוצגת כאן לטובת הכרות עם החומר בלבד ואינה משוקללת בציון.
          </p>
        </div>
      ) : question.type === 'cloze' ? (
         <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 transition-colors">
             {renderClozeContent()}
             
             {((mode === 'practice' && clozeState.status !== 'empty') || (mode === 'test' && isSubmitted)) && !question.isCanceled && (
                <div className={`mt-4 p-3 rounded-xl text-center font-bold text-sm animate-fade-in transition-colors
                    ${clozeState.status === 'perfect' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 
                      clozeState.status === 'wrong' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 
                      clozeState.status === 'empty' ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400' : 
                      'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900'}`}
                >
                    {clozeState.status === 'perfect' && "🏆 מצוין! כל ההשלמות נכונות."}
                    {clozeState.status === 'wrong' && "😕 כל התשובות שגויות."}
                    {clozeState.status === 'partial' && `🧐 תשובה חלקית: צדקת ב-${clozeState.correctCount} מתוך ${clozeState.total} סעיפים.`}
                    {clozeState.status === 'empty' && isSubmitted && "⚪ השאלה לא נענתה."}
                </div>
             )}
         </div>
      ) : (
        <div className="space-y-2 relative">
          {shuffledOptions?.map((option) => {
             const isSelected = mode === 'practice' 
                ? practiceSelections.includes(option.id) 
                : (isMultiSelect ? testSelections.includes(option.id) : selectedOptionId === option.id);
             
             const isEliminated = mode === 'test' && eliminatedOptions.includes(option.id) && !isSelected;

             let btnClass = "w-full text-right p-4 rounded-xl border-2 mb-3 flex flex-col sm:flex-row sm:items-center justify-between transition-all group ";
             let tagText = null;
             let tagColor = "";
             
             if (isEliminated) {
                 btnClass += "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60";
             } else if (mode === 'test' && isSubmitted) {
                if (option.isMainCorrect) { 
                  btnClass += "bg-green-100 dark:bg-green-950/30 border-green-600 dark:border-green-500 text-green-900 dark:text-green-300 font-bold shadow-md"; 
                  if (question.appealedIndexes?.length > 0) { tagText = "התשובה המקורית"; tagColor = "bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200"; }
                } else if (option.isAppealed) { 
                  btnClass += "bg-orange-100 dark:bg-orange-950/30 border-orange-600 dark:border-orange-500 text-orange-900 dark:text-orange-300 font-bold shadow-md"; 
                  tagText = "התקבל בערעור"; tagColor = "bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200"; 
                } else if (isSelected) { 
                  btnClass += "bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-600 text-red-900 dark:text-red-300 shadow-md"; 
                } else { 
                  btnClass += "bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-50 text-slate-400 dark:text-slate-500"; 
                }
             } else if (mode === 'practice') {
                if (isSelected && option.isMainCorrect) { 
                  btnClass += "bg-green-100 dark:bg-green-950/30 border-green-600 dark:border-green-500 text-green-900 dark:text-green-300 font-bold shadow-md"; 
                } else if (isSelected && option.isAppealed) { 
                  btnClass += "bg-orange-100 dark:bg-orange-950/30 border-orange-600 dark:border-orange-500 text-orange-900 dark:text-orange-300 font-bold shadow-md"; 
                  tagText = "התקבל בערעור"; tagColor = "bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200"; 
                } else if (isSelected && question.isCanceled) { 
                  btnClass += "bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-500 text-green-800 dark:text-green-300 shadow-md"; 
                } else if (isSelected) { 
                  btnClass += "bg-red-50 dark:bg-red-950/30 border-red-500 dark:border-red-600 text-red-900 dark:text-red-300 shadow-md"; 
                } else { 
                  btnClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"; 
                }
             } else {
                if (isSelected) { 
                  btnClass += "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white font-bold shadow-md"; 
                } else { 
                  btnClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-400"; 
                }
             }

             return (
               <button 
                  key={option.id} 
                  onClick={() => {
                      if (!isEliminated) handleSelectStandard(option.id);
                  }} 
                  className={`${btnClass} ${isEliminated ? 'cursor-default' : ''}`}
               >
                 <div className={`flex items-start text-right ${question.isCanceled && !isSelected ? 'opacity-50' : ''}`}>
                    {isMultiSelect && <span className="inline-block shrink-0 w-4 h-4 ml-2 mt-1 border border-slate-400 dark:border-slate-500 rounded-sm text-[10px] leading-3 text-center text-slate-700 dark:text-slate-300">{isSelected && '✓'}</span>}
                    
                    <span className={`whitespace-pre-wrap transition-all ${isEliminated ? 'line-through decoration-slate-400 dark:decoration-slate-500' : ''}`}>
                        {option.text}
                    </span>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 shrink-0">
                    {isSelected && mode === 'test' && isSubmitted && (
                        <span className="text-[10px] bg-blue-600 dark:bg-blue-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm font-bold">
                            הבחירה שלך 👈
                        </span>
                    )}

                    {tagText && <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${tagColor}`}>{tagText}</span>}
                    
                    {(mode==='practice' || (mode==='test'&&isSubmitted)) && !question.isCanceled && (
                        <>
                          {option.isCorrect && (isSelected || (mode==='test' && isSubmitted)) && <span className="text-sm">✅</span>}
                          {!option.isCorrect && isSelected && <span className="text-sm">❌</span>}
                        </>
                    )}

                    {mode === 'test' && !isSubmitted && !isSelected && onToggleEliminate && (
                        <div 
                            className={`p-1.5 rounded-full cursor-pointer transition-all border sm:opacity-0 sm:group-hover:opacity-100 ${
                                isEliminated 
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 opacity-100 hover:bg-slate-300 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                            onClick={(e) => {
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                onToggleEliminate(index, option.id);
                            }}
                            title={isEliminated ? "בטל מחיקת מסיח" : "מחק מסיח זה"}
                        >
                            {isEliminated ? <EliminateIconClosed /> : <EliminateIconOpen />}
                        </div>
                    )}
                 </div>
               </button>
             )
          })}
          
          {mode === 'test' && isSubmitted && selectedOptionId === null && testSelections.length === 0 && !question.isCanceled && (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 rounded-xl text-center font-bold text-sm border border-slate-200 dark:border-slate-700 transition-colors">
                  ⚪ השאלה לא נענתה
              </div>
          )}
        </div>
      )}

      {(mode === 'practice' || (mode === 'test' && isSubmitted)) && (
          <ExplanationBox 
              examId={examId}
              questionIndex={index}
              questionData={question}
              forceClose={isReporting}
          />
      )}

    </div>
  );
});

export default QuestionCard;