import React from 'react';

const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

export default function BulkUploadTab({
    studentYears,
    semesters,
    selectedStudentYear,
    setSelectedStudentYear,
    selectedSemester,
    setSelectedSemester,
    selectedCourseId,
    setSelectedCourseId,
    availableCourses,
    parsingMode,
    setParsingMode,
    bulkFiles,
    setBulkFiles,
    status,
    handleBulkUpload,
    debugLog
}) {
    return (
        /* מעטפת הרכיב הראשית הותאמה לרקע ובורדר אינדיגו רך ללילה */
        <div className="space-y-6 animate-fade-in bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/60 transition-colors duration-300 text-right">
            <div className="text-center mb-6">
                <h3 className="font-black text-indigo-900 dark:text-indigo-400 text-2xl mb-2 transition-colors">העלאה המונית (Batch Upload)</h3>
                <p className="text-indigo-600 dark:text-indigo-500 text-sm font-medium transition-colors">
                    העלה עשרות מבחנים במכה אחת. <br />המערכת תסרוק את שמות הקבצים כדי לזהות אוטומטית את סוג הטופס, השנה והמועד.
                </p>
            </div>

            {/* 1. שיוך לקורס - מותאם למצב לילה */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wider transition-colors">1. לאיזה קורס לשייך את המבחנים?</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                        value={selectedStudentYear}
                        onChange={e => { setSelectedStudentYear(e.target.value); setSelectedCourseId(""); }}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={selectedSemester}
                        onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                >
                    <option value="">-- בחר מהרשימה --</option>
                    {availableCourses.map(([id, course]) => (
                        <option key={id} value={id}>{course.name}</option>
                    ))}
                </select>
            </div>

            {/* 2. חוקי שמות הקבצים - מותאם למצב לילה */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm transition-colors duration-300">
                <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wider flex items-center gap-2 transition-colors">
                    <InfoIcon /> 2. איך לקרוא לקבצים? (זיהוי אוטומטי)
                </h4>
                
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 space-y-3 border border-slate-200 dark:border-slate-700 transition-colors">
                    <p>כדי שהמערכת תזהה הכל לבד, קרא לקבצים בפורמט הבא: <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-base bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded transition-colors">P2022A.pdf</strong> או <strong className="text-indigo-600 dark:text-indigo-400 font-mono text-base bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded transition-colors">S2023B.pdf</strong></p>
                    
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-600 dark:text-slate-400 transition-colors">
                        <li><strong>P / S</strong> = <span className="text-blue-600 dark:text-blue-400 font-bold transition-colors">P</span>rint (טופס 0) או <span className="text-blue-600 dark:text-blue-400 font-bold transition-colors">S</span>creen (ממוחשב)</li>
                        <li><strong>20XX</strong> = שנת המבחן</li>
                        <li><strong>A / B / C</strong> = מועד א', ב', או מיוחד</li>
                    </ul>

                    {/* בחירת גיבוי */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">ברירת מחדל לקבצים ללא אות (P/S):</span>
                        <select 
                            value={parsingMode} 
                            onChange={e => setParsingMode(e.target.value)}
                            className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold transition-colors"
                        >
                            <option value="standard">קובץ רגיל (טופס 0)</option>
                            <option value="moodle">ממוחשב (Moodle)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. אזור גרירת/בחירת קבצים - מותאם למצב לילה */}
            <div className="bg-white dark:bg-slate-800/40 p-8 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition text-center relative cursor-pointer">
                <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={e => setBulkFiles(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-4xl block mb-2">📁</span>
                <p className="font-bold text-indigo-900 dark:text-indigo-400 text-lg transition-colors">גרור קבצים לכאן או לחץ לבחירה</p>
                <p className="text-sm text-indigo-500 dark:text-indigo-500/80 mt-1 transition-colors">ניתן להעלות עשרות קבצי PDF במכה אחת</p>
            </div>

            {/* אזור פעולה ורשימת הקבצים המוכנים להעלאה */}
            {bulkFiles.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-md transition-colors duration-300">
                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 border-b dark:border-slate-700 pb-2 flex justify-between items-center transition-colors">
                        <span>הוכנו להעלאה: {bulkFiles.length} קבצים</span>
                        <button onClick={() => setBulkFiles([])} className="text-xs text-red-500 hover:text-red-700 font-bold">נקה רשימה</button>
                    </div>
                    <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 max-h-40 overflow-y-auto pl-2" dir="ltr">
                        {bulkFiles.map((f, i) => (
                            <li key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 transition-colors">
                                <span className="truncate flex-1 font-mono text-xs text-slate-700 dark:text-slate-300">{f.name}</span>
                                <span className="text-green-500 ml-2">✓</span>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleBulkUpload}
                        disabled={status === 'processing' || !selectedCourseId}
                        className="mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 transition flex items-center justify-center gap-2 text-lg border border-transparent"
                    >
                        {status === 'processing' ? '⏳ מפענח... (נא לא לסגור את החלון)' : '🚀 התחל עיבוד והעלאה'}
                    </button>
                </div>
            )}

            {/* מסוף ה-Log הכהה משתלב מעולה באופן טבעי (רק עדכנתי בורדר) */}
            {debugLog && (
                <div className="bg-slate-900 text-green-400 p-4 rounded-xl text-left h-48 overflow-auto text-xs font-mono shadow-inner border border-slate-800 dark:border-slate-700/80" dir="ltr">
                    <pre className="whitespace-pre-wrap">{debugLog}</pre>
                </div>
            )}
        </div>
    );
}