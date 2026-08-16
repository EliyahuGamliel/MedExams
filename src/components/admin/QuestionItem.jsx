import React, { memo, useState } from 'react';

const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;

const QuestionItem = memo(({
  q, 
  realIndex, 
  getQuestionStatusColor, 
  handleDeleteQuestion, 
  handleQuestionTextChange, 
  saveQuestionText, 
  handleOptionTextChange, 
  saveOptionText, 
  handleRemoveOptionFromQuestion, 
  handleSetMainCorrect, 
  handleToggleAppeal, 
  handleAddOptionToQuestion, 
  handleUploadQuestionImage, 
  handleToggleCancel,
  handleClozeCorrectIndexChange,
  handleAddOptionToCloze,
  handleRemoveOptionFromCloze,
  handleClozeOptionTextChange,
  saveClozeOptionText,
  handleToggleClozeAppeal,
  handleRemoveBlankFromCloze,
  handleAddBlankToCloze,
  handleRemoveQuestionImage
}) => {
  const isCanceled = q.isCanceled === true;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`p-4 rounded-xl border-2 transition-all text-right ${getQuestionStatusColor(q)} ${isExpanded ? 'shadow-md' : 'hover:border-blue-300 dark:hover:border-blue-500/50'}`}>
      
      {/* 1. אזור הכותרת (האקורדיון הראשי) */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="bg-slate-200 dark:bg-dark-border text-slate-700 dark:text-slate-200 text-xs font-black px-2 py-1 rounded-lg shrink-0 transition-colors">
            שאלה {realIndex + 1}
          </span>
          {!isExpanded && (
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px] sm:max-w-xs md:max-w-md transition-colors">
              {q.text}
            </span>
          )}
        </div>
        
        <div className="flex gap-2 items-center shrink-0">
          {isCanceled && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm">מבוטלת</span>}
          {q.imageNeeded && !q.hasImage && (<span className="text-red-600 dark:text-red-400 text-[10px] font-bold flex items-center gap-1"><AlertIcon /> חסרה תמונה</span>)}
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(realIndex); }} 
            className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1 mr-1 transition-colors" 
            title="מחק שאלה"
          >
            <TrashIcon />
          </button>

          <div className="text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-dark-border/80 rounded-full p-1 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </div>
      </div>
      
      {/* 2. אזור העריכה הפנימי המלא - מופעל בפתיחה */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700 animate-fade-in space-y-4 transition-colors">
          
          {/* תיבת טקסט ראשית של השאלה */}
          <textarea 
            value={q.text} 
            onChange={(e) => handleQuestionTextChange(realIndex, e.target.value)}
            onBlur={(e) => saveQuestionText(realIndex, e.target.value)}
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold bg-white dark:bg-dark-bg text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-400 outline-none resize-y transition-colors"
            rows={3}
          />

          {/* ניהול שאלות אמריקאיות רגילות */}
          {q.type === 'multiple_choice' && (
            <div className="bg-white dark:bg-dark-panel p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 transition-colors duration-300">
              <div className="flex justify-between items-end mb-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">ניהול התשובות:</div>
              </div>
              {q.options?.map((opt, optIdx) => {
                const isMainCorrect = Array.isArray(q.correctIndex) ? q.correctIndex.includes(optIdx) : q.correctIndex === optIdx;
                const isAppealed = (q.appealedIndexes || []).includes(optIdx);
                
                return (
                  <div key={optIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border text-sm transition-colors ${
                    isMainCorrect 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40' 
                      : 'bg-slate-50 dark:bg-dark-bg/40 border-slate-100 dark:border-slate-700/60'
                  }`}>
                    <div className="flex items-center flex-1 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-500 w-6 shrink-0">{optIdx + 1}.</span>
                      <input 
                        type="text" 
                        value={opt} 
                        onChange={(e) => handleOptionTextChange(realIndex, optIdx, e.target.value)}
                        onBlur={(e) => saveOptionText(realIndex, optIdx, e.target.value)}
                        className={`w-full p-1 bg-transparent border-b border-transparent focus:border-blue-400 outline-none transition ${
                          isMainCorrect 
                            ? 'font-bold text-green-700 dark:text-green-400' 
                            : isAppealed 
                              ? 'font-bold text-orange-600 dark:text-orange-400' 
                              : 'text-slate-600 dark:text-slate-300'
                        }`}
                      />
                    </div>
                    
                    <div className="flex gap-1 shrink-0 items-center justify-end mr-auto sm:mr-0">
                      <button onClick={() => handleRemoveOptionFromQuestion(realIndex, optIdx)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-1 mr-1 transition-colors" title="מחק תשובה"><MinusIcon /></button>
                      <button onClick={() => handleSetMainCorrect(realIndex, optIdx, false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${(!Array.isArray(q.correctIndex) && isMainCorrect) ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-white dark:bg-dark-panel border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>נכונה</button>
                      <button onClick={() => handleSetMainCorrect(realIndex, optIdx, true)} title="הוסף כתשובה נכונה נוספת" className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${Array.isArray(q.correctIndex) && isMainCorrect ? 'bg-green-700 text-white border-green-800 dark:border-green-900' : 'bg-slate-50 dark:bg-dark-bg/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-600 dark:hover:text-green-400'}`}>+</button>
                      <button onClick={() => handleToggleAppeal(realIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isAppealed ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800/80' : 'text-slate-300 dark:text-slate-600 hover:text-orange-500'}`} disabled={isMainCorrect}>{isAppealed ? 'התקבל' : 'ערעור'}</button>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => handleAddOptionToQuestion(realIndex)} className="w-full text-center py-2 text-xs font-bold text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg border border-dashed border-blue-200 dark:border-blue-900 mt-2 transition-all">+ הוסף אפשרות תשובה</button>
            </div>
          )}

          {/* תצוגת שאלות פתוחות חופשיות */}
          {q.type === 'open_ended' && (
            <div className="mb-4 bg-slate-50 dark:bg-dark-bg/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center space-y-2 transition-colors">
              <div className="inline-block bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
                📝 שאלה פתוחה (טקסט חופשי)
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium transition-colors">
                שאלה זו לא דורשת בחירת תשובות. היא תוצג לסטודנטים במהלך המבחן לטובת הכרות בלבד, <b>ולא תשוקלל בציון הסופי</b>.
              </p>
            </div>
          )}
      
          {/* עריכת שאלות מסוג השלמת טקסט (Cloze) */}
          {q.type === 'cloze' && (
            <div className="bg-white dark:bg-dark-panel p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors duration-300">
              <div className="flex justify-between items-end mb-2 border-b dark:border-slate-700 pb-2 transition-colors">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">ניהול השלמות (Cloze) מתקדם:</div>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold transition-colors">
                  🧩 שאלת השלמה/התאמה
                </span>
              </div>

              {q.clozeOptions?.map((blank, blankIndex) => (
                <div key={blankIndex} className="p-3 bg-slate-50 dark:bg-dark-bg/40 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                  
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-2 transition-colors">
                       <span className="bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">מיקום {`{{${blankIndex}}}`}</span>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveBlankFromCloze(realIndex, blankIndex); }}
                        className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-bold"
                        title="מחק השלמה זו לחלוטין"
                    >
                        <TrashIcon /> מחק השלמה
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {blank.options?.map((opt, optIdx) => {
                      const isMainCorrect = blank.correctIndex === optIdx;
                      const isAppealed = (blank.appealedIndexes || []).includes(optIdx);
                      
                      return (
                        <div key={optIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border text-sm transition-colors ${
                          isMainCorrect 
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40' 
                            : 'bg-white dark:bg-dark-panel border-slate-200 dark:border-slate-700'
                        }`}>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => handleClozeOptionTextChange(realIndex, blankIndex, optIdx, e.target.value)}
                            onBlur={(e) => saveClozeOptionText(realIndex, blankIndex, optIdx, e.target.value)}
                            className={`flex-1 p-1 bg-transparent border-b border-transparent focus:border-blue-400 outline-none transition ${
                              isMainCorrect 
                                ? 'font-bold text-green-700 dark:text-green-400' 
                                : isAppealed 
                                  ? 'font-bold text-orange-600 dark:text-orange-400' 
                                  : 'text-slate-600 dark:text-slate-300'
                            }`}
                          />
                          <div className="flex gap-1 shrink-0 items-center justify-end mr-auto sm:mr-0">
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveOptionFromCloze(realIndex, blankIndex, optIdx); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-1 mr-1 transition-colors" title="מחק תשובה"><MinusIcon /></button>
                            <button onClick={() => handleClozeCorrectIndexChange(realIndex, blankIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${isMainCorrect ? 'bg-green-600 dark:bg-green-500 text-white' : 'bg-slate-100 dark:bg-dark-border text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>נכונה</button>
                            <button onClick={() => handleToggleClozeAppeal(realIndex, blankIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isAppealed ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800/80' : 'text-slate-300 dark:text-slate-600 hover:text-orange-500'}`} disabled={isMainCorrect}>{isAppealed ? 'התקבל' : 'ערעור'}</button>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => handleAddOptionToCloze(realIndex, blankIndex)} className="w-full text-center py-2 text-xs font-bold text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg border border-dashed border-purple-200 dark:border-purple-900 mt-2 transition-all">+ הוסף מסיח למיקום זה</button>
                  </div>
               
                </div>
              ))}
              
              <button 
                onClick={() => handleAddBlankToCloze(realIndex)}
                className="w-full text-center py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 mt-2 transition-all block"
              >
                + הוסף מיקום השלמה חדש {`{{${q.clozeOptions?.length || 0}}}`}
              </button>
            </div>
          )}

          {/* שורת כפתורי פעולה תחתונים של הרכיב (העלאת תמונה/וידאו / מחיקת מדיה / פסילת שאלה) */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors">
            
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow-sm border border-transparent">
              <ImageIcon /> {q.hasImage ? 'החלף מדיה' : 'העלה מדיה'}
              <input type="file" accept="image/*, video/mp4, video/webm, video/quicktime" className="hidden" onChange={(e) => handleUploadQuestionImage(realIndex, e.target.files[0])} />
            </label>

            {/* הכפתור החדש - מופיע רק אם יש תמונה לשאלה */}
            {q.hasImage && (
                <button 
                    onClick={() => handleRemoveQuestionImage(realIndex)}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all border bg-white dark:bg-dark-panel text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 shadow-sm"
                >
                    <TrashIcon /> הסר מדיה
                </button>
            )}

            {/* רווח גמיש שידחוף את כפתור הפסילה שמאלה (או ימינה תלוי ב-RTL) כדי להפריד פעולות מחיקה מפעולות תמונה */}
            <div className="flex-1"></div>

            <button onClick={() => handleToggleCancel(realIndex)} className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${isCanceled ? 'bg-slate-200 dark:bg-dark-border text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 shadow-inner' : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/40'}`}>
              {isCanceled ? 'שחזר שאלה' : 'פסול שאלה'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default QuestionItem;