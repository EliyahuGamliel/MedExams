import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../firebase'; // ודא שהנתיב תואם אצלך
import { ref, get } from 'firebase/database';
import toast from 'react-hot-toast';

export default function GenerateExam({ examsList }) {
    const { courseId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const count = parseInt(searchParams.get('count')) || 30;

    const [status, setStatus] = useState("אוסף מבחנים...");

    useEffect(() => {
        const generate = async () => {
            try {
                // 1. מוצאים את כל המבחנים של הקורס
                const courseExams = examsList.filter(e => e.course === courseId);
                if (courseExams.length === 0) {
                    toast.error("לא נמצאו מבחנים לקורס זה.");
                    navigate(-1);
                    return;
                }

                setStatus("קורא את כל השאלות ממסד הנתונים...");
                let allQuestions = [];

                // 2. משיכת הנתונים במקביל מ-Firebase כדי שזה יהיה מהיר טיל
                const fetchPromises = courseExams.map(async (exam) => {
                    const [contentSnap, imagesSnap] = await Promise.all([
                        get(ref(db, `exam_contents/${exam.id}`)),
                        get(ref(db, `exam_images/${exam.id}`))
                    ]);
                    
                    const qData = contentSnap.exists() ? contentSnap.val() : [];
                    const iData = imagesSnap.exists() ? imagesSnap.val() : {};

                    const questions = [];
                    qData.forEach((q, idx) => {
                        // מדלגים על שאלות פתוחות או פסולות
                        if (q.isCanceled || q.type === 'open_ended') return;
                        
                        // יצירת מפתח ייחודי כדי למנוע משאלות שחזרו על עצמן להופיע פעמיים
                        let dedupKey = "";
                        if (q.text && q.text.length > 5) {
                            dedupKey = q.text.replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, ''); // משאיר רק אותיות ומספרים
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

                setStatus("מסנן כפילויות ומערבב...");
                
                // 3. סינון הכפילויות
                const uniqueMap = new Map();
                allQuestions.forEach(q => {
                    if (!uniqueMap.has(q.dedupKey)) {
                        uniqueMap.set(q.dedupKey, q);
                    }
                });
                
                let uniqueQuestions = Array.from(uniqueMap.values());

                if (uniqueQuestions.length === 0) {
                    toast.error("לא נמצאו שאלות תקינות במבחנים של הקורס.");
                    navigate(-1);
                    return;
                }

                // 4. ערבוב אקראי (Shuffle)
                uniqueQuestions.sort(() => Math.random() - 0.5);

                // 5. חיתוך לפי הכמות שהסטודנט בחר
                const selectedQuestions = uniqueQuestions.slice(0, count);

                const finalImages = {};
                const finalQuestions = selectedQuestions.map((q, i) => {
                    if (q.imageUrl) finalImages[i] = q.imageUrl;
                    
                    // תוספת קטנה וגאונית - כותבים מאיזה מבחן השאלה לקוחה!
                    return {
                        ...q,
                        text: `${q.text}\n\n[מקור השאלה: ${q.originalExamTitle}]`
                    };
                });

                // 6. שומרים בזיכרון המקומי ומעבירים לתרגול!
                const generatedId = `gen_${Date.now()}`;
                const meta = {
                    id: generatedId,
                    title: `סימולציה מותאמת אישית (${finalQuestions.length} שאלות)`,
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
    }, []);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center px-4" dir="rtl">
            <div className="text-7xl mb-6 animate-bounce drop-shadow-lg">🎲</div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-3">מרכיב את הסימולציה שלך...</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{status}</p>
            <div className="mt-10 w-16 h-16 border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin shadow-lg"></div>
        </div>
    );
}