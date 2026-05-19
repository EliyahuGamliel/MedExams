import React from 'react';
import QuestionItem from './QuestionItem';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const AiExplanationManager = ({ questionIndex, explanationData, onDelete }) => {
    if (!explanationData) return null;
  
    const { likes = 0, dislikes = 0 } = explanationData;
    const isHighAlert = dislikes >= 10;
  
    return (
      <div className={`mt-2 mb-6 p-3 rounded-xl border flex items-center justify-between ${isHighAlert ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">סטטוס הסבר AI</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs font-bold text-green-600">👍 {likes}</span>
              <span className={`flex items-center gap-1 text-xs font-bold ${isHighAlert ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>
                👎 {dislikes}
                {isHighAlert && <span className="mr-1 text-red-500">(דורש טיפול!)</span>}
              </span>
            </div>
          </div>
        </div>
  
        <button
          onClick={() => onDelete(questionIndex)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isHighAlert 
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          {isHighAlert ? 'מחק הסבר מטעה' : 'אפס הסבר'}
        </button>
      </div>
    );
};

export default function ManageExamsTab({
    userData,
    questionsEditorId, setQuestionsEditorId, status,
    showMissingImagesOnly, setShowMissingImagesOnly,
    newQuestionOptionsCount, setNewQuestionOptionsCount,
    handleAddQuestion, filteredQuestions, examQuestions,
    getQuestionStatusColor, handleDeleteQuestion,
    handleQuestionTextChange, saveQuestionText,
    handleOptionTextChange, saveOptionText,
    handleRemoveOptionFromQuestion, handleSetMainCorrect,
    handleToggleAppeal, handleAddOptionToQuestion,
    handleUploadQuestionImage, handleToggleCancel,
    
    handleClozeCorrectIndexChange, handleAddOptionToCloze, 
    handleRemoveOptionFromCloze, handleClozeOptionTextChange, 
    saveClozeOptionText, handleToggleClozeAppeal,

    handleToggleVerify, runOneTimeMigration,

    selectedStudentYear, setSelectedStudentYear, studentYears,
    selectedSemester, setSelectedSemester, semesters,
    selectedCourseId, setSelectedCourseId, availableCourses,
    filteredExamsForEdit, handleDeleteExam,
    editingExamId, setEditingExamId,
    newAppendicesFile, setNewAppendicesFile,
    handleUpdateAppendices, 
    handleDeleteAppendices, // <--- הנה הפונקציה מה-props
    openQuestionsEditor,
    
    handleDeleteAiExplanation,
    
    handleUpdateExamYear,
    examYearsList
}) {

    const allowedStudentYears = studentYears.filter(year => {
        if (userData?.role === 'super_admin') return true;
        if (userData?.role === 'editor') return userData?.allowed_years?.[year] === true;
        return false;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                {questionsEditorId ? (
                    <div>
                        <button onClick={() => setQuestionsEditorId(null)} className="text-sm text-purple-600 font-bold mb-4 flex items-center gap-1 hover:underline">← חזור לרשימת המבחנים</button>

                        {status === 'processing' && <div className="text-center py-10 text-purple-600 font-bold animate-pulse">טוען שאלות...</div>}

                        {status !== 'processing' && (
                            <>
                                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={showMissingImagesOnly} onChange={e => setShowMissingImagesOnly(e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                        <span className="text-sm font-bold text-slate-600">הצג רק שאלות שחסרה להן תמונה 🚨</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">מספר אפשרויות:</span>
                                        <input type="number" min="2" max="10" value={newQuestionOptionsCount} onChange={e => setNewQuestionOptionsCount(Number(e.target.value))} className="w-12 p-1 text-center border border-slate-300 rounded-lg text-xs" />
                                        <button onClick={handleAddQuestion} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1"><PlusIcon /> הוסף שאלה חדשה</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {filteredQuestions.map((q) => {
                                        const realIndex = examQuestions.findIndex(orig => orig === q);
                                        return (
                                            <div key={realIndex}>
                                                <QuestionItem
                                                    q={q}
                                                    realIndex={realIndex}
                                                    getQuestionStatusColor={getQuestionStatusColor}
                                                    handleDeleteQuestion={handleDeleteQuestion}
                                                    handleQuestionTextChange={handleQuestionTextChange}
                                                    saveQuestionText={saveQuestionText}
                                                    handleOptionTextChange={handleOptionTextChange}
                                                    saveOptionText={saveOptionText}
                                                    handleRemoveOptionFromQuestion={handleRemoveOptionFromQuestion}
                                                    handleSetMainCorrect={handleSetMainCorrect}
                                                    handleToggleAppeal={handleToggleAppeal}
                                                    handleAddOptionToQuestion={handleAddOptionToQuestion}
                                                    handleUploadQuestionImage={handleUploadQuestionImage}
                                                    handleToggleCancel={handleToggleCancel}
                                                    
                                                    handleClozeCorrectIndexChange={handleClozeCorrectIndexChange}
                                                    handleAddOptionToCloze={handleAddOptionToCloze}
                                                    handleRemoveOptionFromCloze={handleRemoveOptionFromCloze}
                                                    handleClozeOptionTextChange={handleClozeOptionTextChange}
                                                    saveClozeOptionText={saveClozeOptionText}
                                                    handleToggleClozeAppeal={handleToggleClozeAppeal}
                                                />
                                                <AiExplanationManager 
                                                    questionIndex={realIndex} 
                                                    explanationData={q.explanationData} 
                                                    onDelete={handleDeleteAiExplanation} 
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <select value={selectedStudentYear} onChange={e => { setSelectedStudentYear(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                                {allowedStudentYears.length === 0 && <option value="">אין לך הרשאה לאף שנה</option>}
                                {allowedStudentYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>

                            <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 mb-6 bg-white">
                            <option value="">-- בחר מהרשימה --</option>
                            {availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}
                        </select>

                        {filteredExamsForEdit.map(exam => {
                            const canEditThisExam = 
                                userData?.role === 'super_admin' || 
                                (userData?.role === 'editor' && userData?.allowed_years?.[exam.studentYear] === true);

                            if (!canEditThisExam) return null;

                            return (
                                <div key={exam.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md">
                                    
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-lg leading-tight">{exam.title}</span>
                                            <span className="text-xs text-slate-400 font-bold mt-1">{exam.questionCount || 0} שאלות במאגר</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteExam(exam.id)} 
                                            className="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 transition-colors p-2 rounded-xl shrink-0" 
                                            title="מחק מבחן"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        {handleUpdateExamYear && examYearsList && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">שנת מבחן:</span>
                                                <select
    value={exam.examYear || ""}
    onChange={(e) => handleUpdateExamYear(exam.id, e.target.value)}
    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
>
    <option value="" disabled>בחר שנה...</option>
    {examYearsList.map(year => (
        <option key={year} value={year}>{year}</option>
    ))}
</select>
                                            </div>
                                        )}

                                        <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                                        <button 
                                            onClick={() => handleToggleVerify(exam.id, exam.isVerified)}
                                            className={`flex-1 sm:flex-none text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all border shadow-sm flex items-center justify-center gap-1 ${
                                                exam.isVerified 
                                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                                            }`}
                                        >
                                            {exam.isVerified ? '✅ מאומת' : '⚠️ הגהת AI חסרה'}
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setEditingExamId(exam.id)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                            <PaperclipIcon /> נספחים
                                        </button>
                                        <button onClick={() => openQuestionsEditor(exam)} className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                                            <ImageIcon /> עריכת שאלות
                                        </button>
                                    </div>

                                    {/* ========================================================= */}
                                    {/* אזור העלאת/מחיקת נספחים החדש! */}
                                    {/* ========================================================= */}
                                    {editingExamId === exam.id && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in-quick mt-1">
                                            
                                            {/* מזהה אם כבר יש נספח קיים ומציג כפתור מחיקה */}
                                            {exam.hasAppendices && (
                                                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                                                    <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                                                        <PaperclipIcon /> קיים קובץ נספחים למבחן זה
                                                    </span>
                                                    <button 
                                                        onClick={() => handleDeleteAppendices(exam.id)}
                                                        disabled={status === 'processing'}
                                                        className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 shadow-sm"
                                                    >
                                                        <TrashIcon /> מחק נספח
                                                    </button>
                                                </div>
                                            )}

                                            <label className="block text-xs font-bold text-slate-500 mb-2">
                                                {exam.hasAppendices ? 'החלף קובץ נספח (PDF):' : 'העלה קובץ נספחים חדש (PDF):'}
                                            </label>
                                            
                                            <input type="file" accept="application/pdf" onChange={e => setNewAppendicesFile(e.target.files[0])} className="block w-full text-sm text-slate-500 mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                            
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdateAppendices(exam.id)} disabled={!newAppendicesFile || status === 'processing'} className="bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition disabled:opacity-50">שמור קובץ</button>
                                                <button onClick={() => { setEditingExamId(null); setNewAppendicesFile(null); }} className="text-slate-500 px-4 py-2 text-sm font-bold hover:text-slate-800 transition">סגור</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}