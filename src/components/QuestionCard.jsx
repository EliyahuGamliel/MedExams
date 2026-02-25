import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, push, set } from "firebase/database";

// פונקציית עזר לערבוב
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// אייקון לדיווח
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;

export default function QuestionCard({ question, index, mode, onAnswer, isSubmitted, imageUrl, examId }) {
  
  // State למצב מבחן (בחירה יחידה)
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  
  // State למצב תרגול (ריבוי בחירות)
  const [practiceSelections, setPracticeSelections] = useState([]); 

  // Cloze State
  const [clozeSelections, setClozeSelections] = useState({}); 
  const [clozeWrongAttempts, setClozeWrongAttempts] = useState({}); 

  // --- States לדיווח תקלות ---
  const [isReporting, setIsReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState('idle');

  // --- הכנת נתונים חכמה (כולל ערעורים וביטולים) ---
  const shuffledOptions = useMemo(() => {
    if (question.type === 'cloze') return null;

    const appeals = question.appealedIndexes || [];
    const isCanceled = question.isCanceled === true;

    const optionsWithData = question.options.map((opt, idx) => ({
      id: idx,
      text: opt,
      // אם השאלה מבוטלת - כל תשובה נכונה. אחרת: נכונה אם היא המקורית או חלק מהערעורים שהתקבלו.
      isCorrect: isCanceled || idx === question.correctIndex || appeals.includes(idx),
      isAppealed: appeals.includes(idx),
      isMainCorrect: idx === question.correctIndex
    }));
    return shuffleArray(optionsWithData);
  }, [question]);

  const shuffledClozeOptions = useMemo(() => {
    if (question.type !== 'cloze') return null;
    return question.clozeOptions.map(blank => {
      const opts = blank.options.map((opt, idx) => ({
        id: idx,
        text: opt,
        isCorrect: idx === blank.correctIndex
      }));
      return shuffleArray(opts);
    });
  }, [question]);

  // איפוס בחירות במעבר שאלה
  useEffect(() => {
    setSelectedOptionId(null);
    setPracticeSelections([]); 
    setClozeSelections({});
    setClozeWrongAttempts({});
  }, [question, mode]);

  // --- חישוב סטטוס להשלמה (Cloze) ---
  const calculateClozeStatus = (currentSelections) => {
    if (!shuffledClozeOptions) return { correctCount: 0, total: 0, status: 'empty' };
    
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

  // --- לוגיקה רגילה לאמריקאיות ---
  const handleSelectStandard = (optionId, isCorrect) => {
    if (mode === 'test' && isSubmitted) return;

    if (mode === 'practice') {
       setPracticeSelections(prev => {
         if (prev.includes(optionId)) {
           return prev.filter(id => id !== optionId);
         } else {
           return [...prev, optionId];
         }
       });
    } else {
       if (selectedOptionId === optionId) {
          setSelectedOptionId(null);
          if (onAnswer) onAnswer(index, question.isCanceled ? 'perfect' : null);
       } else {
          setSelectedOptionId(optionId);
          if (onAnswer) onAnswer(index, (isCorrect || question.isCanceled) ? 'perfect' : 'wrong');
       }
    }
  };

  // --- לוגיקה ל-Cloze ---
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

  // --- פונקציית הדיווח ---
  const handleReportSubmit = async () => {
    if (!reportText.trim()) return;
    setReportStatus('submitting');
    
    try {
      const reportRef = push(ref(db, 'reported_errors'));
      await set(reportRef, {
        examId: examId || "unknown",
        questionIndex: index,
        questionText: question.text,
        reportText: reportText,
        timestamp: new Date().toISOString()
      });
      
      setReportStatus('success');
      setTimeout(() => {
        setIsReporting(false);
        setReportStatus('idle');
        setReportText("");
      }, 2000); 
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה בשליחת הדיווח. ודא שעדכנת את חוקי האבטחה ב-Firebase.");
      setReportStatus('idle');
    }
  };

  // --- רינדור Cloze ---
  const renderClozeContent = () => {
    return (
      <div className="text-lg text-slate-800 whitespace-pre-line leading-loose" dir="rtl">
        {question.text.split(/(\{\{\d+\}\})/g).map((part, i) => {
          const match = part.match(/\{\{(\d+)\}\}/);
          if (match) {
            const blankIndex = parseInt(match[1]);
            const options = shuffledClozeOptions[blankIndex];
            const currentSelection = clozeSelections[blankIndex];
            
            let borderClass = "border-slate-300";
            let bgClass = "bg-white";
            let textClass = "text-slate-700";

            const selectedOpt = options.find(o => o.id === currentSelection);
            const isCorrect = selectedOpt?.isCorrect || question.isCanceled;

            if (mode === 'test' && isSubmitted) {
                if (isCorrect) { borderClass = "border-green-500"; bgClass = "bg-green-50"; textClass = "text-green-800 font-bold"; }
                else { borderClass = "border-red-500"; bgClass = "bg-red-50"; textClass = "text-red-800 line-through"; }
            } else if (mode === 'practice' && currentSelection !== undefined) {
                if (isCorrect) { borderClass = "border-green-500"; bgClass = "bg-green-50"; textClass = "text-green-800"; }
                else { borderClass = "border-red-500"; bgClass = "bg-red-50"; textClass = "text-red-800"; }
            } else if (currentSelection !== undefined) {
                borderClass = "border-blue-500"; bgClass = "bg-blue-50"; textClass = "text-blue-800";
            }

            return (
              <span key={i} className="inline-block mx-1 align-middle">
                 <select
                    value={currentSelection ?? ""}
                    onChange={(e) => handleSelectCloze(blankIndex, parseInt(e.target.value))}
                    disabled={mode === 'test' && isSubmitted}
                    className={`px-2 py-1 rounded-lg border-2 focus:outline-none cursor-pointer text-sm ${borderClass} ${bgClass} ${textClass}`}
                    dir="rtl"
                  >
                    <option value="" disabled>...</option>
                    {options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.text}</option>
                    ))}
                  </select>
                  {(mode === 'test' && isSubmitted && !isCorrect && !question.isCanceled) && (
                      <span className="text-xs text-green-600 font-bold mr-1">
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
    <div className={`rounded-3xl shadow-sm border p-6 mb-6 relative overflow-hidden transition-all ${question.isCanceled ? 'bg-slate-100/60 border-slate-300' : 'bg-white border-slate-100'}`}>
      
      {/* מודאל דיווח */}
      {isReporting && (
        <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col p-6 animate-fade-in">
           <h4 className="font-bold text-slate-800 mb-2">מצאת טעות בשאלה?</h4>
           {reportStatus === 'success' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-green-600 font-bold text-center">
               <span className="text-4xl mb-2">✅</span>
               תודה! הדיווח נשלח למנהל המערכת.
             </div>
           ) : (
             <>
               <p className="text-xs text-slate-500 mb-3">תאר בקצרה מה הבעיה (למשל: התשובה שכוללת את המילה 'אוסמוזה' אמורה להיות הנכונה).</p>
               <textarea 
                 value={reportText} 
                 onChange={(e) => setReportText(e.target.value)}
                 className="flex-1 w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none bg-white"
                 placeholder="פירוט הטעות..."
               />
               <div className="flex gap-2 mt-4">
                 <button onClick={handleReportSubmit} disabled={!reportText.trim() || reportStatus === 'submitting'} className="flex-1 bg-red-500 text-white font-bold py-2 rounded-xl text-sm hover:bg-red-600 disabled:bg-slate-300 transition">
                   {reportStatus === 'submitting' ? 'שולח...' : 'שלח דיווח'}
                 </button>
                 <button onClick={() => setIsReporting(false)} className="px-4 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition">ביטול</button>
               </div>
             </>
           )}
        </div>
      )}

      {/* באנר שאלה מבוטלת למשתמש */}
      {question.isCanceled && (
        <div className="absolute top-0 left-0 w-full bg-red-500 text-white text-center py-1 text-xs font-bold tracking-widest shadow-md">
          שאלה מבוטלת - אינה נכללת בציון (כל תשובה נכונה)
        </div>
      )}

      <div className={`flex justify-between items-center mb-4 ${question.isCanceled ? 'mt-4' : ''}`}>
         <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
          שאלה {index + 1}
        </span>
        <button onClick={() => setIsReporting(true)} className="text-slate-400 hover:text-red-500 transition-colors text-xs font-bold flex items-center gap-1 bg-slate-50 hover:bg-red-50 px-2 py-1 rounded-lg">
           <FlagIcon /> דווח על טעות
        </button>
      </div>

      {question.type === 'multiple_choice' && (
         <h3 className={`text-xl font-bold mb-4 ${question.isCanceled ? 'text-slate-500' : 'text-slate-800'}`}>
           {question.text}
         </h3>
      )}

      {/* --- תמונות --- */}
      {question.hasImage && imageUrl && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-white flex justify-center">
            <img 
              src={imageUrl} 
              alt="Question illustration" 
              className="w-full max-h-96 object-contain" 
              loading="lazy"
            />
          </div>
      )}
      {question.hasImage && !imageUrl && (
        <div className="mb-6 h-48 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center animate-pulse text-slate-400">
           <span className="font-bold text-sm">טוען תמונה... 🖼️</span>
        </div>
      )}
      {/* ------------------------------- */}

      {question.type === 'cloze' ? (
         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
             {renderClozeContent()}
             
             {((mode === 'practice' && clozeState.status !== 'empty') || (mode === 'test' && isSubmitted)) && !question.isCanceled && (
                <div className={`mt-4 p-3 rounded-xl text-center font-bold text-sm animate-fade-in
                    ${clozeState.status === 'perfect' ? 'bg-green-100 text-green-700' : 
                      clozeState.status === 'wrong' ? 'bg-red-100 text-red-700' : 
                      clozeState.status === 'empty' ? 'bg-slate-100 text-slate-500' : 
                      'bg-orange-100 text-orange-700 border border-orange-200'}
                `}>
                    {clozeState.status === 'perfect' && "🏆 מצוין! כל ההשלמות נכונות."}
                    {clozeState.status === 'wrong' && "😕 כל התשובות שגויות."}
                    {clozeState.status === 'partial' && `🧐 תשובה חלקית: צדקת ב-${clozeState.correctCount} מתוך ${clozeState.total} סעיפים.`}
                    {clozeState.status === 'empty' && isSubmitted && "⚪ השאלה לא נענתה."}
                </div>
             )}
         </div>
      ) : (
        <div className="space-y-2">
          {shuffledOptions?.map((option) => {
             const isSelected = mode === 'practice' 
                ? practiceSelections.includes(option.id) 
                : selectedOptionId === option.id;

             // שינינו ל-border-2 כדי שיהיה עקבי ואחיד במעברים
             let btnClass = "w-full text-right p-4 rounded-xl border-2 mb-3 flex flex-col sm:flex-row sm:items-center justify-between transition-all ";
             let tagText = null;
             let tagColor = "";
             
             if (mode === 'test' && isSubmitted) {
                if (option.isMainCorrect) { 
                  // אם זו התשובה הנכונה, נצבע בירוק חזק רק אם בחרת בה, אחרת ירוק חלש
                  btnClass += isSelected ? "bg-green-100 border-green-600 text-green-900 font-bold shadow-md" : "bg-green-50 border-green-300 text-green-800"; 
                  if (question.appealedIndexes?.length > 0) { tagText = "התשובה המקורית"; tagColor = "bg-green-200 text-green-800"; }
                } else if (option.isAppealed) { 
                  // כנ"ל לגבי תשובת ערעור
                  btnClass += isSelected ? "bg-orange-100 border-orange-600 text-orange-900 font-bold shadow-md" : "bg-orange-50 border-orange-300 text-orange-800"; 
                  tagText = "התקבל בערעור"; tagColor = "bg-orange-200 text-orange-800"; 
                } else if (isSelected) { 
                  // אם בחרת תשובה שגויה
                  btnClass += "bg-red-50 border-red-500 text-red-900 shadow-md"; 
                } else { 
                  // תשובה לא נכונה שלא נבחרה
                  btnClass += "bg-slate-50 border-slate-100 opacity-50"; 
                }
             } else if (mode === 'practice') {
                if (isSelected && option.isMainCorrect) { 
                  btnClass += "bg-green-100 border-green-600 text-green-900 font-bold shadow-md"; 
                } else if (isSelected && option.isAppealed) { 
                  btnClass += "bg-orange-100 border-orange-600 text-orange-900 font-bold shadow-md"; 
                  tagText = "התקבל בערעור"; tagColor = "bg-orange-200 text-orange-800"; 
                } else if (isSelected && question.isCanceled) { 
                  btnClass += "bg-green-50 border-green-400 text-green-800 shadow-md"; 
                } else if (isSelected) { 
                  btnClass += "bg-red-50 border-red-500 text-red-900 shadow-md"; 
                } else { 
                  btnClass += "bg-white border-slate-200 hover:bg-slate-50"; 
                }
             } else {
                if (isSelected) { 
                  btnClass += "bg-blue-600 border-blue-600 text-white font-bold shadow-md"; 
                } else { 
                  btnClass += "bg-white border-slate-200 hover:border-blue-300"; 
                }
             }

             return (
               <button key={option.id} onClick={() => handleSelectStandard(option.id, option.isCorrect)} className={btnClass}>
                 <span className={`${question.isCanceled && !isSelected ? 'opacity-50' : ''}`}>{option.text}</span>
                 
                 <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    {/* תגית הבחירה שלך תופיע רק במצב מבחן אחרי הגשה */}
                    {isSelected && mode === 'test' && isSubmitted && (
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm font-bold">
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
                 </div>
               </button>
             )
          })}
          
          {mode === 'test' && isSubmitted && selectedOptionId === null && !question.isCanceled && (
              <div className="mt-4 p-3 bg-slate-100 text-slate-500 rounded-xl text-center font-bold text-sm border border-slate-200">
                  ⚪ השאלה לא נענתה
              </div>
          )}
        </div>
      )}
    </div>
  );
}