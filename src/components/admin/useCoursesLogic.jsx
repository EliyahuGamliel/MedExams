import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, set, push, update } from "firebase/database";
import toast from 'react-hot-toast';

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

    // רענון רשימת הקורסים (לשימוש אחרי עדכון/הוספה/מחיקה)
    const refreshCourses = async () => {
        const snap = await get(ref(db, 'courses'));
        setCoursesList(snap.val() || {});
    };

    // --- פעולות ---
    const handleAddCourse = async () => {
        if (!newCourseName) return toast.error("נא לכתוב שם קורס");
        if (!canEditYear(selectedStudentYear)) return toast.error("אין לך הרשאה לשנה זו");
        try {
            const path = `courses/${selectedStudentYear}/${selectedSemester}`;
            await set(push(ref(db, path)), { name: newCourseName, createdAt: new Date().toISOString() });
            toast.success(`הקורס "${newCourseName}" נוסף בהצלחה!`);
            setNewCourseName("");
            refreshCourses();
        } catch (e) { toast.error("שגיאה: " + e.message); }
    };

    const startEditingCourse = (year, sem, id, name) => {
        setEditingCourseOldData({ year, sem, id });
        setEditCourseName(name);
        setEditCourseYear(year);
        setEditCourseSemester(sem);
    };

    const handleUpdateCourse = async () => {
        if (!editCourseName) return toast.error("נא לכתוב שם קורס");
        if (!canEditYear(editingCourseOldData.year) || !canEditYear(editCourseYear)) return toast.error("אין לך הרשאה לשנה זו");
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
            toast.success(`הקורס "${editCourseName}" עודכן בהצלחה!`);
            setEditingCourseOldData(null);
            setStatus('idle');
            refreshCourses();
        } catch (e) {
            toast.error("שגיאה: " + e.message);
            setStatus('idle');
        }
    };

    // --- הוספת פונקציית המחיקה (מחיקה מדורגת) ---
    const handleDeleteCourse = async (year, semester, courseId, courseName) => {
        if (!canEditYear(year)) return toast.error("אין לך הרשאה למחוק קורס משנה זו.");
        
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את הקורס "${courseName}"?\n\n⚠️ אזהרה: פעולה זו תמחק גם את כל המבחנים והשאלות המשויכים לקורס זה. לא ניתן לשחזר את המידע!`)) {
            return;
        }

        setStatus('processing');
        
        try {
            const examsSnap = await get(ref(db, 'uploaded_exams'));
            const allExams = examsSnap.val() || {};
            
            const updates = {};
            
            // מחיקת הקורס עצמו
            updates[`courses/${year}/${semester}/${courseId}`] = null;

            // ריצה על כל המבחנים ומחיקת כל מה שמשויך ל-courseId הזה
            Object.keys(allExams).forEach(examId => {
                if (allExams[examId].courseId === courseId) {
                    updates[`uploaded_exams/${examId}`] = null;
                    updates[`exam_contents/${examId}`] = null;
                    updates[`exam_appendices/${examId}`] = null;
                    updates[`exam_images/${examId}`] = null; 
                }
            });

            await update(ref(db), updates);
            toast.success(`הקורס "${courseName}" נמחק בהצלחה! 🗑️`);
            
            // סגירת חלון העריכה אם היה פתוח על הקורס הזה
            if (editingCourseOldData?.id === courseId) {
                setEditingCourseOldData(null);
            }
            
            refreshCourses();
        } catch (error) {
            console.error("Error deleting course:", error);
            toast.error("שגיאה במחיקת הקורס.");
        } finally {
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
        handleAddCourse, startEditingCourse, handleUpdateCourse, 
        handleDeleteCourse // החזרת פונקציית המחיקה
    };
}