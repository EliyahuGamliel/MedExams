import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { ref, onValue, update } from "firebase/database"; 
import toast from 'react-hot-toast';

// קומפוננטת אייקון הגדרות
const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

export default function UserProfile({ examsList }) {
    const { user, loading: authLoading } = useAuth();
    const [completedExams, setCompletedExams] = useState({});
    const timeoutRef = useRef(null);

    // הגדרות ברירת מחדל חכמות ומורחבות
    const [userSettings, setUserSettings] = useState({
        timerStrategy: 'stopwatch',   // 'none' | 'stopwatch' | 'manual'
        testReviewMode: 'all',        // 'all' | 'mistakes_only' | 'correct_only'
        practiceShowAppeals: true,    // הצגת ערעורים בתרגול
        fontSize: 'normal',           // 'normal' | 'large' | 'xlarge'
        autoScroll: false,            // מעבר אוטומטי לשאלה הבאה בתרגול
        blankWarning: true,           // התראה על שאלות ריקות לפני הגשה
    });
    
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); 
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribeUser = onValue(userRef, (snap) => {
            if (snap.exists() && snap.val().settings) {
                setUserSettings(prev => ({ ...prev, ...snap.val().settings }));
            }
        });

        const completedRef = ref(db, `user_completed_exams/${user.uid}`);
        const unsubscribeCompleted = onValue(completedRef, (snap) => {
            if (snap.exists()) setCompletedExams(snap.val());
            else setCompletedExams({});
            setLoading(false);
        });

        return () => {
            unsubscribeUser();
            unsubscribeCompleted();
        };
    }, [user]);

    const handleUpdateSetting = async (settingKey, newValue) => {
        if (newValue === undefined) return;
        
        setUserSettings(prev => ({ ...prev, [settingKey]: newValue })); 
        
        try {
            await update(ref(db, `users/${user.uid}/settings`), {
                [settingKey]: newValue
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                toast.success("ההגדרות נשמרו בהצלחה", { id: 'settings_toast' });
            }, 400);
        } catch (error) {
            toast.error("שגיאה בסנכרון ההגדרות");
        }
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 transition-colors">טוען את האזור האישי... ✨</div>;

    const progressByYear = {};
    let hasAnyActiveCourses = false;

    if (examsList) {
        examsList.forEach(exam => {
            const year = exam.studentYear || "שונות";
            const course = exam.course;

            if (!progressByYear[year]) {
                progressByYear[year] = {};
            }
            if (!progressByYear[year][course]) {
                progressByYear[year][course] = { total: 0, completed: 0 };
            }
            
            progressByYear[year][course].total += 1;
            
            if (completedExams[exam.id]) {
                progressByYear[year][course].completed += 1;
                hasAnyActiveCourses = true;
            }
        });
    }

    const sortedYears = Object.keys(progressByYear).sort((a, b) => b.localeCompare(a));

    const TabButton = ({ id, icon, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 text-sm font-bold rounded-[20px] transition-all flex items-center justify-center gap-2 ${
                activeTab === id 
                ? 'bg-white dark:bg-dark-border text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100/50 dark:border-slate-600/50' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/30'
            }`}
        >
            <span className="text-lg">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    const ToggleSwitch = ({ label, description, isOn, onToggle }) => (
        <div 
            onClick={onToggle}
            className="group flex items-center justify-between p-5 bg-white dark:bg-dark-panel rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-sm hover:border-blue-200 dark:hover:border-slate-600 hover:shadow-md transition-all cursor-pointer select-none"
        >
            <div className="text-right pl-4">
                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">{description}</div>
            </div>
            
            <div className="relative shrink-0 w-14 h-8 rounded-full transition-colors duration-300 ease-in-out" style={{ backgroundColor: isOn ? '#3b82f6' : 'var(--toggle-bg, #cbd5e1)' }}>
                <div className={`absolute top-1 bg-white w-6 h-6 rounded-full shadow-sm flex items-center justify-center transform transition-transform duration-300 ease-in-out ${isOn ? 'left-1' : 'right-1'}`}>
                    {isOn && <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 animate-fade-in pb-20 text-right" dir="rtl">
            
            {/* כרטיס פרופיל עליון */}
            <div className="bg-white dark:bg-dark-panel rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-700/80 mb-6 mt-4 text-center relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                <div className="w-20 h-20 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-3xl font-black shadow-xl mb-4 mx-auto border-4 border-white dark:border-slate-800 transition-colors">
                    {user.displayName?.charAt(0) || "א"}
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white transition-colors">היי, {user.displayName?.split(' ')[0] || "סטודנט"}</h2>
                <p className="text-slate-400 dark:text-slate-400 font-bold text-xs transition-colors">האזור האישי שלך ללמידה נכונה</p>
            </div>

            {/* סרגל ניווט טאבים */}
            <div className="flex bg-slate-100 dark:bg-dark-panel/60 p-1.5 rounded-[24px] mb-8 border border-transparent dark:border-slate-700/50 transition-colors">
                <TabButton id="overview" icon="📊" label="התקדמות" />
                <TabButton id="review" icon="🚩" label="חזרה ודגלים" />
                <TabButton id="settings" icon={<SettingsIcon />} label="הגדרות" />
            </div>

            {/* -------------------- טאב התקדמות לפי שנים -------------------- */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in-quick">
                    {!hasAnyActiveCourses ? (
                        <div className="text-center p-8 bg-slate-50 dark:bg-dark-panel/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold transition-colors">
                            עדיין לא סימנת מבחנים שסיימת... בחר קורס והתחל לתרגל!
                        </div>
                    ) : (
                        sortedYears.map(year => {
                            const coursesInYear = Object.entries(progressByYear[year])
                                .filter(([_, data]) => data.completed > 0)
                                .sort((a, b) => b[1].completed - a[1].completed);

                            if (coursesInYear.length === 0) return null;

                            return (
                                <div key={year} className="mb-10">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4 px-2 border-b-2 border-slate-100 dark:border-slate-800 pb-2 transition-colors">
                                        {year}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {coursesInYear.map(([courseName, data], idx) => {
                                            const percentage = Math.round((data.completed / data.total) * 100) || 0;
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => navigate(`/course/${courseName}`)} 
                                                    className="group bg-white dark:bg-dark-panel p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all"
                                                >
                                                    <div className="flex justify-between items-end mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{courseName}</h4>
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 transition-colors">סיימת {data.completed} מתוך {data.total} מבחנים</p>
                                                        </div>
                                                        <span className={`text-xl font-black ${percentage === 100 ? 'text-green-500' : 'text-blue-500'}`}>
                                                            {percentage}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden transition-colors">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage === 100 ? 'bg-gradient-to-l from-green-400 to-emerald-500' : 'bg-gradient-to-l from-blue-400 to-indigo-500'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* -------------------- טאב חזרה (Review) -------------------- */}
            {activeTab === 'review' && (
                <div className="animate-fade-in-quick text-center py-16">
                    <div className="text-6xl mb-4 opacity-50">🚩</div>
                    <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2 transition-colors">מרכז החזרה שלך</h3>
                    <p className="text-slate-400 dark:text-slate-400 font-bold text-sm max-w-xs mx-auto mb-6 transition-colors">
                        כאן ירוכזו כל השאלות שטעית בהן במצב תרגול והשאלות שסימנת בדגלון. (בקרוב)
                    </p>
                </div>
            )}

            {/* -------------------- טאב הגדרות אישיות -------------------- */}
            {activeTab === 'settings' && (
                <div className="animate-fade-in-quick space-y-6">
                    
                    {/* 1. הגדרות מעקב זמן */}
                    <div className="bg-white dark:bg-dark-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">⏱️</span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">ניהול זמן במצב מבחן</h3>
                        </div>
                        
                        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            {[
                                { id: 'none', label: 'ללא שעון' },
                                { id: 'stopwatch', label: 'סטופר' },
                                { id: 'manual', label: 'הזנה ידנית' }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleUpdateSetting('timerStrategy', opt.id)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                                        userSettings.timerStrategy === opt.id 
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-600' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-3 text-center transition-colors">
                            {userSettings.timerStrategy === 'none' && 'לא יוצג זמן על המסך במהלך הסימולציה.'}
                            {userSettings.timerStrategy === 'stopwatch' && 'השעון יספור קדימה וימדוד כמה זמן לקח לך בסך הכל.'}
                            {userSettings.timerStrategy === 'manual' && 'בתחילת כל מבחן, תקפוץ חלונית לבחירת דקות ספירה לאחור.'}
                        </p>
                    </div>

                    {/* 2. גודל גופן בשאלות (כולל תצוגה מקדימה חיה) */}
                    <div className="bg-white dark:bg-dark-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🔎</span>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">גודל גופן בשאלות</h3>
                            </div>
                            
                            {/* --- תצוגה מקדימה חיה (Live Preview) --- */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-center min-w-[100px] h-12 shadow-inner overflow-hidden">
                                <span className={`font-black text-blue-600 dark:text-blue-400 transition-all duration-300 ease-in-out ${
                                    userSettings.fontSize === 'xlarge' ? 'text-3xl' : 
                                    userSettings.fontSize === 'large' ? 'text-2xl' : 
                                    'text-xl'
                                }`}>
                                    Aa אא
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            {[
                                { id: 'normal', label: 'גופן רגיל' },
                                { id: 'large', label: 'גופן גדול' },
                                { id: 'xlarge', label: 'גופן ע״ש ונדר' }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleUpdateSetting('fontSize', opt.id)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                                        userSettings.fontSize === opt.id 
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/50 dark:border-slate-600' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-3 text-center transition-colors">
                            התאמת גודל קריאת השאלות ותיאורי המקרים הרפואיים לנוחות מרבית בטלפון ובמחשב.
                        </p>
                    </div>

                    {/* 3. אסטרטגיית תחקור */}
                    <div className="bg-white dark:bg-dark-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-700/80 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">🔍</span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">תחקור בסיום מבחן</h3>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
                            קבע כיצד יוצגו השאלות מיד לאחר הגשת המבחן במטרה לאפשר לך למידה ותחקור אפקטיביים:
                        </p>
                        
                        <div className="flex flex-col gap-2.5">
                            {[
                                { id: 'all', title: 'תצוגה מלאה ורגילה', subtitle: 'הצגת כל השאלות בטופס, כולל כל המסיחים שסומנו והתשובות המקוריות' },
                                { id: 'mistakes_only', title: 'התמקדות בטעויות בלבד', subtitle: 'מסנן את הטופס ומציג לך בסיום רק את השאלות שבהן סימנת תשובה שגויה' },
                                { id: 'correct_only', title: 'למידה חלקה (ללא מסיחים שגויים)', subtitle: 'מציג רק את השאלות ואת התשובות הנכונות שלהן לצידן (כולל הצגת מסיחי ערעורים מאושרים)' }
                            ].map(opt => (
                                <label 
                                    key={opt.id} 
                                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                                        userSettings.testReviewMode === opt.id 
                                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' 
                                        : 'border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                                    }`}
                                >
                                    <div className="mt-0.5 relative shrink-0">
                                        <input 
                                            type="radio" 
                                            name="testReviewMode" 
                                            value={opt.id} 
                                            checked={userSettings.testReviewMode === opt.id} 
                                            onChange={() => handleUpdateSetting('testReviewMode', opt.id)} 
                                            className="opacity-0 absolute"
                                        />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${userSettings.testReviewMode === opt.id ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {userSettings.testReviewMode === opt.id && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-sm ${userSettings.testReviewMode === opt.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {opt.title}
                                        </div>
                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{opt.subtitle}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 4. מתגי הפעלה מבוססי Toggles */}
                    <ToggleSwitch 
                        label="הצגת מסיחי ערעורים במצב תרגול" 
                        description="במצב תרגול, ברגע סימון תשובה נכונה, המערכת תציג במקביל גם את התשובות הנוספות שהתקבלו במסגרת ערעורים." 
                        isOn={userSettings.practiceShowAppeals} 
                        onToggle={() => handleUpdateSetting('practiceShowAppeals', !userSettings.practiceShowAppeals)} 
                    />

                    <ToggleSwitch 
                        label="מצב זרימה (גלילה אוטומטית)" 
                        description="במצב תרגול, ברגע סימון מענה נכון - המערכת תבצע גלילה חלקה ואוטומטית ישירות לשאלה הבאה לאחר שנייה אחת." 
                        isOn={userSettings.autoScroll} 
                        onToggle={() => handleUpdateSetting('autoScroll', !userSettings.autoScroll)} 
                    />

                    <ToggleSwitch 
                        label="הגנת שאלות ריקות לפני הגשה" 
                        description="במצב מבחן, במידה ותלחץ/י על 'הגש מבחן' ונותרו שאלות ריקות ללא מענה, המערכת תחסום את ההגשה ותתריע על כך." 
                        isOn={userSettings.blankWarning} 
                        onToggle={() => handleUpdateSetting('blankWarning', !userSettings.blankWarning)} 
                    />

                </div>
            )}

        </div>
    );
}