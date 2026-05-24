import React from 'react';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function ManageCoursesTab({
    studentYears,
    semesters,
    selectedStudentYear,
    setSelectedStudentYear,
    selectedSemester,
    setSelectedSemester,
    newCourseName,
    setNewCourseName,
    onAddCourse,
    coursesList,
    onEditCourse,
    onDeleteCourse 
}) {
    return (
        <div className="space-y-6 animate-fade-in text-right">
            
            {/* כרטיס יצירת קורס חדש מותאם ל-Dark Mode */}
            <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/40 transition-colors duration-300">
                <h3 className="font-bold text-green-800 dark:text-green-400 text-lg mb-4 transition-colors">הגדרת קורס חדש</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                        value={selectedStudentYear}
                        onChange={e => setSelectedStudentYear(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={selectedSemester}
                        onChange={e => setSelectedSemester(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors"
                    >
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <input
                    type="text"
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    placeholder="שם הקורס (למשל: המטולוגיה)"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 mb-4 focus:ring-2 focus:ring-green-500 outline-none transition-colors"
                />
                <button
                    onClick={onAddCourse}
                    className="w-full bg-green-600 dark:bg-green-500 text-white p-3 rounded-xl font-bold hover:bg-green-700 dark:hover:bg-green-600 transition shadow-md border border-transparent"
                >
                    שמור קורס +
                </button>
            </div>

            {/* אזור ניהול קורסים קיימים */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 transition-colors">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg mb-4 transition-colors">ניהול קורסים קיימים</h3>
                {studentYears.map(year => (
                    semesters.map(sem => {
                        const courses = coursesList[year]?.[sem];
                        if (!courses) return null;
                        return (
                            <div key={`${year}-${sem}`} className="mb-6">
                                <h4 className="text-sm font-black text-slate-500 dark:text-slate-400 mb-2 border-b dark:border-slate-700 pb-1 transition-colors">{year} | {sem}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(courses).map(([id, course]) => (
                                        <div key={id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm transition-colors duration-300">
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate ml-2 transition-colors" title={course.name}>{course.name}</span>
                                            
                                            {/* אזור כפתורי עריכה/מחיקה מותאמים ללילה */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => onEditCourse(year, sem, id, course.name)}
                                                    className="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 p-2 rounded-lg transition"
                                                    title="ערוך קורס"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteCourse(year, sem, id, course.name)}
                                                    className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 p-2 rounded-lg transition"
                                                    title="מחק קורס לצמיתות"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ))}
            </div>
        </div>
    );
}