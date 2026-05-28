import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase'; 
import { ref, get } from 'firebase/database';
import toast from 'react-hot-toast';

export default function ExamGeneratorBanner({ courseId, examsList }) {
    const navigate = useNavigate();
    
    const [questionCount, setQuestionCount] = useState(30);
    const [selectedMode, setSelectedMode] = useState('practice'); 
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateExam = async () => {
        const count = Math.max(1, Number(questionCount) || 10);
        setIsGenerating(true);

        try {
            const courseExams = examsList.filter(e => e.course === courseId);
            if (courseExams.length === 0) {
                toast.error("לא נמצאו מבחנים לקורס זה.");
                setIsGenerating(false);
                return;
            }

            let allQuestions = [];

            const fetchPromises = courseExams.map(async (exam) => {
                let qData = [];
                let iData = {};

                const cachedQuestions = sessionStorage.getItem(`cache_q_${exam.id}`);
                const cachedImages = sessionStorage.getItem(`cache_img_${exam.id}`);

                if (cachedQuestions) {
                    qData = JSON.parse(cachedQuestions);
                    if (cachedImages) iData = JSON.parse(cachedImages);
                } else {
                    const [contentSnap, imagesSnap] = await Promise.all([
                        get(ref(db, `exam_contents/${exam.id}`)),
                        get(ref(db, `exam_images/${exam.id}`))
                    ]);
                    qData = contentSnap.exists() ? contentSnap.val() : [];
                    iData = imagesSnap.exists() ? imagesSnap.val() : {};
                    
                    sessionStorage.setItem(`cache_q_${exam.id}`, JSON.stringify(qData));
                    sessionStorage.setItem(`cache_img_${exam.id}`, JSON.stringify(iData));
                }

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

            const uniqueMap = new Map();
            allQuestions.forEach(q => {
                if (!uniqueMap.has(q.dedupKey)) {
                    uniqueMap.set(q.dedupKey, q);
                }
            });
            
            let uniqueQuestions = Array.from(uniqueMap.values());

            if (uniqueQuestions.length === 0) {
                toast.error("לא נמצאו שאלות תקינות במבחנים של הקורס.");
                setIsGenerating(false);
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
            const meta = {
                id: generatedId,
                title: `סימולציה מותאמת אישית (${finalQuestions.length} שאלות)`,
                course: courseId,
                questionCount: finalQuestions.length,
                isVerified: true
            };

            sessionStorage.setItem(`cache_meta_${generatedId}`, JSON.stringify(meta));
            sessionStorage.setItem(`cache_q_${generatedId}`, JSON.stringify(finalQuestions));
            sessionStorage.setItem(`cache_img_${generatedId}`, JSON.stringify(finalImages));

            toast.success("הסימולציה מוכנה! 🚀");
            navigate(`/exam/${generatedId}/${selectedMode}`);

        } catch (err) {
            console.error(err);
            toast.error("שגיאה ביצירת המבחן");
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[32px] p-5 shadow-lg mb-8 text-white relative overflow-hidden" dir="rtl">
            {/* אפקטי תאורה ברקע */}
            <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-[-30px] right-[-10px] w-40 h-40 bg-indigo-400 opacity-20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                
                {/* צד ימין - טקסט */}
                <div className="flex items-center gap-4 text-right w-full md:w-auto">
                    <div className="text-4xl bg-white/20 p-3 rounded-2xl shrink-0 shadow-inner">🎲</div>
                    <div>
                        <h3 className="text-xl font-black mb-0.5">מחולל מבחנים חכם</h3>
                        <p className="text-indigo-100 text-xs font-medium">המערכת תרכיב לך סימולציה מכל שאלות העבר.</p>
                    </div>
                </div>

                {/* צד שמאל - בנוי כבלוק של 2 שורות */}
                <div className="flex flex-col gap-2 w-full md:w-[280px] shrink-0">
                    
                    {/* שורה עליונה: בחירת כמות + בחירת מצב */}
                    <div className="flex gap-2 h-[42px]">
                        
                        {/* בחירת כמות שאלות */}
                        <div className="flex items-center justify-center bg-white/10 border border-white/20 rounded-xl px-2 flex-1 shadow-inner">
                            <input 
                                type="number" 
                                min="1" 
                                max="300"
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                disabled={isGenerating}
                                className="bg-transparent text-white text-base font-black w-10 text-center focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-indigo-200 text-[10px] font-bold">שאלות</span>
                        </div>

                        {/* בחירת מצב (תרגול / מבחן) */}
                        <div className="flex items-center bg-white/10 border border-white/20 rounded-xl p-1 flex-[1.4] shadow-inner">
                            <button 
                                onClick={() => setSelectedMode('practice')}
                                disabled={isGenerating}
                                className={`flex-1 h-full rounded-lg font-bold text-[11px] transition-all ${
                                    selectedMode === 'practice' 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'text-indigo-200 hover:bg-white/10'
                                }`}
                            >
                                🎯 תרגול
                            </button>
                            <button 
                                onClick={() => setSelectedMode('test')}
                                disabled={isGenerating}
                                className={`flex-1 h-full rounded-lg font-bold text-[11px] transition-all ${
                                    selectedMode === 'test' 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'text-indigo-200 hover:bg-white/10'
                                }`}
                            >
                                📝 מבחן
                            </button>
                        </div>
                    </div>
                    
                    {/* שורה תחתונה: כפתור היצירה (באותו רוחב של השורה מעל) */}
                    <button 
                        onClick={handleGenerateExam}
                        disabled={isGenerating}
                        className={`w-full h-[42px] rounded-xl font-black text-sm transition-all shadow-md flex justify-center items-center gap-2 ${
                            isGenerating 
                                ? 'bg-white/50 text-indigo-900 cursor-not-allowed' 
                                : 'bg-white text-indigo-700 hover:bg-slate-50 active:scale-95'
                        }`}
                    >
                        {isGenerating ? (
                            <><span className="animate-spin text-lg">⏳</span> ממתין...</>
                        ) : (
                            "צור סימולציה 🚀"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}