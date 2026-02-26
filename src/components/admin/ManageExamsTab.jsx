import React from 'react';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

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
                                    {filteredQuestions.map((q, idx) => {
                                        const realIndex = examQuestions.findIndex(orig => orig === q);
                                        const isCanceled = q.isCanceled === true;
                                        return (
                                            <div key={realIndex} className={`p-4 rounded-xl border-2 transition-all ${getQuestionStatusColor(q)}`}>
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
                                    {(() => {
                                        const missingCount = (exam.questions || []).filter(q => q.imageNeeded && !q.hasImage).length;
                                        if (missingCount > 0) {
                                            return <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold animate-pulse border border-red-200">🚨 חסרות {missingCount} תמונות</span>;
                                        }
                                        return null;
                                    })()}
                                    <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="מחק מבחן"><TrashIcon /></button>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setEditingExamId(exam.id)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1"><PaperclipIcon /> נספחים</button>
                                    <button onClick={() => openQuestionsEditor(exam)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1"><ImageIcon /> עריכת שאלות</button>
                                </div>
                                {editingExamId === exam.id && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 animate-fade-in">
                                        <input type="file" accept="application/pdf" onChange={e => setNewAppendicesFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => handleUpdateAppendices(exam.id)} disabled={!newAppendicesFile || status === 'processing'} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition">{status === 'processing' ? 'מעלה...' : 'שמור'}</button>
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