import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, get } from "firebase/database";

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function QuestionCard({ question, index, mode, onAnswer, isSubmitted, examId }) {
  // State למצב מבחן (בחירה יחידה)
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  
  // State חדש למצב תרגול (ריבוי בחירות)
  const [practiceSelections, setPracticeSelections] = useState([]); 

  // Cloze State
  const [clozeSelections, setClozeSelections] = useState({}); 
  const [clozeWrongAttempts, setClozeWrongAttempts] = useState({}); 

  const [imageData, setImageData] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // --- הכנת נתונים ---
  const shuffledOptions = useMemo(() => {
    if (question.type === 'cloze') return null;
    const optionsWithData = question.options.map((opt, idx) => ({
      id: idx,
      text: opt,
      isCorrect: idx === question.correctIndex
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

  useEffect(() => {
    if (question.hasImage && examId) {
      setLoadingImage(true);
      get(ref(db, `exam_images/${examId}/${index}`)).then((snapshot) => {
        if (snapshot.exists()) setImageData(snapshot.val());
        setLoadingImage(false);
      });
    } else {
      setImageData(null);
    }
  }, [question, examId, index]);

  // איפוס בחירות במעבר שאלה
  useEffect(() => {
    setSelectedOptionId(null);
    setPracticeSelections([]); 
    setClozeSelections({});
    setClozeWrongAttempts({});
  }, [question, mode]);

  // --- חישוב סטטוס להשלמה ---
  const calculateClozeStatus = (currentSelections) => {
    if (!shuffledClozeOptions) return { correctCount: 0, total: 0, status: 'empty' };
    
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

  // --- לוגיקה רגילה (מעודכנת לפי הבקשה) ---
  const handleSelectStandard = (optionId, isCorrect) => {
    if (mode === 'test' && isSubmitted) return;

    if (mode === 'practice') {
       // לוגיקה לתרגול: ריבוי בחירות + ביטול בחירה
       setPracticeSelections(prev => {
         if (prev.includes(optionId)) {
           return prev.filter(id => id !== optionId); // ביטול
         } else {
           return [...prev, optionId]; // הוספה
         }
       });
       // בתרגול אין חובה לעדכן ציון כללי בזמן אמת בצורה בינארית
    } else {
       // לוגיקה למבחן: בחירה יחידה + אפשרות ביטול (לאפשר "לא נענה")
       if (selectedOptionId === optionId) {
          setSelectedOptionId(null); // ביטול בחירה
          if (onAnswer) onAnswer(index, null); // עדכון שאין תשובה
       } else {
          setSelectedOptionId(optionId);
          if (onAnswer) onAnswer(index, isCorrect ? 'perfect' : 'wrong');
       }
    }
  };

  // --- לוגיקה מורכבת ל-Cloze ---
  const handleSelectCloze = (blankIndex, selectedId) => {
    if (mode === 'test' && isSubmitted) return;

    const newSelections = { ...clozeSelections, [blankIndex]: selectedId };
    setClozeSelections(newSelections);

    const optionsForBlank = shuffledClozeOptions[blankIndex];
    const isChoiceCorrect = optionsForBlank.find(o => o.id === selectedId)?.isCorrect;

    if (mode === 'practice' && !isChoiceCorrect) {
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
            const isCorrect = selectedOpt?.isCorrect;

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
                  {(mode === 'test' && isSubmitted && !isCorrect) && (
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
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6 relative overflow-hidden">
      <div className="mb-4">
         <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">
          שאלה {index + 1}
        </span>
      </div>

      {question.type === 'multiple_choice' && (
         <h3 className="text-xl font-bold text-slate-800 mb-4">{question.text}</h3>
      )}

      {loadingImage && <div className="text-sm text-slate-400 animate-pulse mb-4">טוען תמונה...</div>}
      {imageData && (
          <div className="mb-6 rounded-xl overflow-hidden border border-slate-200">
            <img src={`data:image/png;base64,${imageData}`} alt="Visual" className="w-full max-h-96 object-contain bg-slate-50" />
          </div>
      )}

      {question.type === 'cloze' ? (
         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
             {renderClozeContent()}
             
             {((mode === 'practice' && clozeState.status !== 'empty') || (mode === 'test' && isSubmitted)) && (
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
             // בדיקה האם הכפתור נבחר (שונה בין תרגול למבחן)
             const isSelected = mode === 'practice' 
                ? practiceSelections.includes(option.id) 
                : selectedOptionId === option.id;

             let btnClass = "w-full text-right p-4 rounded-xl border mb-3 flex justify-between items-center transition-all ";
             
             if (mode === 'test' && isSubmitted) {
                if (option.isCorrect) btnClass += "bg-green-100 border-green-500 text-green-900 font-bold";
                else if (isSelected) btnClass += "bg-red-50 border-red-300 text-red-900 opacity-80";
                else btnClass += "bg-slate-50 opacity-50";
             } else if (mode === 'practice') {
                if (isSelected && option.isCorrect) btnClass += "bg-green-100 border-green-500 text-green-900 font-bold";
                else if (isSelected) btnClass += "bg-red-50 border-red-300 text-red-900";
                else btnClass += "bg-white border-slate-200 hover:bg-slate-50";
             } else {
                if (isSelected) btnClass += "bg-blue-600 border-blue-600 text-white font-bold";
                else btnClass += "bg-white border-slate-200 hover:border-blue-300";
             }

             return (
               <button key={option.id} onClick={() => handleSelectStandard(option.id, option.isCorrect)} className={btnClass}>
                 <span>{option.text}</span>
                 {(mode==='practice' || (mode==='test'&&isSubmitted)) && (
                    <>
                      {option.isCorrect && (isSelected || (mode==='test' && isSubmitted)) && <span>✅</span>}
                      {!option.isCorrect && isSelected && <span>❌</span>}
                    </>
                 )}
               </button>
             )
          })}
          
          {/* בוטלה ההודעה הישנה של מצב תרגול כי כעת יש ריבוי בחירות */}

          {/* הודעה על אי-מענה במצב מבחן (לאחר הגשה) */}
          {mode === 'test' && isSubmitted && selectedOptionId === null && (
              <div className="mt-4 p-3 bg-slate-100 text-slate-500 rounded-xl text-center font-bold text-sm border border-slate-200">
                  ⚪ השאלה לא נענתה
              </div>
          )}
        </div>
      )}
    </div>
  );
}