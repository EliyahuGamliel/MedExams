import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { ref, onValue } from "firebase/database";

export default function UserProfile() {
    const { user, userData, loading: authLoading } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // --- הסטייט החדש שמנהל את הטאבים ---
    const [activeTab, setActiveTab] = useState('overview'); // overview | review | leaderboard
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        const resultsRef = ref(db, `user_results/${user.uid}`);
        return onValue(resultsRef, (snap) => {
            const data = snap.val();
            if (data) {
                const arr = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
                setResults(arr);
            } else {
                setResults([]);
            }
            setLoading(false);
        });
    }, [user]);

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">טוען את הממלכה שלך... ✨</div>;

    // --- לוגיקת חישוב ממוצעים לפי קורס ---
    const courseStats = results.reduce((acc, res) => {
        if (!acc[res.courseName]) acc[res.courseName] = { sum: 0, count: 0 };
        acc[res.courseName].sum += res.score;
        acc[res.courseName].count += 1;
        return acc;
    }, {});

    const courseAverages = Object.entries(courseStats).map(([name, stats]) => ({
        name,
        avg: Math.round(stats.sum / stats.count)
    }));

    // --- תפריט הטאבים שלנו ---
    const TabButton = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-[20px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === id 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100/50' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
            }`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="max-w-2xl mx-auto px-2 animate-fade-in pb-20" dir="rtl">
            
            {/* Header */}
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 mb-6 mt-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-xl mb-4 mx-auto border-4 border-white">
                    {user.displayName?.charAt(0)}
                </div>
                <h2 className="text-2xl font-black text-slate-800">היי, {user.displayName?.split(' ')[0]}</h2>
                <p className="text-slate-400 font-bold text-xs">סטודנט במקצועות הבריאות</p>
            </div>

            {/* Navigation Tabs - שורת הניווט החדשה */}
            <div className="flex bg-slate-100 p-1.5 rounded-[24px] mb-8 mx-1">
                <TabButton id="overview" icon="📊" label="סקירה" />
                <TabButton id="review" icon="🚩" label="חזרה" />
                <TabButton id="leaderboard" icon="🏆" label="דירוג" />
            </div>

            {/* =========================================
                TAB: סקירה כללית (Overview) 
               ========================================= */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in-quick">
                    {/* ממוצעים לפי קורסים */}
                    <h3 className="text-lg font-black text-slate-800 mb-4 px-2">ביצועים לפי קורס</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {courseAverages.length === 0 ? (
                            <div className="text-slate-300 text-sm italic px-2">עדיין אין מספיק נתונים לחלוקה...</div>
                        ) : (
                            courseAverages.map((course, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm min-w-[140px] flex flex-col items-center shrink-0">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1 truncate w-full text-center">{course.name}</div>
                                    <div className={`text-2xl font-black ${course.avg >= 60 ? 'text-blue-600' : 'text-red-500'}`}>{course.avg}</div>
                                    <div className="w-8 h-1 bg-slate-100 rounded-full mt-2">
                                        <div 
                                            className={`h-full rounded-full ${course.avg >= 60 ? 'bg-blue-500' : 'bg-red-500'}`} 
                                            style={{ width: `${course.avg}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* היסטוריית פעילות */}
                    <div className="mt-6">
                        <h3 className="text-lg font-black text-slate-800 mb-4 px-2">מבחנים אחרונים</h3>
                        <div className="space-y-3">
                            {results.length === 0 && (
                                <div className="text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                                    עדיין אין כאן מבחנים. יאללה לתרגל!
                                </div>
                            )}
                            {results.map((res, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => navigate(`/exam/${res.examId}/test`)} 
                                    className="group bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${res.score >= 60 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {res.score}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm">{res.examName}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{res.courseName} • {new Date(res.date).toLocaleDateString('he-IL')}</span>
                                        </div>
                                    </div>
                                    <div className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================
                TAB: לחיזרה (Review Placeholder) 
               ========================================= */}
            {activeTab === 'review' && (
                <div className="animate-fade-in-quick text-center py-16">
                    <div className="text-6xl mb-4 opacity-50">🚩</div>
                    <h3 className="text-xl font-black text-slate-700 mb-2">מרכז החזרה שלך</h3>
                    <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto mb-6">
                        בקרוב נוסיף לכאן את כל השאלות שסימנת בדגל ואת כל השאלות שטעית בהן, כדי שתוכל/י לרענן את הזיכרון בקלות לפני המבחן.
                    </p>
                    <button className="bg-slate-100 text-slate-400 px-6 py-2 rounded-xl font-bold cursor-not-allowed">בבנייה 🚧</button>
                </div>
            )}

            {/* =========================================
                TAB: דירוג מובילים (Leaderboard Placeholder) 
               ========================================= */}
            {activeTab === 'leaderboard' && (
                <div className="animate-fade-in-quick text-center py-16">
                    <div className="text-6xl mb-4 opacity-50">🏆</div>
                    <h3 className="text-xl font-black text-slate-700 mb-2">הטובים ביותר</h3>
                    <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto mb-6">
                        כאן תופיע טבלת המובילים בקורסים השונים. תתרגל, תשתפר, ותכבוש את המקום הראשון!
                    </p>
                    <button className="bg-slate-100 text-slate-400 px-6 py-2 rounded-xl font-bold cursor-not-allowed">בבנייה 🚧</button>
                </div>
            )}

        </div>
    );
}