import React from 'react';

const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;

export default function UploadTab({
    studentYears,
    semesters,
    selectedStudentYear,
    setSelectedStudentYear,
    selectedSemester,
    setSelectedSemester,
    selectedCourseId,
    setSelectedCourseId,
    availableCourses,
    examYear,
    setExamYear,
    examYearsList,
    examMoed,
    setExamMoed,
    moedList,
    parsingMode,
    setParsingMode,
    file,
    setFile,
    appendicesFile,
    setAppendicesFile,
    handleUploadExam,
    status,
    debugLog
}) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">1. שיוך הקורס</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select value={selectedStudentYear} onChange={e => { setSelectedStudentYear(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 bg-white">
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">-- בחר מהרשימה --</option>
                    {availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}
                </select>
            </div>

            {selectedCourseId && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-fade-in-up">
                    <h3 className="font-bold text-blue-800 mb-3 text-sm uppercase tracking-wider">2. פרטי המבחן</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={examYear} onChange={e => setExamYear(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">
                            {examYearsList.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={examMoed} onChange={e => setExamMoed(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 bg-white text-blue-900 font-bold">
                            {moedList.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {selectedCourseId && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 animate-fade-in-up">
                    <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">3. סוג הקובץ לפענוח</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={() => setParsingMode('standard')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'standard' ? 'border-blue-600' : 'border-slate-300'}`}>
                                {parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                            </div>
                            <div className="text-right">
                                <div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div>
                                <div className="text-xs opacity-70">טופס 0</div>
                            </div>
                        </button>
                        <button onClick={() => setParsingMode('computerized')} className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'computerized' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'computerized' ? 'border-blue-600' : 'border-slate-300'}`}>
                                {parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                            </div>
                            <div className="text-right">
                                <div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative ${file ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:bg-slate-50'} transition`}>
                    <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <span className="text-2xl block mb-2">{file ? '📄' : '📝'}</span>
                    <p className="font-bold text-slate-600 text-sm">{file ? file.name : "קובץ מבחן (PDF)"}</p>
                </div>
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative ${appendicesFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'} transition`}>
                    <input type="file" accept="application/pdf" onChange={e => setAppendicesFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <span className="text-2xl block mb-2">{appendicesFile ? '📎' : '➕'}</span>
                    <p className="font-bold text-slate-600 text-sm">{appendicesFile ? appendicesFile.name : "קובץ נספחים (אופציונלי)"}</p>
                </div>
            </div>

            <button onClick={handleUploadExam} disabled={status === 'processing' || !file || !selectedCourseId} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition">
                {status === 'processing' ? '⏳ מעבד שאלות...' : '🚀 העלה הכל'}
            </button>

            {debugLog && <div className="bg-black text-green-400 p-4 rounded-xl text-left h-32 overflow-auto text-xs" dir="ltr"><pre>{debugLog}</pre></div>}
        </div>
    );
}