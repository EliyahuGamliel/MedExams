import { useState, useEffect } from 'react';
import { db } from "../../firebase"; // ודא שהנתיב ל-firebase.js שלך נכון
import { ref, get, set, push, update } from "firebase/database";
import toast from 'react-hot-toast';

export function useCoursesLogic(canEditYear, examsList, setStatus, selectedStudentYear, selectedSemester) {
    // --- States של ניהול קורסים ---
    const [coursesList, setCoursesList] = useState({});
    const [newCourseName, setNewCourseName] = useState("");
    
    // States לעריכת קורס קיים (מודאל עריכה)
    const [editingCourseOldData, setEditingCourseOldData] = useState(null);
    const [editCourseName, setEditCourseName] = useState("");
    const [editCourseYear, setEditCourseYear] = useState("");
    const [editCourseSemester, setEditCourseSemester] = useState("");

    // 1. שליפת מבנה הקורסים המלא בטעינה הראשונית של הפאנל
    useEffect(() => {
        get(ref(db, 'courses')).then((snap) => setCoursesList(snap.val() || {}));
    }, []);

    // פונקציית עזר לרענון הסטייט המקומי לאחר ביצוע שינויים במסד הנתונים
    const refreshCourses = async () => {
        const snap = await get(ref(db, 'courses'));
        setCoursesList(snap.val() || {});
    };

    // --- פעולות (Actions) ---

    // הוספת קורס חדש תחת השנה והסמסטר שנבחרו בסרגל הניהול
    const handleAddCourse = async () => {
        if (!newCourseName) return toast.error("נא לכתוב שם קורס");
        if (!canEditYear(selectedStudentYear)) return toast.error("אין לך הרשאה לשנה זו");
        
        try {
            const path = `courses/${selectedStudentYear}/${selectedSemester}`;
            await set(push(ref(db, path)), { 
                name: newCourseName, 
                createdAt: new Date().toISOString() 
            });
            toast.success(`הקורס "${newCourseName}" נוסף בהצלחה!`);
            setNewCourseName("");
            refreshCourses();
        } catch (e) { 
            toast.error("שגיאה בהוספת הקורס: " + e.message); 
        }
    };

    // פתיחת מודאל עריכה וטעינת נתוני הקורס הנוכחיים לסטייט
    const startEditingCourse = (year, sem, id, name) => {
        setEditingCourseOldData({ year, sem, id });
        setEditCourseName(name);
        setEditCourseYear(year);
        setEditCourseSemester(sem);
    };

    // עדכון פרטי קורס קיים (כולל תמיכה בהעברת קורס בין שנים/סמסטרים ועדכון המבחנים שלו)
    const handleUpdateCourse = async () => {
        if (!editCourseName) return toast.error("נא לכתוב שם קורס");
        if (!canEditYear(editingCourseOldData.year) || !canEditYear(editCourseYear)) {
            return toast.error("אין לך הרשאה לשנה זו");
        }
        
        try {
            setStatus('processing');
            const { year: oldYear, sem: oldSem, id: courseId } = editingCourseOldData;
            
            // משיכת הנתונים המקוריים של הקורס לשמירה על תאריך היצירה
            const oldCourseSnap = await get(ref(db, `courses/${oldYear}/${oldSem}/${courseId}`));
            const courseData = oldCourseSnap.val() || { createdAt: new Date().toISOString() };
            courseData.name = editCourseName;

            const updates = {};
            
            // בדיקה: האם המשתמש שינה את המיקום הפיזי של הקורס (שנה/סמסטר)?
            if (oldYear !== editCourseYear || oldSem !== editCourseSemester) {
                updates[`courses/${oldYear}/${oldSem}/${courseId}`] = null; // מחיקה מהמיקום הישן
                updates[`courses/${editCourseYear}/${editCourseSemester}/${courseId}`] = courseData; // העברה למיקום החדש
            } else {
                updates[`courses/${oldYear}/${oldSem}/${courseId}`] = courseData; // עדכון שם בלבד
            }

            // סנכרון: עדכון השם והמיקום החדש בכל המבחנים המשויכים לקורס זה
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
            toast.error("שגיאה בעדכון הקורס: " + e.message);
            setStatus('idle');
        }
    };

    // מחיקה מדורגת (Cascade Delete) - מוחק קורס, ואוטומטית משמיד את כל המבחנים והשאלות שלו
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
            
            // 1. הגדרת מחיקת הקורס עצמו
            updates[`courses/${year}/${semester}/${courseId}`] = null;

            // 2. ריצה אטומית על כל המבחנים במערכת ומחיקת כל התוכן הקשור אליהם מהדאטאבייס
            Object.keys(allExams).forEach(examId => {
                if (allExams[examId].courseId === courseId) {
                    updates[`uploaded_exams/${examId}`] = null; // מטא-דאטה של המבחן
                    updates[`exam_contents/${examId}`] = null;  // רשימת שאלות
                    updates[`exam_appendices/${examId}`] = null; // נספחים
                    updates[`exam_images/${examId}`] = null;     // הפניות לתמונות
                }
            });

            // 3. ביצוע כל המחיקות בפעולת שרת אטומית אחת (Multi-path Update)
            await update(ref(db), updates);
            toast.success(`הקורס "${courseName}" וכל המבחנים שלו הושמדו! 🗑️`);
            
            // הגנה: סגירת חלון העריכה אם המנהל מחק את הקורס שהוא עמד לערוך באותו הרגע
            if (editingCourseOldData?.id === courseId) {
                setEditingCourseOldData(null);
            }
            
            refreshCourses();
        } catch (error) {
            console.error("Error deleting course cascaded:", error);
            toast.error("שגיאה בתהליך מחיקת הקורס והמבחנים.");
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
        handleDeleteCourse 
    };
}