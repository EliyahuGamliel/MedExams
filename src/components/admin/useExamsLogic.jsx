import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, set, update, remove, onValue } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from 'browser-image-compression';

export function useExamsLogic(setStatus) {
    // --- States ---
    const [examsList, setExamsList] = useState([]);
    const [reportsList, setReportsList] = useState([]);
    const [questionsEditorId, setQuestionsEditorId] = useState(null);
    const [examQuestions, setExamQuestions] = useState([]);
    const [showMissingImagesOnly, setShowMissingImagesOnly] = useState(false);
    const [newQuestionOptionsCount, setNewQuestionOptionsCount] = useState(4);
    const [editingExamId, setEditingExamId] = useState(null);
    const [newAppendicesFile, setNewAppendicesFile] = useState(null);

    // --- טעינת נתונים ראשונית (מבחנים ודיווחים) ---
    useEffect(() => {
        // טעינת מבחנים
        get(ref(db, 'uploaded_exams')).then((snap) => {
            const data = snap.val();
            setExamsList(data ? Object.values(data) : []);
        });

        // האזנה חיה לדיווחים
        const unsubscribeReports = onValue(ref(db, 'reported_errors'), (snap) => {
            const data = snap.val();
            if (data) {
                const reportsArr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                reportsArr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setReportsList(reportsArr);
            } else {
                setReportsList([]);
            }
        });

        return () => unsubscribeReports();
    }, []);

    // --- פעולות עריכת מבחנים ---
    const handleDeleteExam = async (examId) => {
        if (!window.confirm("למחוק?")) return;
        try {
            setStatus('processing');
            const updates = {};
            updates[`uploaded_exams/${examId}`] = null;
            updates[`exam_contents/${examId}`] = null;
            updates[`exam_appendices/${examId}`] = null;
            updates[`exam_images/${examId}`] = null;
            await update(ref(db), updates);
            // עדכון הסטייט המקומי
            setExamsList(prev => prev.filter(e => e.id !== examId));
            alert("נמחק."); setStatus('idle');
        } catch (e) { alert(e.message); setStatus('idle'); }
    };

    const handleUpdateAppendices = async (examId) => {
        if (!newAppendicesFile) return alert("בחר קובץ");
        try {
            setStatus('processing');
            const storage = getStorage();
            const fileRef = storageRef(storage, `exam_appendices/${examId}.pdf`);
            await uploadBytes(fileRef, newAppendicesFile);
            const downloadURL = await getDownloadURL(fileRef);
            await update(ref(db, `uploaded_exams/${examId}`), { hasAppendices: true });
            await set(ref(db, `exam_appendices/${examId}`), { fileUrl: downloadURL });
            alert("עודכן!"); setEditingExamId(null); setNewAppendicesFile(null); setStatus('idle');
        } catch (e) { alert(e.message); setStatus('idle'); }
    };

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
            const questionsData = snapshot.val();
            setExamQuestions(questionsData || []);
        } catch (e) { alert("שגיאה בטעינת השאלות: " + e.message); } finally { setStatus('idle'); }
    };

    // --- פעולות עריכת שאלות (הוספה, מחיקה, אופציות) ---
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
        setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: updatedQuestions.length } : e));
    };

    const handleDeleteQuestion = async (idxToDelete) => {
        if (!window.confirm("האם למחוק שאלה זו לצמיתות?")) return;
        const filtered = examQuestions.filter((_, i) => i !== idxToDelete);
        const reindexedQuestions = filtered.map((q, i) => ({ ...q, id: i }));
        setExamQuestions(reindexedQuestions);
        const updates = {};
        updates[`exam_contents/${questionsEditorId}`] = reindexedQuestions;
        updates[`uploaded_exams/${questionsEditorId}/questionCount`] = reindexedQuestions.length;
        await update(ref(db), updates);
        setExamsList(prev => prev.map(e => e.id === questionsEditorId ? { ...e, questionCount: reindexedQuestions.length } : e));
    };

    const handleAddOptionToQuestion = async (qIdx) => {
        const updated = [...examQuestions];
        const currentOpts = updated[qIdx].options || [];
        updated[qIdx].options = [...currentOpts, `אפשרות ${currentOpts.length + 1}`];
        setExamQuestions(updated);
        await set(ref(db, `exam_contents/${questionsEditorId}/${qIdx}/options`), updated[qIdx].options);
    };

    const handleRemoveOptionFromQuestion = async (qIdx, optIdx) => {
        const updated = [...examQuestions];
        const currentOpts = updated[qIdx].options;
        if (currentOpts.length <= 2) return alert("חייבות להיות לפחות 2 אפשרויות.");
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

    const handleUploadQuestionImage = async (idx, f) => {
        if (!questionsEditorId) return;
        try {
            setStatus('processing');
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

            setExamQuestions(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], imageUrl: downloadURL, hasImage: true };
                return updated;
            });
            setStatus('idle');
        } catch (e) { alert(e.message); setStatus('idle'); }
    };

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
    };

    const handleToggleAppeal = async (idx, optIdx) => {
        const q = examQuestions[idx];
        const cur = q.appealedIndexes || [];
        const newer = cur.includes(optIdx) ? cur.filter(i => i !== optIdx) : [...cur, optIdx];
        await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { appealedIndexes: newer });
        setExamQuestions(p => { const n = [...p]; n[idx].appealedIndexes = newer; return n; });
    };

    const handleToggleCancel = async (idx) => {
        const ns = !examQuestions[idx].isCanceled;
        await update(ref(db, `exam_contents/${questionsEditorId}/${idx}`), { isCanceled: ns });
        setExamQuestions(p => { const n = [...p]; n[idx].isCanceled = ns; return n; });
    };

    const getQuestionStatusColor = (q) => {
        if (q.isCanceled) return "bg-slate-100 border-slate-300 opacity-80";
        if (q.imageNeeded && !q.hasImage) return "bg-red-50 border-red-500 shadow-red-100";
        if (q.hasImage) return "bg-green-50 border-green-500 shadow-green-100";
        return "bg-white border-slate-200";
    };

    // --- פעולת דיווחים ---
    const handleResolveReport = async (reportId) => {
        try { await set(ref(db, `reported_errors/${reportId}`), null); } catch (e) { }
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
        handleDeleteExam, handleUpdateAppendices, openQuestionsEditor,
        handleAddQuestion, handleDeleteQuestion, handleAddOptionToQuestion,
        handleRemoveOptionFromQuestion, handleQuestionTextChange, saveQuestionText,
        handleOptionTextChange, saveOptionText, handleUploadQuestionImage,
        handleSetMainCorrect, handleToggleAppeal, handleToggleCancel,
        getQuestionStatusColor, handleResolveReport
    };
}