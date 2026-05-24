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
        <div className="space-y-6 animate-fade-in text-right">
            
            {/* 1. שיוך הקורס - מותאם למצב לילה */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors duration-300">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wider transition-colors">1. שיוך הקורס</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select value={selectedStudentYear} onChange={e => { setSelectedStudentYear(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                    <option value="">-- בחר מהרשימה --</option>
                    {availableCourses.map(([id, course]) => (<option key={id} value={id}>{course.name}</option>))}
                </select>
            </div>

            {/* 2. פרטי המבחן - מותאם למצב לילה */}
            {selectedCourseId && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 animate-fade-in-up transition-colors duration-300">
                    <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-3 text-sm uppercase tracking-wider transition-colors">2. פרטי המבחן</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={examYear} onChange={e => setExamYear(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-400 font-bold transition-colors">
                            {examYearsList.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={examMoed} onChange={e => setExamMoed(e.target.value)} className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-400 font-bold transition-colors">
                            {moedList.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* 3. סוג הקובץ לפענוח - כפתורי רדיו גדולים מותאמים ללילה */}
            {selectedCourseId && (
                <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 animate-fade-in-up transition-colors duration-300">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wider transition-colors">3. סוג הקובץ לפענוח</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => setParsingMode('standard')} 
                            className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                                parsingMode === 'standard' 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400' 
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${parsingMode === 'standard' ? 'border-blue-600 dark:border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full"></div>}
                            </div>
                            <div className="text-right">
                                <div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div>
                                <div className="text-xs opacity-70">טופס 0</div>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setParsingMode('computerized')} 
                            className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                                parsingMode === 'computerized' 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400' 
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${parsingMode === 'computerized' ? 'border-blue-600 dark:border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-blue-600 dark:bg-blue-500 rounded-full"></div>}
                            </div>
                            <div className="text-right">
                                <div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* אזורי העלאת הקבצים (Dropzones) מותאמים מלא ללילה */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative transition-all ${
                    file 
                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/10' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}>
                    <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <span className="text-2xl block mb-2">{file ? '📄' : '📝'}</span>
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm truncate px-2">{file ? file.name : "קובץ מבחן (PDF)"}</p>
                </div>
                
                <div className={`border-4 border-dashed p-6 rounded-2xl text-center cursor-pointer relative transition-all ${
                    appendicesFile 
                        ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/10' 
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}>
                    <input type="file" accept="application/pdf" onChange={e => setAppendicesFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <span className="text-2xl block mb-2">{appendicesFile ? '📎' : '➕'}</span>
                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm truncate px-2">{appendicesFile ? appendicesFile.name : "קובץ נספחים (אופציונלי)"}</p>
                </div>
            </div>

            {/* כפתור הגשה ראשי */}
            <button 
                onClick={handleUploadExam} 
                disabled={status === 'processing' || !file || !selectedCourseId} 
                className="w-full bg-blue-600 dark:bg-blue-500 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none transition-all border border-transparent"
            >
                {status === 'processing' ? '⏳ מעבד שאלות...' : '🚀 העלה הכל'}
            </button>

            {/* קונסול ה-Log הכהה */}
            {debugLog && (
                <div className="bg-black dark:bg-slate-950 text-green-400 p-4 rounded-xl text-left h-32 overflow-auto text-xs font-mono shadow-inner border border-transparent dark:border-slate-800" dir="ltr">
                    <pre className="whitespace-pre-wrap">{debugLog}</pre>
                </div>
            )}
        </div>
    );
}