import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, set, push, update } from "firebase/database";

export function useCoursesLogic(canEditYear, examsList, setStatus, selectedStudentYear, selectedSemester) {
    // --- States של קורסים ---
    const [coursesList, setCoursesList] = useState({});
    const [newCourseName, setNewCourseName] = useState("");
    const [editingCourseOldData, setEditingCourseOldData] = useState(null);
    const [editCourseName, setEditCourseName] = useState("");
    const [editCourseYear, setEditCourseYear] = useState("");
    const [editCourseSemester, setEditCourseSemester] = useState("");

    // שליפת הקורסים בטעינה הראשונית
    useEffect(() => {
        get(ref(db, 'courses')).then((snap) => setCoursesList(snap.val() || {}));
    }, []);

    // רענון רשימת הקורסים (לשימוש אחרי עדכון/הוספה)
    const refreshCourses = async () => {
        const snap = await get(ref(db, 'courses'));
        setCoursesList(snap.val() || {});
    };

    // --- פעולות ---
    const handleAddCourse = async () => {
        if (!newCourseName) return alert("נא לכתוב שם קורס");
        if (!canEditYear(selectedStudentYear)) return alert("אין לך הרשאה לשנה זו");
        try {
            const path = `courses/${selectedStudentYear}/${selectedSemester}`;
            await set(push(ref(db, path)), { name: newCourseName, createdAt: new Date().toISOString() });
            alert(`הקורס "${newCourseName}" נוסף בהצלחה!`);
            setNewCourseName("");
            refreshCourses();
        } catch (e) { alert("שגיאה: " + e.message); }
    };

    const startEditingCourse = (year, sem, id, name) => {
        setEditingCourseOldData({ year, sem, id });
        setEditCourseName(name);
        setEditCourseYear(year);
        setEditCourseSemester(sem);
    };

    const handleUpdateCourse = async () => {
        if (!editCourseName) return alert("נא לכתוב שם קורס");
        if (!canEditYear(editingCourseOldData.year) || !canEditYear(editCourseYear)) return alert("אין הרשאה לערוך בשנים אלו");
        try {
            setStatus('processing');
            const { year: oldYear, sem: oldSem, id: courseId } = editingCourseOldData;
            const oldCourseSnap = await get(ref(db, `courses/${oldYear}/${oldSem}/${courseId}`));
            const courseData = oldCourseSnap.val() || { createdAt: new Date().toISOString() };
            courseData.name = editCourseName;

            const updates = {};
            if (oldYear !== editCourseYear || oldSem !== editCourseSemester) {
                updates[`courses/${oldYear}/${oldSem}/${courseId}`] = null;
                updates[`courses/${editCourseYear}/${editCourseSemester}/${courseId}`] = courseData;
            } else {
                updates[`courses/${oldYear}/${oldSem}/${courseId}`] = courseData;
            }

            // עדכון השם של הקורס גם בתוך המבחנים המשויכים אליו
            examsList.filter(e => e.courseId === courseId).forEach(exam => {
                updates[`uploaded_exams/${exam.id}/course`] = editCourseName;
                updates[`uploaded_exams/${exam.id}/studentYear`] = editCourseYear;
                updates[`uploaded_exams/${exam.id}/semester`] = editCourseSemester;
            });

            await update(ref(db), updates);
            alert("עודכן!");
            setEditingCourseOldData(null);
            setStatus('idle');
            refreshCourses();
        } catch (e) {
            alert(e.message);
            setStatus('idle');
        }
    };

    return {
        coursesList,
        newCourseName, setNewCourseName,
        editingCourseOldData, setEditingCourseOldData,
        editCourseName, setEditCourseName,
        editCourseYear, setEditCourseYear,
        editCourseSemester, setEditCourseSemester,
        handleAddCourse, startEditingCourse, handleUpdateCourse
    };
}