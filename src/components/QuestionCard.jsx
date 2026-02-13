import { useState, useEffect, useMemo } from 'react';

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function QuestionCard({ question, index, mode, onAnswer, isSubmitted }) {
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const shuffledOptions = useMemo(() => {
    const optionsWithData = question.options.map((opt, idx) => ({
      id: idx,
      text: opt,
      isCorrect: idx === question.correctIndex
    }));
    return shuffleArray(optionsWithData);
  }, [question]);

  useEffect(() => {
    setSelectedOptionId(null);
    setIsRevealed(false);
  }, [question, mode]);

  const handleSelect = (optionId, isCorrect) => {
    // מניעת שינוי אם:
    // 1. זה תרגול וכבר נחשף
    // 2. זה מבחן והוא כבר הוגש (isSubmitted)
    if ((mode === 'practice' && isRevealed) || (mode === 'test' && isSubmitted)) return;

    setSelectedOptionId(optionId);

    if (mode === 'practice') {
      setIsRevealed(true);
    } 
    
    if (onAnswer) {
      onAnswer(index, isCorrect);
    }
  };

  const getButtonStyles = (option) => {
    const isSelected = selectedOptionId === option.id;
    const baseStyle = "w-full text-right p-4 rounded-xl border transition-all duration-200 mb-3 flex justify-between items-center ";

    // --- מצב 1: תרגול (או מבחן שהוגש!) ---
    // אם זה תרגול חשוף, או מבחן שהוגש -> מראים ירוק/אדום
    if ((mode === 'practice' && isRevealed) || (mode === 'test' && isSubmitted)) {
      if (option.isCorrect) {
        return baseStyle + "bg-green-100 border-green-500 text-green-900 font-bold shadow-sm";
      }
      if (isSelected && !option.isCorrect) {
        return baseStyle + "bg-red-50 border-red-300 text-red-900 opacity-80";
      }
      return baseStyle + "bg-slate-50 border-transparent opacity-50";
    }

    // --- מצב 2: מבחן פעיל (לפני הגשה) ---
    if (mode === 'test' && !isSubmitted) {
      if (isSelected) {
        return baseStyle + "bg-blue-600 border-blue-600 text-white font-bold shadow-md transform scale-[1.01]";
      }
      return baseStyle + "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700";
    }

    // ברירת מחדל
    return baseStyle + "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700";
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-6 animate-fade-in">
      <div className="mb-6">
        <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
          שאלה {index + 1}
        </span>
        <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
          {question.text}
        </h3>
      </div>
      
      <div className="space-y-2">
        {shuffledOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id, option.isCorrect)}
            className={getButtonStyles(option)}
          >
            <span className="flex-1">{option.text}</span>
            
            {/* אייקונים: מופיעים בתרגול, או במבחן לאחר הגשה */}
            {((mode === 'practice' && isRevealed) || (mode === 'test' && isSubmitted)) && (
              <span className="mr-3">
                {option.isCorrect && '✅'}
                {selectedOptionId === option.id && !option.isCorrect && '❌'}
              </span>
            )}
            
            {/* סימון כחול במבחן פעיל */}
            {mode === 'test' && !isSubmitted && selectedOptionId === option.id && (
              <span className="bg-white/20 p-1 rounded-full">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* משוב טקסטואלי - מופיע בתרגול, או במבחן אחרי הגשה */}
      {((mode === 'practice' && isRevealed) || (mode === 'test' && isSubmitted)) && (
        <div className={`mt-4 text-sm font-bold p-3 rounded-xl text-center animate-pulse ${
           shuffledOptions.find(o => o.id === selectedOptionId)?.isCorrect 
             ? "bg-green-50 text-green-700" 
             : "bg-red-50 text-red-600"
        }`}>
           {shuffledOptions.find(o => o.id === selectedOptionId)?.isCorrect 
             ? "✨ תשובה נכונה!" 
             : `😅 טעות. התשובה הנכונה היא: ${shuffledOptions.find(o => o.isCorrect).text}`}
        </div>
      )}
    </div>
  );
}