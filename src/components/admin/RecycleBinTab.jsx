import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, update } from "firebase/database";
import { getStorage, ref as storageRef, deleteObject, listAll } from "firebase/storage";
import toast from 'react-hot-toast';

const RestoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function RecycleBinTab() {
    const [deletedExams, setDeletedExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const storage = getStorage();

    // פונקציה למחיקה מוחלטת מה-Database ומה-Storage
    const handlePermanentDelete = async (examId, silent = false) => {
        if (!silent && !window.confirm("אזהרה: המבחן והקבצים (תמונות ונספחים) יימחקו לצמיתות! להמשיך?")) return;

        try {
            // 1. מחיקת הנספח (PDF) מה-Storage
            const appendixRef = storageRef(storage, `exam_appendices/${examId}.pdf`);
            await deleteObject(appendixRef).catch(() => { /* קובץ לא קיים, נמשיך */ });

            // 2. מחיקת כל התמונות מהתיקייה של המבחן ב-Storage
            const imagesFolderRef = storageRef(storage, `exam_images/${examId}`);
            const imagesList = await listAll(imagesFolderRef);
            const deleteImagePromises = imagesList.items.map(item => deleteObject(item));
            await Promise.all(deleteImagePromises);

            // 3. מחיקת הרשומה מה-Database
            await update(ref(db), { [`recycle_bin/${examId}`]: null });

            setDeletedExams(prev => prev.filter(e => e.id !== examId));
            if (!silent) toast.success("המבחן והקבצים הושמדו לצמיתות 💥");
        } catch (error) {
            console.error("Error during hard delete:", error);
            if (!silent) toast.error("שגיאה במחיקת הקבצים מהשרת");
        }
    };

    // טעינת פח המיחזור וביצוע ניקוי אוטומטי
    useEffect(() => {
        const fetchAndCleanup = async () => {
            try {
                const snap = await get(ref(db, 'recycle_bin'));
                if (snap.exists()) {
                    const data = snap.val();
                    const examsArr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                    
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    // זיהוי מבחנים ישנים לניקוי
                    const oldExams = examsArr.filter(exam => new Date(exam.deletedAt) < thirtyDaysAgo);
                    
                    if (oldExams.length > 0) {
                        toast("מנקה מבחנים ישנים מפח המיחזור...", { icon: '🧹' });
                        for (const exam of oldExams) {
                            await handlePermanentDelete(exam.id, true);
                        }
                    }

                    // עדכון הרשימה להצגה (אחרי הניקוי)
                    const remainingExams = examsArr.filter(exam => new Date(exam.deletedAt) >= thirtyDaysAgo);
                    remainingExams.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
                    setDeletedExams(remainingExams);
                }
            } catch (error) {
                toast.error("שגיאה בטעינת הנתונים");
            } finally {
                setLoading(false);
            }
        };

        fetchAndCleanup();
    }, []);

    const handleRestore = async (exam) => {
        if (!window.confirm("לשחזר את המבחן חזרה למערכת?")) return;
        const updates = {};
        if (exam.meta) updates[`uploaded_exams/${exam.id}`] = exam.meta;
        if (exam.contents) updates[`exam_contents/${exam.id}`] = exam.contents;
        if (exam.appendices) updates[`exam_appendices/${exam.id}`] = exam.appendices;
        if (exam.images) updates[`exam_images/${exam.id}`] = exam.images;
        updates[`recycle_bin/${exam.id}`] = null;

        try {
            await update(ref(db), updates);
            setDeletedExams(prev => prev.filter(e => e.id !== exam.id));
            toast.success("המבחן שוחזר בהצלחה! ♻️");
        } catch (error) {
            toast.error("שגיאה בשחזור");
        }
    };

    if (loading) return <div className="text-center py-10 font-bold text-slate-500">בודק נתונים...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrashIcon /> פח מיחזור (ניקוי אוטומטי של 30 יום פעיל)
                </h3>

                {deletedExams.length === 0 ? (
                    <div className="text-center text-slate-400 py-10 font-bold">אין מבחנים בפח המיחזור ✨</div>
                ) : (
                    <div className="space-y-4">
                        {deletedExams.map(exam => (
                            <div key={exam.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800">{exam.meta?.title || 'מבחן ללא שם'}</h4>
                                    <div className="text-[10px] text-slate-400 mt-1 uppercase">ID: {exam.id}</div>
                                    <div className="text-xs text-slate-500 mt-1">נמחק ב: {new Date(exam.deletedAt).toLocaleString('he-IL')}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRestore(exam)} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-bold hover:bg-green-100 transition flex items-center gap-1"><RestoreIcon /> שחזר</button>
                                    <button onClick={() => handlePermanentDelete(exam.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition flex items-center gap-1"><TrashIcon /> השמד</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}