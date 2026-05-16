import { useState, useEffect } from 'react';
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800">מרכז בקרת שינויים 🕵️‍♂️</h2>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                    30 ימים אחרונים
                </span>
            </div>
            
            {loading ? (
                <div className="text-center py-10 text-slate-500 font-bold">טוען יומן פעולות...</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500">
                    לא נמצאו פעולות ניהוליות ב-30 הימים האחרונים.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b-2 border-slate-200">
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
                                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                    <td className="p-3 whitespace-nowrap text-slate-500" dir="ltr">
                                        {new Date(log.timestamp).toLocaleString('he-IL', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">{log.email}</td>
                                    <td className="p-3 text-blue-600 font-bold">{log.action}</td>
                                    <td className="p-3 text-slate-400 text-xs font-mono">{log.examId}</td>
                                    <td className="p-3 text-slate-600">{log.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}