import React, { memo } from 'react';

const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;

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
  handleToggleCancel 
}) => {
  const isCanceled = q.isCanceled === true;

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${getQuestionStatusColor(q)}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-1 rounded-lg">שאלה {realIndex + 1}</span>
        <div className="flex gap-2 items-center">
          {isCanceled && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-bold">מבוטלת</span>}
          {q.imageNeeded && !q.hasImage && (<span className="text-red-600 text-[10px] font-bold flex items-center gap-1"><AlertIcon /> דרושה תמונה</span>)}
          <button onClick={() => handleDeleteQuestion(realIndex)} className="text-slate-400 hover:text-red-500" title="מחק שאלה"><TrashIcon /></button>
        </div>
      </div>
      
      <textarea 
        value={q.text} 
        onChange={(e) => handleQuestionTextChange(realIndex, e.target.value)}
        onBlur={(e) => saveQuestionText(realIndex, e.target.value)}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold mb-4 bg-white focus:ring-2 focus:ring-blue-400 outline-none resize-y"
        rows={3}
      />

      {q.type === 'multiple_choice' && (
        <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-end mb-2">
            <div className="text-xs font-bold text-slate-500">ניהול התשובות:</div>
            {Array.isArray(q.correctIndex) && q.correctIndex.length > 1 && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                📚 בחירה מרובה ({q.correctIndex.length} תשובות)
              </span>
            )}
          </div>

          {q.options?.map((opt, optIdx) => {
            const isMainCorrect = Array.isArray(q.correctIndex) ? q.correctIndex.includes(optIdx) : q.correctIndex === optIdx;
            const isAppealed = (q.appealedIndexes || []).includes(optIdx);
            return (
              <div key={optIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg border text-sm group transition-colors ${isMainCorrect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                <span className="font-bold text-slate-400 w-6">{optIdx + 1}.</span>
                <input 
                  type="text" 
                  value={opt} 
                  onChange={(e) => handleOptionTextChange(realIndex, optIdx, e.target.value)}
                  onBlur={(e) => saveOptionText(realIndex, optIdx, e.target.value)}
                  className={`flex-1 p-1 bg-transparent border-b border-transparent focus:border-blue-400 outline-none transition ${isMainCorrect ? 'font-bold text-green-700' : isAppealed ? 'font-bold text-orange-600' : 'text-slate-600'}`}
                />
                <div className="flex gap-1 shrink-0 items-center">
                  <button onClick={() => handleRemoveOptionFromQuestion(realIndex, optIdx)} className="text-slate-300 hover:text-red-500 p-1 mr-1" title="מחק תשובה"><MinusIcon /></button>
                  <button onClick={() => handleSetMainCorrect(realIndex, optIdx, false)} className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${(!Array.isArray(q.correctIndex) && isMainCorrect) ? 'bg-green-600 text-white' : 'bg-white border border-slate-300 text-slate-500 hover:bg-slate-100'}`}>נכונה</button>
                  <button onClick={() => handleSetMainCorrect(realIndex, optIdx, true)} title="הוסף כתשובה נכונה נוספת" className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${Array.isArray(q.correctIndex) && isMainCorrect ? 'bg-green-700 text-white border-green-800' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-green-50 hover:text-green-600'}`}>+</button>
                  <button onClick={() => handleToggleAppeal(realIndex, optIdx)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${isAppealed ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'text-slate-300 hover:text-orange-500'}`} disabled={isMainCorrect}>{isAppealed ? 'התקבל' : 'ערעור'}</button>
                </div>
              </div>
            )
          })}
          <button onClick={() => handleAddOptionToQuestion(realIndex)} className="w-full text-center py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 rounded-lg border border-dashed border-blue-200 mt-2 transition">+ הוסף אפשרות תשובה</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm">
          <ImageIcon /> {q.hasImage ? 'החלף תמונה' : 'העלה תמונה לשאלה'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(realIndex, e.target.files[0])} />
        </label>
        <button onClick={() => handleToggleCancel(realIndex)} className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${isCanceled ? 'bg-slate-200 text-slate-600 border-slate-300 shadow-inner' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>
          {isCanceled ? 'שחזר שאלה' : 'פסול שאלה'}
        </button>
      </div>
    </div>
  );
});

export default QuestionItem;