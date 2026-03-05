import React from 'react';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
// הוספנו אייקון מחיקה
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
    onDeleteCourse // קבלת הפונקציה החדשה
}) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <h3 className="font-bold text-green-800 text-lg mb-4">הגדרת קורס חדש</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <select
                        value={selectedStudentYear}
                        onChange={e => setSelectedStudentYear(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white"
                    >
                        {studentYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select
                        value={selectedSemester}
                        onChange={e => setSelectedSemester(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 bg-white"
                    >
                        {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <input
                    type="text"
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    placeholder="שם הקורס (למשל: המטולוגיה)"
                    className="w-full p-3 rounded-xl border border-slate-300 mb-4 focus:ring-2 focus:ring-green-500 outline-none"
                />
                <button
                    onClick={onAddCourse}
                    className="w-full bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition"
                >
                    שמור קורס +
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="font-bold text-slate-700 text-lg mb-4">ניהול קורסים קיימים</h3>
                {studentYears.map(year => (
                    semesters.map(sem => {
                        const courses = coursesList[year]?.[sem];
                        if (!courses) return null;
                        return (
                            <div key={`${year}-${sem}`} className="mb-6">
                                <h4 className="text-sm font-black text-slate-500 mb-2 border-b pb-1">{year} | {sem}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.entries(courses).map(([id, course]) => (
                                        <div key={id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                            <span className="font-bold text-slate-700 text-sm truncate mr-2" title={course.name}>{course.name}</span>
                                            
                                            {/* אזור הכפתורים */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => onEditCourse(year, sem, id, course.name)}
                                                    className="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition"
                                                    title="ערוך קורס"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteCourse(year, sem, id, course.name)}
                                                    className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition"
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