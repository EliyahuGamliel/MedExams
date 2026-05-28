import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { ref, onValue, update, remove } from "firebase/database"; 
import toast from 'react-hot-toast';

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const ChevronDownIcon = ({ open }) => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>;

export default function UserProfile({ examsList }) {
    const { user, loading: authLoading } = useAuth();
    const [completedExams, setCompletedExams] = useState({});
    const [flaggedQuestions, setFlaggedQuestions] = useState([]);
    const timeoutRef = useRef(null);

    const [userSettings, setUserSettings] = useState({
        timerStrategy: 'stopwatch',   
        testReviewMode: 'all',        
        practiceShowAppeals: true,    
        fontSize: 'normal',           
        autoScroll: false,            
        blankWarning: true,           
        simulationSource: 'all' 
    });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('review'); 
    const [expandedCourse, setExpandedCourse] = useState(null); 
    
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
        });

        const flaggedRef = ref(db, `user_personal_flashcards/${user.uid}`);
        const unsubscribeFlagged = onValue(flaggedRef, (snap) => {
            if (snap.exists()) {
                const coursesData = snap.val();
                let allQuestions = [];
                Object.entries(coursesData).forEach(([courseId, cards]) => {
                    Object.entries(cards).forEach(([cardId, cardData]) => {
                        allQuestions.push({ id: cardId, courseId: courseId, ...cardData });
                    });
                });
                setFlaggedQuestions(allQuestions);
            } else {
                setFlaggedQuestions([]);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeUser();
            unsubscribeCompleted();
            unsubscribeFlagged();
        };
    }, [user]);

    const handleUpdateSetting = async (settingKey, newValue) => {
        if (newValue === undefined) return;
        setUserSettings(prev => ({ ...prev, [settingKey]: newValue })); 
        try {
            await update(ref(db, `users/${user.uid}/settings`), { [settingKey]: newValue });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                toast.success("ההגדרות נשמרו", { id: 'settings_toast' });
            }, 400);
        } catch (error) {
            toast.error("שגיאה בסנכרון");
        }
    };

    const handleDeleteFlag = async (courseId, cardId) => {
        try {
            await remove(ref(db, `user_personal_flashcards/${user.uid}/${courseId}/${cardId}`));
            toast.success("השאלה הוסרה בהצלחה");
            const remaining = flaggedQuestions.filter(q => q.courseId === courseId && q.id !== cardId);
            if (remaining.length === 0 && expandedCourse === courseId) {
                setExpandedCourse(null);
            }
        } catch(e) {
            toast.error("שגיאה במחיקת השאלה");
        }
    };

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">טוען את האזור האישי... ✨</div>;

    const progressByYear = {};
    const courseInfo = {}; 
    let hasAnyActiveCourses = false;

    if (examsList) {
        examsList.forEach(exam => {
            const year = exam.studentYear || "שונות";
            const course = exam.course;
            if (!courseInfo[course]) courseInfo[course] = year;

            if (!progressByYear[year]) progressByYear[year] = {};
            if (!progressByYear[year][course]) progressByYear[year][course] = { total: 0, completed: 0 };
            
            progressByYear[year][course].total += 1;
            if (completedExams[exam.id]) {
                progressByYear[year][course].completed += 1;
                hasAnyActiveCourses = true;
            }
        });
    }

    const sortedYears = Object.keys(progressByYear).sort((a, b) => b.localeCompare(a));

    const groupedDecks = flaggedQuestions.reduce((acc, q) => {
        const course = q.courseId || "קורס כללי";
        const exam = q.sourceExam || "מבחן לא ידוע";
        const year = courseInfo[course] || "שונות";
        
        if (!acc[course]) acc[course] = { year, total: 0, exams: {} };
        if (!acc[course].exams[exam]) acc[course].exams[exam] = [];
        
        acc[course].exams[exam].push(q);
        acc[course].total += 1;
        return acc;
    }, {});

    const TabButton = ({ id, icon, label }) => (
        <button onClick={() => setActiveTab(id)} className={`flex-1 py-3 text-sm font-bold rounded-[20px] transition-all flex items-center justify-center gap-2 ${activeTab === id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100/50' : 'text-slate-400 hover:bg-slate-200/50'}`}>
            <span className="text-lg">{icon}</span><span className="hidden sm:inline">{label}</span>
        </button>
    );

    const ToggleSwitch = ({ label, description, isOn, onToggle }) => (
        <div onClick={onToggle} className={`group flex items-center justify-between p-5 bg-white rounded-3xl border ${isOn ? 'border-indigo-200' : 'border-slate-100'} shadow-sm cursor-pointer`}>
            <div className="text-right pl-4">
                <div className={`font-bold ${isOn ? 'text-indigo-700' : 'text-slate-800'}`}>{label}</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</div>
            </div>
            <div className={`w-14 h-8 rounded-full transition-colors ${isOn ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`w-6 h-6 m-1 bg-white rounded-full shadow-sm transition-transform ${isOn ? 'translate-x-6' : ''}`}></div>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-4 pb-20 text-right animate-fade-in" dir="rtl">
            
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 mb-6 mt-4 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
                <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-black mb-4 mx-auto shadow-lg">{user.displayName?.charAt(0) || "א"}</div>
                <h2 className="text-2xl font-black text-slate-800">היי, {user.displayName?.split(' ')[0] || "סטודנט"}</h2>
                <p className="text-slate-400 font-bold text-xs mt-1">האזור האישי שלך ללמידה נכונה</p>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-[24px] mb-8">
                <TabButton id="review" icon="🧠" label="מרכז החזרות (Anki)" />
                <TabButton id="overview" icon="📊" label="התקדמות" />
                <TabButton id="settings" icon={<SettingsIcon />} label="הגדרות" />
            </div>

            {/* ==================== טאב מרכז חזרות ==================== */}
            {activeTab === 'review' && (
                <div className="animate-fade-in-quick space-y-6">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black text-slate-800 mb-2">מאגר הכרטיסיות שלך</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                            כל השאלות שסימנת בדגלון נשמרות כאן כחפיסות תרגול (Anki). 
                            תרגל אותן באופן שוטף כדי לשמר את החומר בזיכרון.
                        </p>
                    </div>

                    {Object.keys(groupedDecks).length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                            <span className="text-6xl block mb-4">📭</span>
                            <p className="font-bold text-slate-700 text-lg">אין לך חפיסות פעילות כרגע.</p>
                            <p className="text-sm text-slate-400 mt-2">בזמן מבחן או תרגול, לחץ על הדגלון ליד שאלה קשה והיא תתווסף לכאן אוטומטית.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {Object.entries(groupedDecks).map(([courseName, data]) => {
                                const isExpanded = expandedCourse === courseName;

                                return (
                                    <div key={courseName} className={`bg-white border transition-all duration-300 rounded-[28px] overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-md md:col-span-2' : 'border-slate-100 shadow-sm hover:border-indigo-200'}`}>
                                        
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md mb-2">{data.year}</span>
                                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{courseName}</h3>
                                                </div>
                                                <div className="text-center bg-indigo-50 text-indigo-700 w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-xl font-black block leading-none">{data.total}</span>
                                                    <span className="text-[9px] font-bold mt-1">שאלות</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-6">
                                                <button 
                                                    onClick={() => navigate(`/course/${encodeURIComponent(courseName)}/flashcards`)}
                                                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                                                >
                                                    <PlayIcon /> תרגל חפיסה
                                                </button>
                                                <button 
                                                    onClick={() => setExpandedCourse(isExpanded ? null : courseName)}
                                                    className={`w-12 flex items-center justify-center rounded-xl border transition-colors ${isExpanded ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    <ChevronDownIcon open={isExpanded} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} bg-slate-50 border-t border-slate-100 overflow-y-auto`}>
                                            <div className="p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-slate-700 text-sm">ניהול מאגר שאלות ({courseName})</h4>
                                                </div>
                                                
                                                <div className="space-y-5">
                                                    {Object.entries(data.exams).map(([examName, questions]) => (
                                                        <div key={examName}>
                                                            <div className="text-xs font-bold text-slate-400 mb-2">{examName}</div>
                                                            <div className="space-y-2">
                                                                {questions.map((q) => (
                                                                    <div key={q.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm hover:border-red-200 group transition-colors">
                                                                        <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed flex-1">
                                                                            {q?.originalQuestion?.text || q?.text || "שאלה מבוססת תמונה (ללא טקסט)"}
                                                                        </p>
                                                                        <button 
                                                                            onClick={() => handleDeleteFlag(courseName, q.id)} 
                                                                            className="text-slate-300 hover:text-red-500 bg-slate-50 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                                                                            title="מחק מהחפיסה"
                                                                        >
                                                                            <TrashIcon />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== טאב התקדמות ==================== */}
            {activeTab === 'overview' && (
                <div className="animate-fade-in-quick">
                    {!hasAnyActiveCourses ? (
                        <div className="text-center p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                            עדיין לא סימנת מבחנים שסיימת... 
                        </div>
                    ) : (
                        sortedYears.map(year => {
                            const coursesInYear = Object.entries(progressByYear[year])
                                .filter(([_, data]) => data.completed > 0)
                                .sort((a, b) => b[1].completed - a[1].completed);

                            if (coursesInYear.length === 0) return null;

                            return (
                                <div key={year} className="mb-10">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 px-2 border-b-2 border-slate-100 pb-2">{year}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {coursesInYear.map(([courseName, data], idx) => {
                                            const percentage = Math.round((data.completed / data.total) * 100) || 0;
                                            return (
                                                <div key={idx} onClick={() => navigate(`/course/${courseName}`)} className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-400 cursor-pointer transition-all">
                                                    <div className="flex justify-between items-end mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{courseName}</h4>
                                                            <p className="text-xs text-slate-400 mt-1">סיימת {data.completed} מתוך {data.total} מבחנים</p>
                                                        </div>
                                                        <span className={`text-xl font-black ${percentage === 100 ? 'text-green-500' : 'text-indigo-500'}`}>{percentage}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${percentage === 100 ? 'bg-gradient-to-l from-green-400 to-emerald-500' : 'bg-gradient-to-l from-indigo-400 to-purple-500'}`} style={{ width: `${percentage}%` }}></div>
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

            {/* ==================== טאב הגדרות ==================== */}
            {activeTab === 'settings' && (
                <div className="animate-fade-in-quick space-y-6">
                    
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">🎯</span>
                            <h3 className="font-bold text-slate-800">מקור השאלות בסימולציה</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                            בחר מאיזה מאגר שאלות המערכת תרכיב לך את המבחן החכם הבא:
                        </p>
                        <div className="flex flex-col gap-2.5">
                            {[
                                { id: 'all', title: 'כל השאלות בקורס', subtitle: 'הסימולציה תורכב מכל שאלות העבר הזמינות בקורס' },
                                { id: 'flagged_only', title: 'שאלות מסומנות בלבד (דגלון)', subtitle: 'הסימולציה תורכב אך ורק משאלות ששמרת והוספת לדגלון' }
                            ].map(opt => (
                                <label key={opt.id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${(userSettings.simulationSource || 'all') === opt.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <div className="mt-0.5 relative shrink-0">
                                        <input type="radio" name="simulationSource" value={opt.id} checked={(userSettings.simulationSource || 'all') === opt.id} onChange={() => handleUpdateSetting('simulationSource', opt.id)} className="opacity-0 absolute" />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${(userSettings.simulationSource || 'all') === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                                            {(userSettings.simulationSource || 'all') === opt.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-sm ${(userSettings.simulationSource || 'all') === opt.id ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.title}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{opt.subtitle}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl">⏱️</span>
                            <h3 className="font-bold text-slate-800">ניהול זמן במצב מבחן</h3>
                        </div>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                            {[
                                { id: 'none', label: 'ללא שעון' },
                                { id: 'stopwatch', label: 'סטופר' },
                                { id: 'manual', label: 'הזנה ידנית' }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleUpdateSetting('timerStrategy', opt.id)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${userSettings.timerStrategy === opt.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 mt-3 text-center">
                            {userSettings.timerStrategy === 'none' && 'לא יוצג זמן על המסך במהלך הסימולציה.'}
                            {userSettings.timerStrategy === 'stopwatch' && 'השעון יספור קדימה וימדוד כמה זמן לקח לך בסך הכל.'}
                            {userSettings.timerStrategy === 'manual' && 'בתחילת כל מבחן, תקפוץ חלונית לבחירת דקות ספירה לאחור.'}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🔎</span>
                                <h3 className="font-bold text-slate-800">גודל גופן בשאלות</h3>
                            </div>
                            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center justify-center min-w-[100px] h-12 shadow-inner">
                                <span className={`font-black text-indigo-600 transition-all duration-300 ${userSettings.fontSize === 'xlarge' ? 'text-3xl' : userSettings.fontSize === 'large' ? 'text-2xl' : 'text-xl'}`}>
                                    Aa
                                </span>
                            </div>
                        </div>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                            {[
                                { id: 'normal', label: 'רגיל' },
                                { id: 'large', label: 'גדול' },
                                { id: 'xlarge', label: 'ענק' }
                            ].map(opt => (
                                <button 
                                    key={opt.id}
                                    onClick={() => handleUpdateSetting('fontSize', opt.id)}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${userSettings.fontSize === opt.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl">🔍</span>
                            <h3 className="font-bold text-slate-800">תחקור בסיום מבחן</h3>
                        </div>
                        <div className="flex flex-col gap-2.5 mt-4">
                            {[
                                { id: 'all', title: 'תצוגה מלאה ורגילה', subtitle: 'הצגת כל השאלות בטופס, כולל מסיחים' },
                                { id: 'mistakes_only', title: 'התמקדות בטעויות', subtitle: 'מציג לך בסיום רק את השאלות שבהן טעית' },
                                { id: 'correct_only', title: 'למידה חלקה', subtitle: 'מציג רק את התשובות הנכונות לשאלות (כולל ערעורים)' }
                            ].map(opt => (
                                <label key={opt.id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${userSettings.testReviewMode === opt.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                    <div className="mt-0.5 relative shrink-0">
                                        <input type="radio" name="testReviewMode" value={opt.id} checked={userSettings.testReviewMode === opt.id} onChange={() => handleUpdateSetting('testReviewMode', opt.id)} className="opacity-0 absolute" />
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${userSettings.testReviewMode === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                                            {userSettings.testReviewMode === opt.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-sm ${userSettings.testReviewMode === opt.id ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.title}</div>
                                        <div className="text-[10px] text-slate-400 mt-1">{opt.subtitle}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <ToggleSwitch label="הצגת מסיחי ערעורים בתרגול" description="מציג את התשובות הנוספות שהתקבלו במסגרת ערעורים." isOn={userSettings.practiceShowAppeals} onToggle={() => handleUpdateSetting('practiceShowAppeals', !userSettings.practiceShowAppeals)} />
                    <ToggleSwitch label="מצב זרימה (גלילה אוטומטית)" description="מעבר אוטומטי ומהיר לשאלה הבאה לאחר סימון מענה נכון." isOn={userSettings.autoScroll} onToggle={() => handleUpdateSetting('autoScroll', !userSettings.autoScroll)} />
                    <ToggleSwitch label="הגנת שאלות ריקות במבחן" description="חסימת 'הגש מבחן' והתראה במידה ונותרו שאלות פתוחות." isOn={userSettings.blankWarning} onToggle={() => handleUpdateSetting('blankWarning', !userSettings.blankWarning)} />

                </div>
            )}

        </div>
    );
}