import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase';
import { ref, get } from "firebase/database";
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const ChevronLeft = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;

export default function AnkiHub() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [deckTree, setDeckTree] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedDecks, setExpandedDecks] = useState({}); 

    useEffect(() => {
        if (!user) return;

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // 1. שאיבת הקורסים ויצירת מילון (שם קורס -> שנה) לטובת סידור בתיקיות
                const coursesSnap = await get(ref(db, 'courses'));
                const coursesData = coursesSnap.exists() ? coursesSnap.val() : {};
                
                const courseToYear = {};
                Object.keys(coursesData).forEach(year => {
                    Object.keys(coursesData[year]).forEach(sem => {
                        Object.values(coursesData[year][sem]).forEach(courseObj => {
                            if (courseObj && courseObj.name) {
                                courseToYear[courseObj.name.trim()] = year; 
                            }
                        });
                    });
                });

                // 2. משיכת הכרטיסיות האישיות שהסטודנט שמר באמצעות דגלים
                const personalCardsSnap = await get(ref(db, `user_personal_flashcards/${user.uid}`));
                const personalCourses = personalCardsSnap.exists() ? personalCardsSnap.val() : {};

                // 3. משיכת ההתקדמות של האלגוריתם (מתי הוא צריך לחזור על כל שאלה)
                const progressSnap = await get(ref(db, `user_flashcards_progress/${user.uid}`));
                const allProgress = progressSnap.exists() ? progressSnap.val() : {};

                const now = Date.now();
                const tree = {};

                const addCardToTree = (pathArr, status, courseId) => {
                    let currentLevel = tree;
                    let currentPath = "";

                    pathArr.forEach((node, index) => {
                        currentPath = currentPath === "" ? node : `${currentPath}::${node}`;
                        
                        if (!currentLevel[node]) {
                            currentLevel[node] = {
                                name: node,
                                fullPath: currentPath,
                                courseId: courseId, 
                                counts: { new: 0, learning: 0, review: 0 },
                                children: {}
                            };
                        }
                        currentLevel[node].counts[status]++;
                        currentLevel = currentLevel[node].children;
                    });
                };

                // מעבר על כל הקורסים שבהם הסטודנט שמר שאלות
                Object.keys(personalCourses).forEach(courseId => {
                    const courseCards = personalCourses[courseId];
                    const courseProgress = allProgress[courseId] || {};

                    Object.keys(courseCards).forEach(cardId => {
                        const card = courseCards[cardId];
                        if (!card.isActive) return;

                        const progress = courseProgress[cardId];
                        if (progress && progress.isSuspended) return; // השאלות המוקפאות

                        let status = "new";
                        if (!progress || !progress.lastReviewed) status = "new"; 
                        else if (progress.interval === 0 && progress.nextReviewDate <= now) status = "learning"; 
                        else if (progress.interval > 0 && progress.nextReviewDate <= now) status = "review"; 
                        else return; // שאלה שעוד לא הגיע הזמן לחזור עליה - נסתרת כרגע

                        const cleanCourseId = courseId.trim();
                        const year = courseToYear[cleanCourseId] || "כללי"; 
                        
                        // העץ בנוי פשוט מ: שנה -> שם הקורס
                        const cleanPathArr = [year, cleanCourseId];

                        addCardToTree(cleanPathArr, status, cleanCourseId);
                    });
                });

                setDeckTree(tree);
                
                // פותח את כל התיקיות כברירת מחדל
                const initialExpanded = {};
                Object.keys(tree).forEach(key => initialExpanded[tree[key].fullPath] = true);
                setExpandedDecks(initialExpanded);

            } catch (error) {
                console.error("Error building Anki tree:", error);
                toast.error("שגיאה בטעינת החזרות");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user]);

    const toggleDeck = (e, fullPath) => {
        e.stopPropagation();
        setExpandedDecks(prev => ({ ...prev, [fullPath]: !prev[fullPath] }));
    };

    const startStudy = (courseId, depth) => {
        // לא מאפשר להתחיל לימוד מלחיצה על תיקיית ה"שנה"
        if (depth === 0) return;
        navigate(`/course/${courseId}/flashcards`);
    };

    const renderTree = (nodes, depth = 0) => {
        const sortedKeys = Object.keys(nodes).sort((a, b) => {
            if (a.includes("שנה") && b.includes("שנה")) return a.localeCompare(b, 'he');
            return a.localeCompare(b, 'he');
        });

        return sortedKeys.map(key => {
            const node = nodes[key];
            const hasChildren = Object.keys(node.children).length > 0;
            const isExpanded = expandedDecks[node.fullPath];

            return (
                <div key={node.fullPath}>
                    <div 
                        onClick={(e) => depth === 0 ? toggleDeck(e, node.fullPath) : startStudy(node.courseId, depth)}
                        className={`flex items-center justify-between py-2.5 px-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${depth === 0 ? 'bg-slate-100/50 dark:bg-slate-800/30 font-black text-lg mt-2' : ''}`}
                        style={{ paddingRight: `${(depth * 1.5) + 1}rem` }} 
                    >
                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button onClick={(e) => toggleDeck(e, node.fullPath)} className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
                                    {isExpanded ? <ChevronDown /> : <ChevronLeft />}
                                </button>
                            ) : ( <span className="w-6"></span> )}
                            <span className={depth === 0 ? "text-blue-800 dark:text-blue-300" : "text-slate-700 dark:text-slate-200 font-bold"}>{node.name}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-black font-mono" dir="ltr">
                            <span className={node.counts.new > 0 ? "text-blue-500" : "text-slate-300 dark:text-slate-600 font-normal"}>{node.counts.new}</span>
                            <span className={node.counts.learning > 0 ? "text-red-500" : "text-slate-300 dark:text-slate-600 font-normal"}>{node.counts.learning}</span>
                            <span className={node.counts.review > 0 ? "text-green-500" : "text-slate-300 dark:text-slate-600 font-normal"}>{node.counts.review}</span>
                        </div>
                    </div>

                    {hasChildren && isExpanded && (
                        <div className="bg-slate-50/10 dark:bg-dark-bg/10">
                            {renderTree(node.children, depth + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">טוען את המאגר שלך... 📂</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-20 animate-fade-in text-right" dir="rtl">
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-1">השאלות ששמרתי</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">החזרות היומיות שלך מתוך המבחנים שתרגלת</p>
                </div>
                <div className="text-5xl drop-shadow-sm">🚩</div>
            </div>

            <div className="flex items-center justify-between px-3 pb-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                <span>קורס</span>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider" dir="ltr" title="חדשות | בלמידה | לחזרה">
                    <span className="w-4 text-center text-blue-500">New</span>
                    <span className="w-4 text-center text-red-500">Lrn</span>
                    <span className="w-4 text-center text-green-500">Rev</span>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-panel rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {deckTree && Object.keys(deckTree).length > 0 ? renderTree(deckTree) : (
                    <div className="p-10 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-dark-bg/50">
                        <div className="text-6xl mb-4 opacity-80">📭</div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">אין לך חזרות להיום!</h3>
                        <p className="text-sm mb-6 leading-relaxed">
                            מרכז החזרות שלך ריק. <br/>
                            כדי לבנות לך מאגר למידה חכם, כנס למבחנים, וסמן בדגל (🚩) כל שאלה שחשוב לך לזכור. השאלות יחכו לך כאן!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}