import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { ref, get, set, update, remove, query, orderByChild, startAt, push } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

// --- יומן בקרת מנהלים גלובלי ---
export const logAdminAction = async (actionType, details, examId = "כללי") => {
    try {
        const user = auth.currentUser;
        if (!user) return; 

        const logRef = push(ref(db, 'admin_logs'));
        await set(logRef, {
            uid: user.uid,
            email: user.email || 'משתמש לא ידוע',
            action: actionType, 
            details: details,   
            examId: examId,
            timestamp: new Date().toISOString(), 
            timestampNum: Date.now() 
        });
    } catch (error) {
        console.error("שגיאה ברישום יומן בקרה:", error);
    }
};

export function useExamsLogic(setStatus, canSeeReports) {
    // --- States של ניהול מבחנים ושאלות ---
    const [examsList, setExamsList] = useState([]);
    const [reportsList, setReportsList] = useState([]);
    const [questionsEditorId, setQuestionsEditorId] = useState(null);
    const [examQuestions, setExamQuestions] = useState([]);
    const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);
    const [newQuestionOptionsCount, setNewQuestionOptionsCount] = useState(4);
    const [editingExamId, setEditingExamId] = useState(null);
    const [newAppendicesFile, setNewAppendicesFile] = useState(null);

    // 1. טעינת נתונים ראשונית חסכונית (מטא-דאטה של מבחנים ודיווחים)
    useEffect(() => {
        get(ref(db, 'uploaded_exams')).then((snap) => {
            const data = snap.val();
            setExamsList(data ? Object.values(data) : []);
        }).catch(e => console.error("Error fetching exams meta:", e));

        if (!canSeeReports) return;

        get(ref(db, 'reported_errors')).then((snap) => {
            const data = snap.val();
            if (data) {
                const reportsArr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                reportsArr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setReportsList(reportsArr);
            } else {
                setReportsList([]);
            }
        }).catch(e => console.error("Error fetching reports:", e));

    }, [canSeeReports]);

    // --- פעולות על מבחנים (Exam Actions) ---

    // העברת מבחן קיים לפח המיחזור (מחיקה לוגית רכה)
    const handleDeleteExam = async (examId) => {
        if (!window.confirm("להעביר מבחן זה לפח המיחזור? (ניתן יהיה לשחזר אותו מאוחר יותר)")) return;
        
        setStatus('processing');
        const deletePromise = async () => {
            const [metaSnap, contentsSnap, appSnap, imgSnap] = await Promise.all([
                get(ref(db, `uploaded_exams/${examId}`)),
                get(ref(db, `exam_contents/${examId}`)),
                get(ref(db, `exam_appendices/${examId}`)),
                get(ref(db, `exam_images/${examId}`))
            ]);

            const metaData = metaSnap.val();
            if (!metaData) throw new Error("המבחן לא נמצא");

            const backupData = {
                id: examId,
                meta: metaData,
                contents: contentsSnap.val() || null,
                appendices: appSnap.val() || null,
                images: imgSnap.val() || null,
                deletedAt: new Date().toISOString()
            };

            const updates = {};
            updates[`recycle_bin/${examId}`] = backupData;
            updates[`uploaded_exams/${examId}`] = null;
            updates[`exam_contents/${examId}`] = null;
            updates[`exam_appendices/${examId}`] = null;
            updates[`exam_images/${examId}`] = null;
            
            await update(ref(db), updates);
            logAdminAction("מחיקת מבחן (העברה לפח)", `המבחן הועבר לפח המיחזור`, examId);
            setExamsList(prev => prev.filter(e => e.id !== examId));
        };

        try {
            await toast.promise(deletePromise(), {
                loading: 'מעביר לפח המיחזור...',
                success: 'המבחן הועבר לפח המיחזור בהצלחה! 🗑️',
                error: (err) => `שגיאה במחיקה: ${err.message}`
            });
        } catch (error) {
            console.error("Delete error:", error);
        } finally {
            setStatus('idle');
        }
    };

    // העלאה או עדכון של קובץ נספחים (PDF)
    const handleUpdateAppendices = async (examId) => {
        if (!newAppendicesFile) return toast.error("יש לבחור קובץ");
        
        setStatus('processing');
        const uploadPromise = async () => {
            const storage = getStorage();
            const fileRef = storageRef(storage, `exam_appendices/${examId}.pdf`);
            await uploadBytes(fileRef, newAppendicesFile);
            const downloadURL = await getDownloadURL(fileRef);
            await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: true });
            await set(ref(db, `exam_appendices/${examId}`), { fileUrl: downloadURL });
            
            logAdminAction("עדכון נספחים", `הועלה קובץ נספחים חדש`, examId);
            setEditingExamId(null); 
            setNewAppendicesFile(null);
        };

        try {
            await toast.promise(uploadPromise(), {
                loading: 'מעלה קובץ נספחים...',
                success: 'הנספחים עודכנו בהצלחה! 📎',
                error: 'שגיאה בהעלאת הנספחים.'
            });
        } catch {
            setStatus('idle');
        }
    };

    // מחיקת קובץ נספחים קיים
    const handleDeleteAppendices = async (examId) => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק את הנספח ממבחן זה?")) return;
        
        setStatus('processing');
        try {
            await remove(ref(db, `exam_appendices/${examId}`));
            await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: false });

            setExamsList(prev => prev.map(exam => 
                exam.id === examId ? { ...exam, hasAppendices: false } : exam
            ));

            logAdminAction("מחיקת נספח", `קובץ הנספחים הוסר מהמבחן`, examId);
            toast.success("הנספח נמחק בהצלחה!");
            setEditingExamId(null); 
        } catch (error) {
            console.error("Error deleting appendices:", error);
            toast.error("אירעה שגיאה במחיקת הנספח.");
        } finally {
            setStatus('idle');
        }
    };

    // עדכון שנת המבחן והחלפה דינמית שלה בתוך כותרת המבחן
    const handleUpdateExamYear = async (examId, newYear) => {
        try {
            const currentExam = examsList.find(e => e.id === examId);
            if (!currentExam) return;

            const oldYear = currentExam.examYear || "";
            let newTitle = currentExam.title;

            if (oldYear && newTitle.includes(oldYear)) {
                newTitle = newTitle.replace(oldYear, newYear);
            } else {
                const yearRegex = /\b20[2-3][0-9]\b/; 
                if (yearRegex.test(newTitle)) {
                    newTitle = newTitle.replace(yearRegex, newYear);
                }
            }

            await update(ref(db, `uploaded_exams/${examId}`), { 
                examYear: newYear,
                title: newTitle 
            });
            
            sessionStorage.removeItem('cachedExams');
            sessionStorage.removeItem('cacheTimeExams');

            setExamsList(prev => prev.map(e => e.id === examId ? { ...e, examYear: newYear, title: newTitle } : e));
            logAdminAction("עדכון שנת מבחן", `שנת המבחן שונתה ל-${newYear}. כותרת חדשה: ${newTitle}`, examId);
            toast.success(`שנת המבחן והכותרת עודכנו בהצלחה ל-${newYear}! 📅`);
        } catch (error) {
            console.error("Error updating exam year:", error);
            toast.error("שגיאה בעדכון שנת המבחן");
        }
    };

    // עדכון סטטוס אימות מבחן (הגהת אנוש הושלמה)
    const handleToggleVerify = async (examId, currentStatus) => {
        try {
            await update(ref(db, `uploaded_exams/${examId}`), { isVerified: !currentStatus });
            logAdminAction(!currentStatus ? "אישור מבחן לאחר הגהה" : "ביטול אישור מבחן", `הסטטוס של המבחן שונה ל: ${!currentStatus ? 'מאומת' : 'ממתין'}`, examId);

            setExamsList(prev => prev.map(e => e.id === examId ? { ...e, isVerified: !currentStatus } : e));
            toast.success(!currentStatus ? 'המבחן סומן כמאומת ומוכן! ✅' : 'המבחן סומן כממתין להגהה ⚠️');
        } catch (error) {
            toast.error('שגיאה בעדכון סטטוס המבחן');
        }
    };

    // --- פעולות על שאלות בתוך האדיטור (Question Editor Actions) ---

    // פתיחת עורך השאלות וטעינה עצלה (Lazy Load) של השאלות מהשרת
    const openQuestionsEditor = async (exam) => {
        setQuestionsEditorId(exam.id);
        setEditingExamId(null);
        if (exam.questions && exam.questions.length > 0) {
            setExamQuestions(exam.questions);
            return;
        }
        setStatus('processing');
        try {
            const snapshot = await get(ref(db, `exam_contents/${exam.id}`));
            setExamQuestions(snapshot.val() || []);
        } catch (e) { 
            toast.error("שגיאה בטעינת השאלות: " + e.message); 
        } finally { 
            setStatus('idle'); 
        }
    };

    // הוספת שאלה חדשה ריקה לסוף המבחן
    const handleAddQuestion = async () => {
        if (!questionsEditorId) return;
        const initialOptions = Array.from({ length: newQuestionOptionsCount }, (_, i) => `אפשרות ${i + 1}`);
        const newIndex = examQuestions.length;
        const newQuestion = {
            id: newIndex, text: "שאלה חדשה... (לחץ כדי לערוך)", type: "multiple_choice",
            options: initialOptions, correctIndex: 0, imageNeeded: false, hasImage: false, isCanceled: false
        };
        const updatedQuestions = [...examQuestions, newQuestion];
        setExamQuestions(updatedQuestions);
        
        const updates = {};
        updates[`exam_contents/${questionsEditorId}`] = updatedQuestions;
        updates[`uploaded_exams/${questionsEditorId}/questionCount`] = updatedQuestions.length;
        await update(ref(db), updates);
        
        logAdminAction("הוספת שאלה חדשה", `נוספה שאלה מספר ${newIndex + 1}`, questionsEditorId);
        setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: updatedQuestions.length } : e));
    };

    // מחיקת שאלה לצמיתות וביצוע אינדוקס מחדש (Reindex) לשאלות שאחריה
    const handleDeleteQuestion = async (idxToDelete) => {
        if (!window.confirm("האם למחוק שאלה זו לצמיתות?")) return;
        const filtered = examQuestions.filter((_, i) => i !== idxToDelete);
        const reindexedQuestions = filtered.map((q, i) => ({ ...q, id: i }));
        setExamQuestions(reindexedQuestions);
        
        const updates = {};
        updates[`exam_contents/${questionsEditorId}`] = reindexedQuestions;
        updates[`uploaded_exams/${questionsEditorId}/questionCount`] = reindexedQuestions.length;
        await update(ref(db), updates);
        
        logAdminAction("מחיקת שאלה", `שאלה ${idxToDelete + 1} נמחקה מהמבחן לצמיתות`, questionsEditorId);
        setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: reindexedQuestions.length } : e));
    };

    // מחיקה או איפוס של הסבר ה-AI המופק לטובת בנייה מחדש
    const handleDeleteAiExplanation = async (idxToDelete) => {
        if (!questionsEditorId) return;
        if (!window.confirm("האם אתה בטוח שברצונך למחוק את הסבר ה-AI לשאלה זו? (הוא ייווצר מחדש בפעם הבאה שיבקשו אותו)")) return;

        try {
            await remove(ref(db, `exam_contents/${questionsEditorId}/${idxToDelete}/explanationData`));
            logAdminAction("מחיקת הסבר AI", `נמחק הסבר הבינה המלאכותית לשאלה ${idxToDelete + 1}`, questionsEditorId);

            setExamQuestions(prev => {
                const updated = [...prev];
                if (updated[idxToDelete]) {
                    const { explanationData, ...rest } = updated[idxToDelete];
                    updated[idxToDelete] = rest;
                }
                return updated;
            });
            toast.success("ההסבר נמחק בהצלחה!");
        } catch (error) {
            console.error("Delete AI explanation error:", error);
            toast.error("שגיאה במחיקת ההסבר.");
        }
    };

    // הוספת מסיח (תשובה) נוסף לשאלה אמריקאית
    const handleAddOptionToQuestion = async (qIdx) => {
        const updated = [...examQuestions];
        const currentOpts = updated[qIdx].options || [];
        updated[qIdx].options = [...currentOpts, `אפשרות ${currentOpts.length + 1}`];
        setExamQuestions(updated);
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/options`), updated[qIdx].options);
    };

    // הסרת מסיח משאלה אמריקאית ועדכון הצינור של אינדקס התשובה הנכונה/ערעורים
    const handleRemoveOptionFromQuestion = async (qIdx, optIdx) => {
        const updated = [...examQuestions];
        const currentOpts = updated[qIdx].options;
        if (currentOpts.length <= 2) return toast.error("חייבות להיות לפחות 2 אפשרויות.");
        
        updated[qIdx].options = currentOpts.filter((_, i) => i !== optIdx);
        let currentCorrect = updated[qIdx].correctIndex;
        if (Array.isArray(currentCorrect)) {
            updated[qIdx].correctIndex = currentCorrect.filter(i => i !== optIdx).map(i => i > optIdx ? i - 1 : i);
        } else {
            if (currentCorrect === optIdx) updated[qIdx].correctIndex = 0;
            else if (currentCorrect > optIdx) updated[qIdx].correctIndex = currentCorrect - 1;
        }
        
        setExamQuestions(updated);
        await update(ref(db, `exam_contents/${questionsEditorId}/${qIdx}`), {
            options: updated[qIdx].options, correctIndex: updated[qIdx].correctIndex
        });
        logAdminAction("מחיקת אפשרות מענה", `אפשרות ${optIdx + 1} נמחקה משאלה ${qIdx + 1}`, questionsEditorId);
    };

    const handleQuestionTextChange = (idx, newText) => {
        setExamQuestions(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], text: newText };
            return updated;
        });
    };

    const saveQuestionText = async (idx, textToSave) => {
        await set(ref(db, `exam_contents/${questionsEditorId}/${idx}/text`), textToSave);
        logAdminAction("עריכת תוכן שאלה", `עודכן הטקסט של שאלה ${idx + 1}`, questionsEditorId);
    };

    const handleOptionTextChange = (qIdx, optIdx, newText) => {
        setExamQuestions(prev => {
            const updated = [...prev];
            const q = { ...updated[qIdx] };
            const newOptions = [...q.options];
            newOptions[optIdx] = newText;
            q.options = newOptions;
            updated[qIdx] = q;
            return updated;
        });
    };

    const saveOptionText = async (qIdx, optIdx, textToSave) => {
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/options/${optIdx}`), textToSave);
    };

    // --- לוגיקה ייעודית לשאלות השלמת טקסט (Cloze Actions) ---
    const handleClozeCorrectIndexChange = async (qIdx, blankIndex, newCorrectIndex) => {
        const numIndex = Number(newCorrectIndex);
        setExamQuestions(prev => {
            const updated = [...prev];
            updated[qIdx].clozeOptions[blankIndex].correctIndex = numIndex;
            return updated;
        });
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions/${blankIndex}/correctIndex`), numIndex);
    };

    const handleAddOptionToCloze = async (qIdx, blankIdx) => {
        const updated = [...examQuestions];
        const currentOpts = updated[qIdx].clozeOptions[blankIdx].options || [];
        updated[qIdx].clozeOptions[blankIdx].options = [...currentOpts, `אפשרות ${currentOpts.length + 1}`];
        setExamQuestions(updated);
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions/${blankIdx}/options`), updated[qIdx].clozeOptions[blankIdx].options);
    };

    const handleRemoveOptionFromCloze = async (qIdx, blankIdx, optIdx) => {
        const updated = [...examQuestions];
        const blank = updated[qIdx].clozeOptions[blankIdx];
        if (blank.options.length <= 2) return toast.error("חייבות להיות לפחות 2 אפשרויות להשלמה.");

        blank.options = blank.options.filter((_, i) => i !== optIdx);
        if (blank.correctIndex === optIdx) blank.correctIndex = 0;
        else if (blank.correctIndex > optIdx) blank.correctIndex -= 1;
        
        if (blank.appealedIndexes) {
            blank.appealedIndexes = blank.appealedIndexes.filter(i => i !== optIdx).map(i => i > optIdx ? i - 1 : i);
        }

        setExamQuestions(updated);
        await update(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions/${blankIdx}`), {
            options: blank.options,
            correctIndex: blank.correctIndex,
            appealedIndexes: blank.appealedIndexes || []
        });
    };

    const handleClozeOptionTextChange = (qIdx, blankIdx, optIdx, newText) => {
        setExamQuestions(prev => {
            const updated = [...prev];
            updated[qIdx].clozeOptions[blankIdx].options[optIdx] = newText;
            return updated;
        });
    };

    const saveClozeOptionText = async (qIdx, blankIdx, optIdx, textToSave) => {
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions/${blankIdx}/options/${optIdx}`), textToSave);
    };

    const handleToggleClozeAppeal = async (qIdx, blankIdx, optIdx) => {
        const updated = [...examQuestions];
        const blank = updated[qIdx].clozeOptions[blankIdx];
        const cur = blank.appealedIndexes || [];
        const newer = cur.includes(optIdx) ? cur.filter(i => i !== optIdx) : [...cur, optIdx];
        blank.appealedIndexes = newer;
        setExamQuestions(updated);
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions/${blankIdx}/appealedIndexes`), newer);
    };

    const handleRemoveBlankFromCloze = async (qIdx, blankIdx) => {
        if (!window.confirm("האם למחוק השלמה זו לחלוטין? (אל תשכח למחוק את המספר שלה גם מטקסט השאלה למעלה)")) return;

        const updated = [...examQuestions];
        const currentClozeOptions = updated[qIdx].clozeOptions || [];
        
        updated[qIdx].clozeOptions = currentClozeOptions.filter((_, i) => i !== blankIdx);
        setExamQuestions(updated);
        
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions`), updated[qIdx].clozeOptions);
        logAdminAction("מחיקת השלמה", `נמחקה השלמה מספר ${blankIdx + 1} משאלה ${qIdx + 1}`, questionsEditorId);
        toast.success("ההשלמה נמחקה בהצלחה! 🗑️");
    };

    const handleAddBlankToCloze = async (qIdx) => {
        const updated = [...examQuestions];
        const currentClozeOptions = updated[qIdx].clozeOptions || [];
        
        const newBlank = {
            options: ["אפשרות 1", "אפשרות 2"],
            correctIndex: 0,
            appealedIndexes: []
        };
        
        updated[qIdx].clozeOptions = [...currentClozeOptions, newBlank];
        setExamQuestions(updated);
        
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/clozeOptions`), updated[qIdx].clozeOptions);
        logAdminAction("הוספת השלמה חדשה", `נוספה השלמה מספר ${updated[qIdx].clozeOptions.length} לשאלה ${qIdx + 1}`, questionsEditorId);
        toast.success("מיקום השלמה חדש נוסף בהצלחה! 🎉");
    };

    // כיווץ והעלאה של קובץ תמונה לשאלה ספציפית (Firebase Storage + DB)
    const handleUploadQuestionImage = async (idx, f) => {
        if (!questionsEditorId) return;
        
        setStatus('processing');
        const imagePromise = async () => {
            const options = { maxSizeMB: 0.2, maxWidthOrHeight: 1024, useWebWorker: true, initialQuality: 0.7 };
            const compressedFile = await imageCompression(f, options);
            const storage = getStorage();
            const fileRef = storageRef(storage, `exam_images/${questionsEditorId}/${idx}_${Date.now()}`);
            await uploadBytes(fileRef, compressedFile);
            const downloadURL = await getDownloadURL(fileRef);

            const updates = {};
            updates[`exam_contents/${questionsEditorId}/${idx}/imageUrl`] = downloadURL;
            updates[`exam_contents/${questionsEditorId}/${idx}/hasImage`] = true;
            await update(ref(db), updates);
            
            logAdminAction("העלאת תמונה לשאלה", `הועלתה תמונה חדשה לשאלה ${idx + 1}`, questionsEditorId);

            setExamQuestions(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], imageUrl: downloadURL, hasImage: true };
                return updated;
            });
        };

        try {
            await toast.promise(imagePromise(), {
                loading: 'מכווץ ומעלה תמונה...',
                success: 'התמונה שויכה לשאלה בהצלחה! 🖼️',
                error: 'שגיאה בהעלאת התמונה.'
            });
        } finally {
            setStatus('idle');
        }
    };

    // סימון תשובה נכונה (תומך במצב יחיד או במצב מרובה תשובות-מערך)
    const handleSetMainCorrect = async (idx, optIdx, isMultiSelectMode = false) => {
        const q = examQuestions[idx];
        let currentCorrect = q.correctIndex;
        let newCorrect;
        if (isMultiSelectMode) {
            let arr = [];
            if (Array.isArray(currentCorrect)) arr = [...currentCorrect];
            else if (typeof currentCorrect === 'number') arr = [currentCorrect];
            if (arr.includes(optIdx)) arr = arr.filter(i => i !== optIdx);
            else arr.push(optIdx);
            arr.sort((a, b) => a - b);
            newCorrect = arr.length === 1 ? arr[0] : arr.length === 0 ? null : arr;
        } else { newCorrect = optIdx; }
        setExamQuestions(prev => {
            const updated = [...prev];
            updated[idx].correctIndex = newCorrect;
            return updated;
        });
        await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { correctIndex: newCorrect });
        logAdminAction("שינוי תשובה נכונה", `עודכנה התשובה הנכונה בשאלה ${idx + 1}`, questionsEditorId);
    };

    // הוספה או ביטול של סימון מסיח שהתקבל בערעור
    const handleToggleAppeal = async (idx, optIdx) => {
        const q = examQuestions[idx];
        const cur = q.appealedIndexes || [];
        const newer = cur.includes(optIdx) ? cur.filter(i => i !== optIdx) : [...cur, optIdx];
        await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { appealedIndexes: newer });
        
        logAdminAction("עדכון ערעור בשאלה", `שונה הסטטוס של אפשרות ${optIdx + 1} (התקבל בערעור: ${newer.includes(optIdx)}) בשאלה ${idx + 1}`, questionsEditorId);
        setExamQuestions(p => { const n = [...p]; n[idx].appealedIndexes = newer; return n; });
    };

    // פסילת שאלה או שחזורה (הוצאה/הכנסה משקלול הציון הכללי של הסטודנטים)
    const handleToggleCancel = async (idx) => {
        const ns = !examQuestions[idx].isCanceled;
        await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { isCanceled: ns });
        
        logAdminAction(ns ? "ביטול/פסילת שאלה" : "שחזור שאלה שנפסלה", `הסטטוס של שאלה ${idx + 1} שונה`, questionsEditorId);
        setExamQuestions(p => { const n = [...p]; n[idx].isCanceled = ns; return n; });
    };

    // --- פונקציית עזר קריטית: חישוב צבעי הסטטוס של השאלה באקורדיון (מותאם מלא ל-Dark Mode) ---
    const getQuestionStatusColor = (q) => {
        if (q.isCanceled) {
            return "bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-80";
        }
        if (q.imageNeeded && !q.hasImage) {
            return "bg-red-50 dark:bg-red-950/20 border-red-500 dark:border-red-900 shadow-red-100 dark:shadow-none";
        }
        if (q.hasImage) {
            return "bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-900 shadow-green-100 dark:shadow-none";
        }
        return "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    };

    // סגירת דיווח שגיאה של סטודנט מהרשימה
    const handleResolveReport = async (reportId) => {
        try { 
            await set(ref(db, `reported_errors/${reportId}`), null); 
            logAdminAction("סגירת דיווח שגיאה", `נסגר הדיווח עם מזהה ${reportId}`);

            toast.success("הדיווח נסגר בהצלחה");
            setReportsList(prev => prev.filter(r => r.id !== reportId));
        } catch (e) { 
            toast.error("שגיאה בסגירת הדיווח"); 
        }
    };

    return {
        examsList, setExamsList,
        reportsList,
        questionsEditorId, setQuestionsEditorId,
        examQuestions, setExamQuestions,
        showMissingImagesOnly, setShowMissingImagesOnly,
        newQuestionOptionsCount, setNewQuestionOptionsCount,
        editingExamId, setEditingExamId,
        newAppendicesFile, setNewAppendicesFile,
        handleDeleteExam, 
        handleUpdateAppendices,
        handleDeleteAppendices, 
        openQuestionsEditor,
        handleAddQuestion, handleDeleteQuestion, handleAddOptionToQuestion,
        handleRemoveOptionFromQuestion, handleQuestionTextChange, saveQuestionText,
        handleOptionTextChange, saveOptionText, handleUploadQuestionImage,
        handleSetMainCorrect, handleToggleAppeal, handleToggleCancel,
        getQuestionStatusColor, handleResolveReport,
        handleClozeCorrectIndexChange,
        handleAddOptionToCloze,
        handleRemoveOptionFromCloze,
        handleClozeOptionTextChange,
        saveClozeOptionText,
        handleToggleClozeAppeal,
        handleToggleVerify,
        handleUpdateExamYear,
        handleDeleteAiExplanation,
        handleRemoveBlankFromCloze,
        handleAddBlankToCloze
    };
}