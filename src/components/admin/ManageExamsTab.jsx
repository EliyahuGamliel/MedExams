import React from 'react';
import QuestionItem from './QuestionItem';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function ManageExamsTab({
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
    
    // פונקציות Cloze
    handleClozeCorrectIndexChange, handleAddOptionToCloze, 
    handleRemoveOptionFromCloze, handleClozeOptionTextChange, 
    saveClozeOptionText, handleToggleClozeAppeal,

    selectedStudentYear, setSelectedStudentYear, studentYears,
    selectedSemester, setSelectedSemester, semesters,
    selectedCourseId, setSelectedCourseId, availableCourses,
    filteredExamsForEdit, handleDeleteExam,
    editingExamId, setEditingExamId,
    newAppendicesFile, setNewAppendicesFile,
    handleUpdateAppendices, openQuestionsEditor
}) {
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
                                            <QuestionItem
                                                key={realIndex} 
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
                                {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 mb-6 bg-white">
                            <option value="">-- בחר מהרשימה --</option>
                            {availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}
                        </select>

                        {filteredExamsForEdit.map(exam => (
                            <div key={exam.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-bold text-slate-800">{exam.title}</span>
                                        <span className="text-xs text-slate-400 mr-2">({exam.questionCount || 0} שאלות)</span>
                                    </div>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="מחק מבחן"><TrashIcon /></button>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setEditingExamId(exam.id)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1"><PaperclipIcon /> נספחים</button>
                                    <button onClick={() => openQuestionsEditor(exam)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><ImageIcon /> עריכת שאלות</button>
                                </div>
                                {editingExamId === exam.id && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 animate-fade-in">
                                        <input type="file" accept="application/pdf" onChange={e => setNewAppendicesFile(e.target.files[0])} className="block w-full text-sm text-slate-500" />
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleUpdateAppendices(exam.id)} disabled={!newAppendicesFile || status === 'processing'} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">שמור</button>
                                            <button onClick={() => { setEditingExamId(null); setNewAppendicesFile(null); }} className="text-slate-400 px-4 py-2 text-sm font-bold hover:text-slate-600">ביטול</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}