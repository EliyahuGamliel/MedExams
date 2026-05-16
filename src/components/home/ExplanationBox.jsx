import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, update } from 'firebase/database';
import { GoogleGenerativeAI } from "@google/generative-ai";
import toast from 'react-hot-toast';

// אייקונים
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
const ThumbsUpIcon = ({ filled }) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>;
const ThumbsDownIcon = ({ filled }) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>;
const LoaderIcon = () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

// מפתח ה-API מהגדרות הסביבה
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY);

// פונקציה שבודקת אם למכשיר הזה כבר יש ID, ואם לא - מייצרת אחד (עבור הצבעות)
const getDeviceId = () => {
    let deviceId = localStorage.getItem('exam_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('exam_device_id', deviceId);
    }
    return deviceId;
};

export default function ExplanationBox({ examId, questionIndex, questionData, userId, forceClose }) {
    // זיהוי משתמש: אם יש יוזר רשום נשתמש בו, אחרת נשתמש במזהה המכשיר המקומי
    const actualUserId = (userId && userId !== "anonymous") ? userId : getDeviceId();

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (forceClose) {
            setIsOpen(false);
        }
    }, [forceClose]);

    const [isLoading, setIsLoading] = useState(false);
    const [explanationText, setExplanationText] = useState("");
    
    // סטייט להצבעות
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [userVote, setUserVote] = useState(null);

    const questionDbPath = `exam_contents/${examId}/${questionIndex}/explanationData`;

    // בדיקה שקטה האם כבר קיים הסבר לשאלה זו במסד הנתונים
    useEffect(() => {
        const fetchExisting = async () => {
            try {
                const snap = await get(ref(db, questionDbPath));
                if (snap.exists()) {
                    const data = snap.val();
                    if (data.text) {
                        setExplanationText(data.text);
                    }
                    setLikes(data.likes || 0);
                    setDislikes(data.dislikes || 0);
                    // שימוש ב-actualUserId כדי לראות אם המכשיר הזה כבר הצביע
                    if (data.voters && data.voters[actualUserId]) {
                        setUserVote(data.voters[actualUserId]);
                    }
                }
            } catch (e) {
                console.error("Error loading explanation:", e);
            }
        };
        fetchExisting();
    }, [examId, questionIndex, questionDbPath, actualUserId]);

    // הפונקציה המרכזית: מופעלת כשלוחצים על המנורה
    const handleToggle = async () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        setIsOpen(true);

        if (explanationText) return;

        setIsLoading(true);
        try {
            // חילוץ חכם של התשובה הנכונה
            let correctAnswerText = "לא נמצאה תשובה";
            if (questionData.options) {
                if (Array.isArray(questionData.correctIndex)) {
                    correctAnswerText = questionData.correctIndex.map(idx => questionData.options[idx]).join(' + ');
                } else if (questionData.correctIndex !== undefined) {
                    correctAnswerText = questionData.options[questionData.correctIndex];
                }
            }

            const optionsText = questionData.options ? questionData.options.join('\n') : 'שאלה פתוחה/השלמה';
            const questionText = questionData.text || "טקסט השאלה חסר";

            // פרומפט נוקשה עם כללים מוגדרים
            const prompt = `
            אתה מומחה רפואי ומרצה בכיר באקדמיה. הסטודנט נבחן על השאלה הבאה ורוצה לדעת למה התשובה המסומנת היא הנכונה.

            השאלה: "${questionText}"
            התשובה הנכונה: "${correctAnswerText}"
            כל האפשרויות שהוצגו: 
            ${optionsText}

            חובה עליך לפעול לפי הכללים הבאים:
            1. התבסס אך ורק על ספרות מקצועית ועובדות מדעיות מוכחות.
            2. אל תמציא מידע! אם אינך בטוח בוודאות מוחלטת בהסבר, כתוב בדיוק את המשפט הבא ואל תוסיף מילה: "המידע הקיים אינו מספיק כדי לספק הסבר ודאי לשאלה זו."
            3. אם התשובה הנכונה נראית לך שגויה קלינית, הסבר מדוע אך עדיין נסה להבין את כוונת השאלה.
            4. כתוב הסבר קליני ממוקד בעברית (עד 3 פסקאות), כולל הסבר קצר מדוע המסיחים האחרים שגויים.
            `;

            // שימוש במודל PRO החכם יותר
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 
            const result = await model.generateContent(prompt);
            const generatedText = result.response.text();

            // שמירה ב-Firebase
            await update(ref(db), { 
                [`${questionDbPath}/text`]: generatedText,
                [`${questionDbPath}/likes`]: 0,
                [`${questionDbPath}/dislikes`]: 0
            });

            setExplanationText(generatedText);

        } catch (error) {
            console.error("AI Generation Error:", error);
            setExplanationText("מצטערים, התרחשה שגיאה ביצירת ההסבר. נסה שוב מאוחר יותר.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVote = async (type) => {
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

        setLikes(newLikes);
        setDislikes(newDislikes);
        setUserVote(newVote);

        const updates = {};
        updates[`${questionDbPath}/likes`] = newLikes;
        updates[`${questionDbPath}/dislikes`] = newDislikes;
        // שימוש במזהה המכשיר כדי לשמור את ההצבעה
        updates[`${questionDbPath}/voters/${actualUserId}`] = newVote;

        try {
            await update(ref(db), updates);
        } catch (error) {
            toast.error("שגיאה בשמירת ההצבעה");
        }
    };

    return (
        <div className="mt-4 print:hidden border-t border-slate-100 pt-3 animate-fade-in">
            <button 
                onClick={handleToggle}
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${isOpen ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}
            >
                <LightbulbIcon />
                {isOpen ? 'הסתר הסבר מפורט' : 'גלה לי למה זו התשובה הנכונה'}
            </button>

            {isOpen && (
                <div className="mt-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 sm:p-5 text-slate-800 shadow-sm animate-fade-in-down relative overflow-hidden">
                    
                    {/* רקע דקורטיבי קל */}
                    <div className="absolute top-0 left-0 opacity-5 pointer-events-none transform -translate-x-4 -translate-y-4">
                        <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-6 text-amber-600 space-y-3">
                            <LoaderIcon />
                            <span className="text-sm font-bold animate-pulse">Gemini מנתח את השאלה ומנסח הסבר...</span>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap relative z-10 font-medium">
                                {explanationText}
                            </div>
                            
                            {/* הערת האזהרה לסטודנטים */}
                            <div className="mt-3 text-[10px] text-slate-500/80 font-medium text-center relative z-10">
                                * ההסבר נוצר אוטומטית על ידי בינה מלאכותית ועלול להכיל אי-דיוקים. מומלץ להצליב עם החומר הנלמד.
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-amber-200/50 pt-3 relative z-10">
                                <span className="text-xs font-bold text-slate-500">האם ההסבר של ה-AI עזר לך?</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleVote('like')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userVote === 'like' ? 'bg-green-100 text-green-700 shadow-inner' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:scale-105'}`}
                                    >
                                        <ThumbsUpIcon filled={userVote === 'like'} /> {likes > 0 && likes}
                                    </button>
                                    <button 
                                        onClick={() => handleVote('dislike')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userVote === 'dislike' ? 'bg-red-100 text-red-700 shadow-inner' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:scale-105'}`}
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