import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // ודא שהנתיב ל-firebase.js שלך נכון!
import { ref, get, set } from 'firebase/database';
import toast from 'react-hot-toast';

export default function SystemVersionManager() {
  const [currentVersion, setCurrentVersion] = useState("טוען...");
  const [newVersion, setNewVersion] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // מושך את הגרסה הנוכחית מהדאטאבייס כשהפאנל נטען
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const snap = await get(ref(db, 'system_settings/current_version'));
        if (snap.exists()) {
          setCurrentVersion(snap.val());
        } else {
          setCurrentVersion("לא הוגדרה מעולם");
        }
      } catch (e) {
        console.error(e);
        setCurrentVersion("שגיאה בקריאה");
      }
    };
    fetchVersion();
  }, []);

  // פונקציית שחרור העדכון למערכת
  const handleReleaseUpdate = async () => {
    if (!newVersion.trim()) {
      toast.error("יש להזין מספר גרסה (לדוגמה v2.2)");
      return;
    }
    
    setIsUpdating(true);
    try {
      await set(ref(db, 'system_settings/current_version'), newVersion.trim());
      
      setCurrentVersion(newVersion.trim());
      setNewVersion("");
      toast.success("עדכון שוחרר בהצלחה לכל המשתמשים! 🚀");
    } catch (e) {
      console.error(e);
      toast.error("אירעה שגיאה בשחרור העדכון.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    /* מעטפת הניהול הותאמה לרקע וגבולות כהים בלילה */
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4 max-w-lg mb-8 animate-fade-in text-right duration-300 transition-colors">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 transition-colors">
            <div className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 p-2 rounded-xl transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div className="text-right">
                <h3 className="font-black text-slate-800 dark:text-white text-lg transition-colors">שחרור עדכון תוכנה למערכת</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 transition-colors">
                  גרסה נוכחית באוויר: 
                  <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-md mr-1 font-mono transition-all">
                    {currentVersion}
                  </span>
                </p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-end w-full">
            <div className="flex-1 w-full text-right">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 transition-colors">מספר גרסה חדשה (לדוגמה: v2.5):</label>
                {/* שדה קלט מעודכן למניעת סנוור בלילה */}
                <input 
                    type="text" 
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="הקלד גרסה..."
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-950/50 transition-all text-sm font-bold text-slate-700 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900"
                />
            </div>
            
            {/* כפתור הפעולה הותאם ללילה */}
            <button 
                onClick={handleReleaseUpdate}
                disabled={isUpdating || !newVersion.trim()}
                className="w-full sm:w-auto bg-slate-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 shrink-0 border border-transparent"
            >
                {isUpdating ? 'מעדכן שרת...' : 'שחרר עדכון'}
            </button>
        </div>
    </div>
  );
}