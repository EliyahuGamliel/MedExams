import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { ref, get } from "firebase/database"; 

export default function UserProfile() {
    const { user, userData, loading: authLoading } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState('overview'); 
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchResults = async () => {
            const cacheKey = `cache_results_${user.uid}`;
            const cachedData = sessionStorage.getItem(cacheKey);

            if (cachedData) {
                setResults(JSON.parse(cachedData));
                setLoading(false);
            }

            try {
                const resultsRef = ref(db, `user_results/${user.uid}`);
                const snap = await get(resultsRef);
                const data = snap.val();
                
                let freshResults = [];
                if (data) {
                    freshResults = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                
                setResults(freshResults);
                sessionStorage.setItem(cacheKey, JSON.stringify(freshResults));
            } catch (error) {
                console.error("Error fetching user results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [user]);

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 transition-colors">טוען את הממלכה שלך... ✨</div>;

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

    const TabButton = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-[20px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === id 
                ? 'bg-white dark:bg-dark-border text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100/50 dark:border-slate-600/50' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
        >
            <span>{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="max-w-2xl mx-auto px-2 animate-fade-in pb-20 text-right" dir="rtl">
            
            {/* כרטיס פרופיל עליון מותאם ללילה */}
            <div className="bg-white dark:bg-dark-panel rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-700/80 mb-6 mt-4 text-center relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                <div className="w-20 h-20 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-3xl font-black shadow-xl mb-4 mx-auto border-4 border-white dark:border-slate-800 transition-colors">
                    {user.displayName?.charAt(0)}
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white transition-colors">היי, {user.displayName?.split(' ')[0]}</h2>
                <p className="text-slate-400 dark:text-slate-400 font-bold text-xs transition-colors">סטודנט במקצועות הבריאות</p>
            </div>

            {/* סרגל ניווט טאבים מותאם ללילה */}
            <div className="flex bg-slate-100 dark:bg-dark-panel/60 p-1.5 rounded-[24px] mb-8 mx-1 border border-transparent dark:border-slate-700/50 transition-colors">
                <TabButton id="overview" icon="📊" label="סקירה" />
                <TabButton id="review" icon="🚩" label="חזרה" />
                <TabButton id="leaderboard" icon="🏆" label="דירוג" />
            </div>

            {/* תוכן טאב סקירה (Overview) */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in-quick">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4 px-2 transition-colors">ביצועים לפי קורס</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {courseAverages.length === 0 ? (
                            <div className="text-slate-300 dark:text-slate-500 text-sm italic px-2 transition-colors">עדיין אין מספיק נתונים לחלוקה...</div>
                        ) : (
                            courseAverages.map((course, idx) => (
                                <div key={idx} className="bg-white dark:bg-dark-panel p-4 rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-sm min-w-[140px] flex flex-col items-center shrink-0 transition-colors duration-300">
                                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1 truncate w-full text-center transition-colors">{course.name}</div>
                                    <div className={`text-2xl font-black transition-colors ${course.avg >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{course.avg}</div>
                                    <div className="w-8 h-1 bg-slate-100 dark:bg-dark-border rounded-full mt-2 transition-colors">
                                        <div 
                                            className={`h-full rounded-full ${course.avg >= 60 ? 'bg-blue-500 dark:bg-blue-400' : 'bg-red-500'}`} 
                                            style={{ width: `${course.avg}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* מבחנים אחרונים */}
                    <div className="mt-6">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4 px-2 transition-colors">מבחנים אחרונים</h3>
                        <div className="space-y-3">
                            {results.length === 0 && (
                                <div className="text-center p-8 bg-slate-50 dark:bg-dark-panel/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold transition-colors">
                                    עדיין אין כאן מבחנים. יאללה לתרגל!
                                </div>
                            )}
                            {results.map((res, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => navigate(`/exam/${res.examId}/test`)} 
                                    className="group bg-white dark:bg-dark-panel p-5 rounded-[28px] border border-slate-100 dark:border-slate-700/80 shadow-sm flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-pointer duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${res.score >= 60 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'}`}>
                                            {res.score}
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="font-black text-slate-800 dark:text-slate-200 text-sm transition-colors">{res.examName}</span>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 transition-colors">{res.courseName} • {new Date(res.date).toLocaleDateString('he-IL')}</span>
                                        </div>
                                    </div>
                                    <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* תוכן טאב חזרה (Review) */}
            {activeTab === 'review' && (
                <div className="animate-fade-in-quick text-center py-16">
                    <div className="text-6xl mb-4 opacity-50">🚩</div>
                    <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2 transition-colors">מרכז החזרה שלך</h3>
                    <p className="text-slate-400 dark:text-slate-400 font-bold text-sm max-w-xs mx-auto mb-6 transition-colors">
                        בקרוב נוסיף לכאן את כל השאלות שסימנת בדגל ואת כל השאלות שטעית בהן, כדי שתוכל/י לרענן את הזיכרון בקלות לפני המבחן.
                    </p>
                    <button className="bg-slate-100 dark:bg-dark-panel text-slate-400 dark:text-slate-500 px-6 py-2 rounded-xl font-bold cursor-not-allowed transition-colors">בבנייה 🚧</button>
                </div>
            )}

            {/* תוכן טאב דירוג (Leaderboard) */}
            {activeTab === 'leaderboard' && (
                <div className="animate-fade-in-quick text-center py-16">
                    <div className="text-6xl mb-4 opacity-50">🏆</div>
                    <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2 transition-colors">הטובים ביותר</h3>
                    <p className="text-slate-400 dark:text-slate-400 font-bold text-sm max-w-xs mx-auto mb-6 transition-colors">
                        כאן תופיע טבלת המובילים בקורסים השונים. תתרגל, תשתפר, ותכבוש את המקום הראשון!
                    </p>
                    <button className="bg-slate-100 dark:bg-dark-panel text-slate-400 dark:text-slate-500 px-6 py-2 rounded-xl font-bold cursor-not-allowed transition-colors">בבנייה 🚧</button>
                </div>
            )}

        </div>
    );
}