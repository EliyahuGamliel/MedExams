import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import { ref, get, update, remove } from "firebase/database";
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import QuestionCard from '../../../components/QuestionCard'; // ודא שהנתיב תואם אצלך!

export default function FlashcardReview() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [reviewQueue, setReviewQueue] = useState([]); 
    const [laterCards, setLaterCards] = useState([]); 
    const [cardsLearned, setCardsLearned] = useState(0); 
    
    const [loading, setLoading] = useState(true);
    const [resetTick, setResetTick] = useState(0); 
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

    useEffect(() => {
        if (!user || !courseId) return;

        const fetchPersonalCards = async () => {
            setLoading(true);
            try {
                const cardsSnap = await get(ref(db, `user_personal_flashcards/${user.uid}/${courseId}`));
                const personalCards = cardsSnap.exists() ? cardsSnap.val() : {};

                const progressSnap = await get(ref(db, `user_flashcards_progress/${user.uid}/${courseId}`));
                const userProgress = progressSnap.exists() ? progressSnap.val() : {};

                const now = Date.now();
                const immediate = [];
                const waiting = [];

                Object.keys(personalCards).forEach(cardId => {
                    const cardData = personalCards[cardId];
                    if (!cardData.isActive || !cardData.originalQuestion) return; 

                    const progress = userProgress[cardId] || { interval: 0, easeFactor: 2.5, nextReviewDate: 0, step: 0 };
                    if (progress.isSuspended) return;

                    const cardObj = { id: cardId, ...cardData, progress };

                    if (progress.nextReviewDate <= now) immediate.push(cardObj);
                    else if (progress.interval === 0 && progress.nextReviewDate > now) waiting.push(cardObj);
                });

                setReviewQueue(immediate.sort(() => Math.random() - 0.5));
                setLaterCards(waiting.sort((a, b) => a.progress.nextReviewDate - b.progress.nextReviewDate));
                setCardsLearned(0);
            } catch (error) {
                console.error(error);
                toast.error("שגיאה בטעינת השאלות");
            } finally {
                setLoading(false);
            }
        };

        fetchPersonalCards();
    }, [user, courseId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (reviewQueue.length === 0) return;

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault(); 
                setIsAnswerRevealed(true);
                return;
            } 
            
            if (e.code === 'Digit1' || e.code === 'Numpad1') {
                e.preventDefault(); handleGradeCard('again');
            } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
                e.preventDefault(); handleGradeCard('good');
            } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
                e.preventDefault(); handleGradeCard('easy');
            }
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reviewQueue]);

    const calculateNextSteps = (progress) => {
        const isGraduated = progress.interval > 0;
        const step = progress.step ?? 0; 
        const easeFactor = progress.easeFactor ?? 2.5;

        if (!isGraduated) {
            if (step === 0) return { again: { text: "1 דק'", days: 0, nextStep: 0, msDelay: 60000 }, good: { text: "10 דק'", days: 0, nextStep: 1, msDelay: 600000 }, easy: { text: "2 שע'", days: 0, nextStep: 2, msDelay: 7200000 } };
            if (step === 1) return { again: { text: "1 דק'", days: 0, nextStep: 0, msDelay: 60000 }, good: { text: "2 שע'", days: 0, nextStep: 2, msDelay: 7200000 }, easy: { text: "8 שע'", days: 0, nextStep: 3, msDelay: 28800000 } };
            if (step === 2) return { again: { text: "10 דק'", days: 0, nextStep: 1, msDelay: 600000 }, good: { text: "8 שע'", days: 0, nextStep: 3, msDelay: 28800000 }, easy: { text: "1 יום", days: 1, nextStep: 4, msDelay: 86400000 } };
            if (step === 3) return { again: { text: "10 דק'", days: 0, nextStep: 1, msDelay: 600000 }, good: { text: "1 יום", days: 1, nextStep: 4, msDelay: 86400000 }, easy: { text: "2 ימ'", days: 2, nextStep: 4, msDelay: 172800000 } };
        } 
        
        const nextGood = Math.max(1, Math.round(progress.interval * easeFactor));
        const nextEasy = Math.max(1, Math.round(progress.interval * easeFactor * 1.3));
        const lapseInterval = Math.max(1, Math.round(progress.interval * 0.2)); 

        return {
            again: { text: "10 דק'", days: lapseInterval, nextStep: 1, msDelay: 600000, isLapse: true }, 
            good: { text: `${nextGood} ימ'`, days: nextGood, nextStep: 4, msDelay: nextGood * 86400000 },
            easy: { text: `${nextEasy} ימ'`, days: nextEasy, nextStep: 4, msDelay: nextEasy * 86400000 }
        };
    };

    const handleGradeCard = async (grade) => {
        const currentCard = reviewQueue[0];
        const steps = calculateNextSteps(currentCard.progress);
        const choice = steps[grade];

        let { easeFactor } = currentCard.progress;
        if (grade === 'again') easeFactor = Math.max(1.3, easeFactor - 0.2); 
        else if (grade === 'easy') easeFactor += 0.15; 

        const savedIntervalForLater = choice.isLapse ? choice.days : choice.days;
        const currentIntervalToSave = (choice.msDelay < 86400000) ? 0 : choice.days;
        const nextReviewDate = Date.now() + choice.msDelay;

        const updatedProgress = {
            interval: currentIntervalToSave,
            savedInterval: savedIntervalForLater, 
            step: choice.nextStep,
            easeFactor,
            nextReviewDate,
            lastReviewed: Date.now()
        };

        try {
            await update(ref(db, `user_flashcards_progress/${user.uid}/${courseId}/${currentCard.id}`), updatedProgress);
        } catch (error) {
            console.error("Failed to save progress", error);
        }

        // איפוס מוחלט של מצב החשיפה כדי שהשאלה הבאה תהיה נעולה
        setIsAnswerRevealed(false);
        setResetTick(prev => prev + 1);

        setTimeout(() => {
            const updatedCard = { ...currentCard, progress: updatedProgress };
            setReviewQueue(prevQueue => {
                const rest = prevQueue.slice(1);
                if (grade === 'again') {
                    if (rest.length > 0) return [...rest, updatedCard];
                    setLaterCards([updatedCard]); return [];
                } else if (choice.msDelay < 86400000) { 
                    setLaterCards(prev => [...prev, updatedCard].sort((a,b) => a.progress.nextReviewDate - b.progress.nextReviewDate));
                    return rest;
                } else {
                    setCardsLearned(prev => prev + 1); return rest;
                }
            });
        }, 50);
    };

    const handleDeletePersonalCard = async () => {
        if (!window.confirm("להסיר את הדגל? השאלה תימחק ממאגר החזרות שלך.")) return;

        const currentCard = reviewQueue[0];
        try {
            await remove(ref(db, `user_personal_flashcards/${user.uid}/${courseId}/${currentCard.id}`));
            await remove(ref(db, `user_flashcards_progress/${user.uid}/${courseId}/${currentCard.id}`));
            toast.success("הוסר בהצלחה");
            setIsAnswerRevealed(false);
            setResetTick(prev => prev + 1);
            setReviewQueue(prev => prev.slice(1));
        } catch (error) {
            toast.error("שגיאה במחיקה");
        }
    };

    const getWaitTime = () => {
        if (laterCards.length === 0) return "";
        const msLeft = laterCards[0].progress.nextReviewDate - Date.now();
        if (msLeft <= 0) return "זמין כעת (רענן מסך)";
        const mins = Math.ceil(msLeft / 60000);
        if (mins < 60) return `${mins} דקות`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0 ? `${hours} שעות ו-${remainingMins} דקות` : `${hours} שעות`;
    };

    // פונקציה שמופעלת ברגע שהסטודנט מסמן תשובה בקומפוננטה המקורית
    const handleStudentAnswer = () => {
        setIsAnswerRevealed(true);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">מכין את השאלות שלך... 🧠</div>;

    if (reviewQueue.length === 0 && laterCards.length > 0) return (
        <div className="max-w-md mx-auto px-4 pt-20 text-center animate-fade-in text-right" dir="rtl">
            <div className="text-7xl mb-6">⏱️</div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">שאלות בהמתנה</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">סיימת את הסבב הנוכחי! ישנן <span className="font-bold text-indigo-600 dark:text-indigo-400">{laterCards.length}</span> שאלות שקבעת לחזרה קרובה.</p>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 inline-block mb-8">
               <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">השאלה הבאה תהיה זמינה בעוד:</p>
               <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1" dir="ltr">{getWaitTime()}</p>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => navigate(-1)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg transition-all">חזור לאזור האישי</button>
            </div>
        </div>
    );

    if (reviewQueue.length === 0 && laterCards.length === 0) return (
        <div className="max-w-md mx-auto px-4 pt-20 text-center animate-fade-in text-right" dir="rtl">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4">סיימת להיום!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">אין לך יותר שאלות חזרה בקורס הזה להיום. חזור לתרגל מבחנים וסמן דגלים (🚩) בשאלות שתרצה לזכור!</p>
            <div className="flex flex-col gap-3">
                <button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl shadow-lg transition-all">חזור לאזור האישי</button>
            </div>
        </div>
    );

    const currentCard = reviewQueue[0];
    const q = currentCard.originalQuestion;
    const steps = calculateNextSteps(currentCard.progress);

    // =========================================================================
    // הנדסה לאחור של המזהים המקוריים כדי שקופסת ההסבר לא תפנה ל-Gemini סתם!
    // =========================================================================
    const parts = currentCard.id.split('_q');
    const realExamId = currentCard.examDbId || parts[0];
    const realIndex = currentCard.originalIndex !== undefined ? currentCard.originalIndex : parseInt(parts[1] || '0', 10);

    const dummySettings = { testReviewMode: 'all', fontSize: 'normal', autoScroll: false };

    return (
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 flex flex-col h-full text-right" dir="rtl">
            
            <div className="flex justify-between items-center mb-6 shrink-0 bg-white/50 dark:bg-slate-900/50 p-3 rounded-2xl backdrop-blur-sm border border-slate-200 dark:border-slate-800">
                <button onClick={() => navigate(-1)} className="bg-white dark:bg-dark-panel p-2.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 text-slate-500 hover:bg-slate-50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="text-center truncate px-4">
                    <h1 className="font-black text-slate-800 dark:text-slate-200 truncate">{courseId} - חזרות</h1>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
                        מתוך: {currentCard.sourceExam}
                    </p>
                </div>
                <div className="text-left w-10">
                    <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">
                        {reviewQueue.length} נותרו
                    </span>
                </div>
            </div>

            <div className="flex-1 animate-fade-in pb-8">
                
                <div className="mb-6 pointer-events-auto">
                    {/* המפתח (key) מבטיח שהקומפוננטה תושמד ותיבנה מחדש בכל פעם שנעבור שאלה, כך שלא יהיה זיכרון מעצבן */}
                    <QuestionCard 
                        key={`${currentCard.id}_${resetTick}`} 
                        question={q} 
                        index={realIndex} // הופך את קופסת ההסבר לחכמה ומונע בקשה ל-Gemini
                        mode="practice" 
                        onAnswer={handleStudentAnswer} 
                        isSubmitted={isAnswerRevealed} 
                        examId={realExamId} // חיוני למשיכת ההסבר הקיים
                        imageUrl={currentCard.imageUrl} 
                        isFlagged={true} 
                        onToggleFlag={handleDeletePersonalCard} 
                        onToggleUserExclude={() => {}}
                        isUserExcluded={false}
                        eliminatedOptions={[]}
                        onToggleEliminate={() => {}}
                        resetTick={resetTick} 
                        userSettings={dummySettings}
                        onCorrectAutoScroll={() => {}}
                    />
                </div>

                {/* כפתורי הדירוג מוצגים מההתחלה - פשוט וקל כמו שביקשת */}
                <div className="mt-8 shrink-0 pb-10">
                    <div className="animate-fade-in-up max-w-md mx-auto">
                        <h3 className="text-center text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide">
                            {isAnswerRevealed ? "איך הלך לך? דרג כדי לעבור הלאה:" : "אם אתה יודע את התשובה, דרג את רמת הקושי:"}
                        </h3>
                        <div className="flex gap-3">
                            <button onClick={() => handleGradeCard('again')} className="flex-1 bg-red-100 dark:bg-red-900/40 text-red-700 border border-red-200 font-bold py-3 rounded-2xl hover:bg-red-200 transition-colors active:scale-95 flex flex-col items-center shadow-sm">
                                <span className="block text-xl mb-1">🔴</span><span>טעיתי</span><span className="text-[10px] mt-1 opacity-70 font-black">{steps.again.text}</span>
                            </button>
                            <button onClick={() => handleGradeCard('good')} className="flex-1 bg-green-100 dark:bg-green-900/40 text-green-700 border border-green-200 font-bold py-3 rounded-2xl hover:bg-green-200 transition-colors active:scale-95 flex flex-col items-center shadow-sm">
                                <span className="block text-xl mb-1">🟢</span><span>זכרתי</span><span className="text-[10px] mt-1 opacity-70 font-black">{steps.good.text}</span>
                            </button>
                            <button onClick={() => handleGradeCard('easy')} className="flex-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 border border-blue-200 font-bold py-3 rounded-2xl hover:bg-blue-200 transition-colors active:scale-95 flex flex-col items-center shadow-sm">
                                <span className="block text-xl mb-1">🔵</span><span>קל מאוד</span><span className="text-[10px] mt-1 opacity-70 font-black">{steps.easy.text}</span>
                            </button>
                        </div>
                        <p className="text-center text-slate-400 text-[11px] mt-4 hidden sm:block font-bold">קיצורי מקלדת: <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">1</span> טעיתי • <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">2</span> זכרתי • <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">3</span> קל</p>
                    </div>
                </div>
            </div>

        </div>
    );
}