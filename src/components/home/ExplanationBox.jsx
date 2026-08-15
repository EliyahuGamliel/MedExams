import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, update, onValue, off } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// אייקונים
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
const ThumbsUpIcon = ({ filled }) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>;
const ThumbsDownIcon = ({ filled }) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>;
const LoaderIcon = () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

export default function ExplanationBox({ examId, questionIndex, questionData, forceClose }) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (forceClose) {
            setIsOpen(false);
        }
    }, [forceClose]);

    const [isLoading, setIsLoading] = useState(false);
    const [explanationText, setExplanationText] = useState("");
    
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [userVote, setUserVote] = useState(null);

    const questionDbPath = `exam_contents/${examId}/${questionIndex}/explanationData`;
    const jsonExplanationPath = `ai_explanations/${examId}/${questionIndex}`;
    const voteDbPath = `ai_votes/${examId}/${questionIndex}`;

    // מאזינים בזמן אמת (Realtime Listener)
    useEffect(() => {
        const statsRef = ref(db, questionDbPath);
        const listener = onValue(statsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                setLikes(data.likes || 0);
                setDislikes(data.dislikes || 0);
            } else {
                setLikes(0);
                setDislikes(0);
            }
        });

        if (user && user.uid) {
            get(ref(db, `${voteDbPath}/${user.uid}`)).then((voteSnap) => {
                if (voteSnap.exists()) {
                    setUserVote(voteSnap.val());
                } else {
                    setUserVote(null); 
                }
            });
        }

        return () => off(statsRef, 'value', listener);
    }, [examId, questionIndex, questionDbPath, voteDbPath, user]);

    const handleToggle = async () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        setIsOpen(true);
        setIsLoading(true);

        try {
            const existSnap = await get(ref(db, jsonExplanationPath));
            
            if (existSnap.exists() && existSnap.val().text) {
                setExplanationText(existSnap.val().text);
                setIsLoading(false);
                return;
            }

            setExplanationText("");
            
            let correctAnswerText = "לא נמצאה תשובה";
            if (questionData.options) {
                if (Array.isArray(questionData.correctIndex)) {
                    correctAnswerText = questionData.correctIndex.map(idx => questionData.options[idx]).join(' + ');
                } else if (questionData.correctIndex !== undefined) {
                    correctAnswerText = questionData.options[questionData.correctIndex];
                }
            }

            const requestData = {
                questionText: questionData.text || "טקסט השאלה חסר",
                options: questionData.options || [],
                correctAnswers: Array.isArray(questionData.correctIndex) ? questionData.correctIndex : [questionData.correctIndex],
                correctAnswerText: correctAnswerText 
            };

            const functions = getFunctions();
            const generateExplanation = httpsCallable(functions, 'generateExplanationWithGemini');
            
            const result = await generateExplanation(requestData);
            const generatedText = result.data.explanation;

            const updates = {};
            updates[`${jsonExplanationPath}/text`] = generatedText;

            await update(ref(db), updates);
            setExplanationText(generatedText);

        } catch (error) {
            console.error("AI Generation Error (Server):", error);
            if (error.code === 'unauthenticated') {
                setExplanationText("מצטערים, רק משתמשים מחוברים יכולים לקבל הסברי AI.");
            } else {
                setExplanationText("מצטערים, התרחשה שגיאה ביצירת ההסבר. נסה שוב מאוחר יותר.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (type) => {
        if (!user) {
            toast.error("עליך להתחבר לאזור האישי כדי לדרג 🔒");
            return;
        }

        if (!explanationText || isLoading) return;

        let newLikes = likes;
        let newDislikes = dislikes;
        let newVote = type;

        if (userVote === type) {
            if (type === 'like') newLikes--;
            if (type === 'dislike') newDislikes--;
            newVote = null; 
        } else {
            if (userVote === 'like') newLikes--;
            if (userVote === 'dislike') newDislikes--;
            if (type === 'like') newLikes++;
            if (type === 'dislike') newDislikes++;
        }

        const updates = {};

        if (newDislikes >= 10) {
            updates[`${jsonExplanationPath}/text`] = null;
            updates[`${questionDbPath}/likes`] = 0;
            updates[`${questionDbPath}/dislikes`] = 0;
            updates[voteDbPath] = null; 

            setExplanationText("ההסבר נמחק אוטומטית עקב משוב שלילי מהסטודנטים (10 דיסלייקים). לחץ על הכפתור למעלה כדי לאלץ את המערכת לייצר הסבר חדש ומדויק יותר.");
            setLikes(0);
            setDislikes(0);
            setUserVote(null);

            toast.success("ההסבר נמחק תודות לדיווח שלך!");
        } else {
            updates[`${questionDbPath}/likes`] = newLikes;
            updates[`${questionDbPath}/dislikes`] = newDislikes;
            updates[`${voteDbPath}/${user.uid}`] = newVote; 

            setLikes(newLikes);
            setDislikes(newDislikes);
            setUserVote(newVote);
        }

        try {
            await update(ref(db), updates);
        } catch (error) {
            toast.error("שגיאה בשמירת ההצבעה");
        }
    };

    return (
        <div className="mt-4 print:hidden border-t border-slate-100 dark:border-slate-700/60 pt-3 animate-fade-in text-right">
            <button 
                onClick={handleToggle}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${isOpen ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400'}`}
            >
                <LightbulbIcon />
                {isOpen ? 'הסתר הסבר מפורט' : 'גלה לי למה זו התשובה הנכונה'}
            </button>

            {isOpen && (
                <div className="mt-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-4 sm:p-5 text-slate-800 dark:text-slate-200 shadow-sm animate-fade-in-down relative overflow-hidden transition-all duration-300">
                    
                    <div className="absolute top-0 left-0 opacity-5 pointer-events-none transform -translate-x-4 -translate-y-4 text-slate-900 dark:text-white">
                        <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 text-amber-600 dark:text-amber-400 space-y-3">
                            <LoaderIcon />
                            <span className="text-sm font-bold animate-pulse">Gemini מנתח את השאלה ומנסח הסבר (מאובטח)...</span>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap relative z-10 font-medium text-slate-800 dark:text-slate-200">
                                {explanationText}
                            </div>
                            
                            <div className="mt-5 pt-3 text-[10px] text-slate-500/80 dark:text-slate-400/60 font-medium text-center relative z-10">
                                * ההסבר נוצר אוטומטית על ידי בינה מלאכותית ועלול להכיל אי-דיוקים. מומלץ להצליב עם החומר הנלמד.
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-amber-200/50 dark:border-amber-900/30 pt-3 relative z-10 transition-colors">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">האם ההסבר עזר לך?</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleVote('like')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            userVote === 'like' 
                                                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 shadow-inner' 
                                                : 'bg-white dark:bg-dark-panel text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105'
                                        }`}
                                    >
                                        <ThumbsUpIcon filled={userVote === 'like'} /> {likes > 0 && likes}
                                    </button>
                                    <button 
                                        onClick={() => handleVote('dislike')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            userVote === 'dislike' 
                                                ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 shadow-inner' 
                                                : 'bg-white dark:bg-dark-panel text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105'
                                        }`}
                                    >
                                        <ThumbsDownIcon filled={userVote === 'dislike'} /> {dislikes > 0 && dislikes}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}