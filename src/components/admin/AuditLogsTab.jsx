import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // ודא שהנתיב ל-firebase.js שלך נכון
import { ref, query, orderByChild, startAt, get } from "firebase/database";

export default function AuditLogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            // חישוב הזמן של לפני 30 יום במילישניות
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            // יצירת שאילתה: משוך מהיומן רק נתונים שהזמן שלהם גדול מ-30 יום אחורה
            const logsQuery = query(
                ref(db, 'admin_logs'), 
                orderByChild('timestampNum'), 
                startAt(thirtyDaysAgo)
            );

            try {
                const snapshot = await get(logsQuery);
                if (snapshot.exists()) {
                    const logsArray = [];
                    snapshot.forEach(child => {
                        logsArray.push({ id: child.key, ...child.val() });
                    });
                    // הפיכת המערך כדי שהפעולות האחרונות יופיעו למעלה
                    setLogs(logsArray.reverse());
                } else {
                    setLogs([]);
                }
            } catch (error) {
                console.error("שגיאה במשיכת יומן הבקרה:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    return (
        /* מעטפת הטבלה המרכזית מותאמת ל-Dark Mode */
        <div className="bg-white dark:bg-dark-panel p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in text-right">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white transition-colors">מרכז בקרת שינויים 🕵️‍♂️</h2>
                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                    30 ימים אחרונים
                </span>
            </div>
            
            {loading ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-bold transition-colors">טוען יומן פעולות...</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-dark-bg rounded-xl text-slate-500 dark:text-slate-400 transition-colors">
                    לא נמצאו פעולות ניהוליות ב-30 הימים האחרונים.
                </div>
            ) : (
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-sm text-right">
                        {/* ראש הטבלה הותאם לקונטרסט כהה עם בורדר עדין */}
                        <thead className="bg-slate-50 dark:bg-dark-bg/50 text-slate-600 dark:text-slate-400 font-bold border-b-2 border-slate-200 dark:border-slate-700 transition-colors">
                            <tr>
                                <th className="p-3 rounded-tr-xl">תאריך ושעה</th>
                                <th className="p-3">מנהל מבצע</th>
                                <th className="p-3">סוג הפעולה</th>
                                <th className="p-3">מזהה מבחן</th>
                                <th className="p-3 rounded-tl-xl">פירוט מלא</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                /* גוף הטבלה והשורות משנים צבעים עם אפקט הובר רך בלילה */
                                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-3 whitespace-nowrap text-slate-500 dark:text-slate-400" dir="ltr">
                                        {new Date(log.timestamp).toLocaleString('he-IL', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200 transition-colors">{log.email}</td>
                                    <td className="p-3 text-blue-600 dark:text-blue-400 font-bold transition-colors">{log.action}</td>
                                    <td className="p-3 text-slate-400 dark:text-slate-500 text-xs font-mono transition-colors">{log.examId}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 transition-colors">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}