import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // הוספנו משיכת משתמש
import { db } from '../../firebase'; 
import { ref, get } from 'firebase/database';
import toast from 'react-hot-toast';

export default function GenerateExam({ examsList }) {
    const { courseId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // שימוש בקונטקסט
    const count = parseInt(searchParams.get('count')) || 30;

    const [status, setStatus] = useState("בודק הגדרות אישיות...");

    useEffect(() => {
        // חייבים לוודא שהיוזר נטען כדי למשוך את ההגדרות שלו
        if (!user) return;

        const generate = async () => {
            try {
                // משיכת הגדרת מקור הסימולציה מהפרופיל
                const settingsSnap = await get(ref(db, `users/${user.uid}/settings/simulationSource`));
                const simulationSource = settingsSnap.exists() ? settingsSnap.val() : 'all';

                let allQuestions = [];

                // --- פיצול לוגיקה לפי מקור השאלות ---
                if (simulationSource === 'flagged_only') {
                    setStatus("אוסף את השאלות המסומנות שלך...");
                    const flaggedSnap = await get(ref(db, `user_personal_flashcards/${user.uid}/${courseId}`));
                    
                    if (!flaggedSnap.exists() || Object.keys(flaggedSnap.val()).length === 0) {
                        toast.error("אין לך שאלות מסומנות בדגלון בקורס זה. שנה הגדרות או סמן שאלות.");
                        navigate(-1);
                        return;
                    }

                    const flaggedData = flaggedSnap.val();
                    Object.entries(flaggedData).forEach(([cardId, card]) => {
                        if (!card.originalQuestion) return;
                        
                        let dedupKey = "";
                        if (card.originalQuestion.text && card.originalQuestion.text.length > 5) {
                            dedupKey = card.originalQuestion.text.replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, '');
                        } else if (card.imageUrl) {
                            dedupKey = card.imageUrl;
                        } else {
                            dedupKey = cardId;
                        }

                        allQuestions.push({
                            ...card.originalQuestion,
                            originalExamId: "flagged",
                            originalExamTitle: card.sourceExam || "שאלות בדגלון",
                            originalIndex: cardId,
                            imageUrl: card.imageUrl || null,
                            dedupKey: dedupKey
                        });
                    });
                } else {
                    // הלוגיקה המקורית: כל המבחנים בקורס
                    setStatus("אוסף מבחנים...");
                    const courseExams = examsList.filter(e => e.course === courseId);
                    if (courseExams.length === 0) {
                        toast.error("לא נמצאו מבחנים לקורס זה.");
                        navigate(-1);
                        return;
                    }

                    setStatus("קורא את כל השאלות ממסד הנתונים...");
                    
                    const fetchPromises = courseExams.map(async (exam) => {
                        const [contentSnap, imagesSnap] = await Promise.all([
                            get(ref(db, `exam_contents/${exam.id}`)),
                            get(ref(db, `exam_images/${exam.id}`))
                        ]);
                        
                        const qData = contentSnap.exists() ? contentSnap.val() : [];
                        const iData = imagesSnap.exists() ? imagesSnap.val() : {};

                        const questions = [];
                        qData.forEach((q, idx) => {
                            if (q.isCanceled || q.type === 'open_ended') return;
                            
                            let dedupKey = "";
                            if (q.text && q.text.length > 5) {
                                dedupKey = q.text.replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, ''); 
                            } else if (q.imageUrl || iData[idx]) {
                                dedupKey = q.imageUrl || iData[idx];
                            } else {
                                return; 
                            }

                            questions.push({
                                ...q,
                                originalExamId: exam.id,
                                originalExamTitle: exam.title,
                                originalIndex: idx,
                                imageUrl: q.imageUrl || iData[idx] || null,
                                dedupKey: dedupKey
                            });
                        });
                        return questions;
                    });

                    const results = await Promise.all(fetchPromises);
                    results.forEach(res => allQuestions.push(...res));
                }

                setStatus("מסנן כפילויות ומערבב...");
                
                // סינון כפילויות משותף
                const uniqueMap = new Map();
                allQuestions.forEach(q => {
                    if (!uniqueMap.has(q.dedupKey)) {
                        uniqueMap.set(q.dedupKey, q);
                    }
                });
                
                let uniqueQuestions = Array.from(uniqueMap.values());

                if (uniqueQuestions.length === 0) {
                    toast.error("לא נמצאו שאלות תקינות ליצירת הסימולציה.");
                    navigate(-1);
                    return;
                }

                uniqueQuestions.sort(() => Math.random() - 0.5);
                const selectedQuestions = uniqueQuestions.slice(0, count);

                const finalImages = {};
                const finalQuestions = selectedQuestions.map((q, i) => {
                    if (q.imageUrl) finalImages[i] = q.imageUrl;
                    return {
                        ...q,
                        text: `${q.text}\n\n[מקור השאלה: ${q.originalExamTitle}]`
                    };
                });

                const generatedId = `gen_${Date.now()}`;
                const titleSource = simulationSource === 'flagged_only' ? 'משאלות מסומנות' : 'מותאמת אישית';
                const meta = {
                    id: generatedId,
                    title: `סימולציה ${titleSource} (${finalQuestions.length} שאלות)`,
                    course: courseId,
                    questionCount: finalQuestions.length,
                    isVerified: true
                };

                setStatus("מכין את המבחן...");
                
                sessionStorage.setItem(`cache_meta_${generatedId}`, JSON.stringify(meta));
                sessionStorage.setItem(`cache_q_${generatedId}`, JSON.stringify(finalQuestions));
                sessionStorage.setItem(`cache_img_${generatedId}`, JSON.stringify(finalImages));

                toast.success("הסימולציה מוכנה! בהצלחה 🚀");
                navigate(`/exam/${generatedId}/practice`, { replace: true });

            } catch (err) {
                console.error(err);
                toast.error("שגיאה ביצירת המבחן");
                navigate(-1);
            }
        };

        setTimeout(generate, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // שינוי התלות - הפונקציה תרוץ מחדש ברגע שהיוזר נטען

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center px-4" dir="rtl">
            <div className="text-7xl mb-6 animate-bounce drop-shadow-lg">🎲</div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-3">מרכיב את הסימולציה שלך...</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{status}</p>
            <div className="mt-10 w-16 h-16 border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin shadow-lg"></div>
        </div>
    );
}