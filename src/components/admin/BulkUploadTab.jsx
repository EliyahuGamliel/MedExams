import React from 'react';

const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ComputerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>;

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
        <div className="space-y-6 animate-fade-in bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
            <div className="text-center mb-6">
                <h3 className="font-black text-indigo-900 text-2xl mb-2">העלאה המונית (Batch Upload)</h3>
                <p className="text-indigo-600 text-sm font-medium">
                    העלה עשרות מבחנים במכה אחת. <br />המערכת תסרוק את שמות הקבצים כדי לשייך שנה ומועד אוטומטית.
                </p>
            </div>

            {/* 1. שיוך לקורס */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">1. לאיזה קורס לשייך את המבחנים?</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                        value={selectedStudentYear}
                        onChange={e => { setSelectedStudentYear(e.target.value); setSelectedCourseId(""); }}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white"
                    >
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={selectedSemester}
                        onChange={e => { setSelectedSemester(e.target.value); setSelectedCourseId(""); }}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white"
                    >
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="">-- בחר מהרשימה --</option>
                    {availableCourses.map(([id, course]) => (
                        <option key={id} value={id}>{course.name}</option>
                    ))}
                </select>
            </div>

            {/* 2. סוג הקבצים */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">2. סוג הקבצים לפענוח</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => setParsingMode('standard')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'standard' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'standard' ? 'border-indigo-600' : 'border-slate-300'}`}>
                            {parsingMode === 'standard' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                        </div>
                        <div className="text-right">
                            <div className="font-bold flex items-center gap-2"><FileTextIcon /> קובץ רגיל</div>
                        </div>
                    </button>
                    <button
                        onClick={() => setParsingMode('computerized')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition ${parsingMode === 'computerized' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parsingMode === 'computerized' ? 'border-indigo-600' : 'border-slate-300'}`}>
                            {parsingMode === 'computerized' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></div>}
                        </div>
                        <div className="text-right">
                            <div className="font-bold flex items-center gap-2"><ComputerIcon /> ממוחשב (Moodle)</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* 3. בחירת קבצים */}
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-indigo-300 hover:bg-indigo-50 transition text-center relative cursor-pointer">
                <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={e => setBulkFiles(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-4xl block mb-2">📁</span>
                <p className="font-bold text-indigo-900">בחר מספר קבצים להעלאה (PDF)</p>
                <p className="text-xs text-indigo-500 mt-1">גרור לכאן או לחץ לבחירה. מומלץ לקרוא לקבצים עם שנת המבחן והמועד.</p>
            </div>

            {/* אזור פעולה ולוגים */}
            {bulkFiles.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-indigo-200">
                    <div className="font-bold text-slate-700 mb-2 border-b pb-2">נבחרו {bulkFiles.length} קבצים:</div>
                    <ul className="text-sm text-slate-600 space-y-1 max-h-40 overflow-y-auto pl-2" dir="ltr">
                        {bulkFiles.map((f, i) => (
                            <li key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                <span className="truncate flex-1">{f.name}</span>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={handleBulkUpload}
                        disabled={status === 'processing' || !selectedCourseId}
                        className="mt-4 w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 disabled:bg-slate-300 transition"
                    >
                        {status === 'processing' ? '⏳ מעבד קבצים (נא לא לסגור את החלון)...' : '🚀 התחל העלאה המונית'}
                    </button>
                </div>
            )}

            {debugLog && (
                <div className="bg-black text-green-400 p-4 rounded-xl text-left h-48 overflow-auto text-xs" dir="ltr">
                    <pre>{debugLog}</pre>
                </div>
            )}
        </div>
    );
}