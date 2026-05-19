import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; 
import { ref, get, update } from 'firebase/database';
import { GoogleGenerativeAI } from "@google/generative-ai";
import toast from 'react-hot-toast';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY);
const delay = ms => new Promise(res => setTimeout(res, ms)); 

const MigrationButton = () => {
    const [isMigrating, setIsMigrating] = useState(false);
    const [progress, setProgress] = useState("");
    const [stats, setStats] = useState({ generated: 0, skipped: 0 });
    
    const [availableCourses, setAvailableCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('ALL');
    const [examsMeta, setExamsMeta] = useState({});

    const [totalNodes, setTotalNodes] = useState(1);
    const [myNodeId, setMyNodeId] = useState(1);

    // טעינה משולבת: מושכים גם מבחנים וגם את רשימת הקורסים המלאה לתרגום השמות
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [examsSnap, coursesSnap] = await Promise.all([
                    get(ref(db, 'uploaded_exams')),
                    get(ref(db, 'courses'))
                ]);

                // 1. בונים מילון: courseId -> Course Name
                const courseNamesDict = {};
                if (coursesSnap.exists()) {
                    const coursesData = coursesSnap.val();
                    // רצים על מבנה הקורסים: שנה -> סמסטר -> קורס
                    Object.values(coursesData).forEach(yearData => {
                        if (typeof yearData === 'object') {
                            Object.values(yearData).forEach(semesterData => {
                                if (typeof semesterData === 'object') {
                                    Object.entries(semesterData).forEach(([courseId, courseInfo]) => {
                                        if (courseInfo && courseInfo.name) {
                                            courseNamesDict[courseId] = courseInfo.name;
                                        }
                                    });
                                }
                            });
                        }
                    });
                }

                // 2. ממפים את המבחנים ומתרגמים את השמות
                if (examsSnap.exists()) {
                    const data = examsSnap.val();
                    setExamsMeta(data);
                    
                    const coursesMap = {};
                    Object.values(data).forEach(exam => {
                        if (exam.courseId) {
                            // מנסה לקחת מהמילון, ואם אין - שם את ה-ID בתור גיבוי
                            coursesMap[exam.courseId] = courseNamesDict[exam.courseId] || exam.courseName || exam.courseId;
                        }
                    });
                    
                    const coursesList = Object.entries(coursesMap).map(([id, name]) => ({ id, name }));
                    setAvailableCourses(coursesList);
                }
            } catch (error) {
                console.error("Error loading metadata:", error);
            }
        };
        fetchMetadata();
    }, []);

    const runActiveMigration = async () => {
        const courseLabel = selectedCourse === 'ALL' ? "כל הקורסים" : availableCourses.find(c => c.id === selectedCourse)?.name;
        
        if (!window.confirm(`האם להתחיל ייצור הסברים עבור: ${courseLabel}?`)) {
            return;
        }

        setIsMigrating(true);
        setStats({ generated: 0, skipped: 0 });
        setProgress(`מכין את רשימת המבחנים עבור ${courseLabel}...`);

        try {
            let targetExamIds = Object.keys(examsMeta);
            if (selectedCourse !== 'ALL') {
                targetExamIds = targetExamIds.filter(id => examsMeta[id].courseId === selectedCourse);
            }
            targetExamIds = targetExamIds.sort(); 

            if (targetExamIds.length === 0) {
                toast.error("לא נמצאו מבחנים לקורס זה.");
                setIsMigrating(false);
                return;
            }

            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            let totalGenerated = 0;
            let totalSkipped = 0;
            let myExamsCount = 0;

            for (let eIndex = 0; eIndex < targetExamIds.length; eIndex++) {
                if (eIndex % totalNodes !== (myNodeId - 1)) continue;
                
                myExamsCount++;
                const examId = targetExamIds[eIndex];
                const examTitle = examsMeta[examId].title || examId;

                setProgress(`מבחן ${myExamsCount}/${Math.ceil(targetExamIds.length / totalNodes)}: טוען שאלות עבור "${examTitle}"...`);

                const [questionsSnap, existingSnap] = await Promise.all([
                    get(ref(db, `exam_contents/${examId}`)),
                    get(ref(db, `ai_explanations/${examId}`))
                ]);

                if (!questionsSnap.exists()) continue;

                const questions = questionsSnap.val();
                const existingExplanations = existingSnap.exists() ? existingSnap.val() : {};

                for (let qIndex = 0; qIndex < questions.length; qIndex++) {
                    const q = questions[qIndex];

                    if (!q || q.type === 'open_ended' || q.isCanceled || existingExplanations[qIndex]?.text) {
                        totalSkipped++;
                        setStats(prev => ({ ...prev, skipped: totalSkipped }));
                        continue;
                    }

                    setProgress(`קורס מעובד | מבחן ${myExamsCount} | שאלה ${qIndex + 1}/${questions.length} - מפעיל AI...`);

                    let correctAnswerText = "לא נמצאה תשובה";
                    if (q.options) {
                        if (Array.isArray(q.correctIndex)) {
                            correctAnswerText = q.correctIndex.map(idx => q.options[idx]).join(' + ');
                        } else if (q.correctIndex !== undefined) {
                            correctAnswerText = q.options[q.correctIndex];
                        }
                    }

                    const optionsText = q.options ? q.options.join('\n') : '';
                    const prompt = `
                    אתה מומחה רפואי ומרצה בכיר באקדמיה. הסטודנט נבחן על השאלה הבאה ורוצה לדעת למה התשובה המסומנת היא הנכונה.
                    השאלה: "${q.text || ''}"
                    התשובה הנכונה: "${correctAnswerText}"
                    כל האפשרויות שהוצגו: \n${optionsText}
                    
                    חובה עליך לפעול לפי הכללים הבאים:
                    1. התבסס אך ורק על ספרות מקצועית ועובדות מדעיות מוכחות.
                    2. אל תמציא מידע! אם אינך בטוח, כתוב: "המידע הקיים אינו מספיק כדי לספק הסבר ודאי לשאלה זו."
                    3. כתוב הסבר קליני ממוקד בעברית (עד 3 פסקאות), כולל הסבר קצר מדוע המסיחים האחרים שגויים.
                    `;

                    try {
                        const result = await model.generateContent(prompt);
                        const generatedText = result.response.text();

                        const updates = {};
                        updates[`ai_explanations/${examId}/${qIndex}/text`] = generatedText;
                        updates[`exam_contents/${examId}/${qIndex}/explanationData/likes`] = 0;
                        updates[`exam_contents/${examId}/${qIndex}/explanationData/dislikes`] = 0;

                        await update(ref(db), updates);
                        totalGenerated++;
                        setStats(prev => ({ ...prev, generated: totalGenerated }));

                        await delay(5000);

                    } catch (err) {
                        console.error(`Error generating Q${qIndex} for exam ${examId}:`, err);
                    }
                }
            }

            toast.success(`החילול עבור הקורס הסתיים! 🎉\nנוצרו ${totalGenerated} הסברים.`);

        } catch (error) {
            console.error("Migration Error:", error);
            toast.error("אירעה שגיאה במהלך התהליך, בדוק את הקונסול.");
        } finally {
            setIsMigrating(false);
            setProgress("");
        }
    };

    const getEstimatedExamsCount = () => {
        if (selectedCourse === 'ALL') return Object.keys(examsMeta).length;
        return Object.keys(examsMeta).filter(id => examsMeta[id].courseId === selectedCourse).length;
    };

    return (
        <div className="p-6 bg-white border border-indigo-200 rounded-xl text-center shadow-sm max-w-md mx-auto my-6">
            <h3 className="font-bold text-indigo-600 mb-2 text-base">חילול AI ממוקד לפי קורסים 🎯</h3>
            <p className="text-xs text-slate-500 mb-4">
                בחר קורס ספציפי כדי לנצל את הקרדיט ביעילות על החומר החשוב ביותר.
            </p>

            <div className="mb-4 text-right">
                <label className="block text-xs font-bold text-slate-700 mb-2">בחר קורס לריצה:</label>
                <select 
                    value={selectedCourse} 
                    onChange={e => setSelectedCourse(e.target.value)}
                    disabled={isMigrating}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                >
                    <option value="ALL">-- כל הקורסים במערכת --</option>
                    {availableCourses.map(course => (
                        <option key={course.id} value={course.id}>
                            {course.name}
                        </option>
                    ))}
                </select>
                <div className="mt-1 text-[10px] text-slate-500">
                    נמצאו <b>{getEstimatedExamsCount()}</b> מבחנים תחת הבחירה הזו.
                </div>
            </div>
            
            <div className="flex gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">כמה מחשבים רצים על זה?</label>
                    <input 
                        type="number" min="1" max="20" 
                        value={totalNodes} 
                        onChange={e => setTotalNodes(parseInt(e.target.value) || 1)}
                        disabled={isMigrating}
                        className="w-full text-center border p-2 rounded-md font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">מספר מחשב (1 עד {totalNodes})</label>
                    <input 
                        type="number" min="1" max={totalNodes} 
                        value={myNodeId} 
                        onChange={e => setMyNodeId(parseInt(e.target.value) || 1)}
                        disabled={isMigrating}
                        className="w-full text-center border p-2 rounded-md font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
            </div>

            <button 
                onClick={runActiveMigration} 
                disabled={isMigrating} 
                className={`w-full py-3 px-4 rounded-lg font-bold text-sm text-white transition-all ${isMigrating ? 'bg-slate-400 cursor-wait' : 'bg-indigo-500 hover:bg-indigo-600 active:scale-95 shadow-md'}`}
            >
                {isMigrating ? "המערכת עובדת, נא להמתין..." : `התחל חילול לקורס הנבחר`}
            </button>
            
            {isMigrating && (
                <div className="mt-4 space-y-2">
                    <div className="text-xs text-slate-600 font-medium animate-pulse">{progress}</div>
                    <div className="flex justify-center gap-4 text-[10px] font-bold">
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">נוצרו כעת: {stats.generated}</span>
                        <span className="text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">דולגו/קיימים: {stats.skipped}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MigrationButton;