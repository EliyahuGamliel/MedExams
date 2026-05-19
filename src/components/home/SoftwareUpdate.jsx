import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // ודא שהנתיב ל-firebase נכון!
import { ref, get } from 'firebase/database';

// אייקונים
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

export default function SoftwareUpdate() {
  const [localVersion, setLocalVersion] = useState(() => localStorage.getItem('app_version') || "v1.0");
  const [targetVersion, setTargetVersion] = useState(localVersion); // ברירת מחדל עד שנקבל תשובה מהשרת
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("מאתחל חיבור לשרת...");

  // שואבים את הגרסה החדשה מ-Firebase כשהעמוד נטען
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const snap = await get(ref(db, 'system_settings/current_version'));
        if (snap.exists()) {
          setTargetVersion(snap.val()); // למשל "v2.1" יגיע מפה!
        }
      } catch (e) {
        console.error("Error fetching version:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVersion();
  }, []);

  const isUpToDate = localVersion === targetVersion;

  useEffect(() => {
    if (!isUpdating) return;

    const messages = ["מאתחל חיבור לשרת...", "מוריד קבצי מערכת חדשים...", "מנקה זיכרון מטמון (Cache)...", "מחיל שיפורי ביצועים...", "מתקין עדכון, נא לא לסגור את הדפדפן..."];
    let currentProgress = 0;
    
    const progressInterval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
        setStatusText("ההתקנה הושלמה! מרענן מערכת...");
        
        localStorage.setItem('app_version', targetVersion);
        
        setTimeout(() => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('update', new Date().getTime());
            window.location.href = currentUrl.toString();
        }, 800);
      } else {
        setProgress(currentProgress);
        setStatusText(messages[Math.min(Math.floor((currentProgress / 100) * messages.length), messages.length - 1)]);
      }
    }, 400);

    return () => clearInterval(progressInterval);
  }, [isUpdating, targetVersion]);

  // אל תציג כלום בזמן שטוען את הגרסה מהשרת
  if (isLoading) return null; 

  if (isUpToDate) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between text-white shadow-sm max-w-sm w-full mx-auto">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 text-green-400 rounded-full"><CheckIcon /></div>
                <div className="flex flex-col">
                    <span className="font-bold text-sm">המערכת מעודכנת</span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider">גרסה: {localVersion}</span>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden max-w-sm w-full mx-auto">
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-30"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-blue-500/20 text-blue-400 ${isUpdating ? 'animate-spin' : ''}`}><SettingsIcon /></div>
            <div>
              <h3 className="font-bold text-lg leading-tight">עדכון מערכת זמין</h3>
              <span className="text-xs text-slate-400 font-mono tracking-wider">{localVersion} ➔ {targetVersion}</span>
            </div>
          </div>
        </div>

        {isUpdating ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between text-xs font-bold font-mono">
              <span className="text-blue-400">{statusText}</span><span className="text-white">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">שחררנו גרסה חדשה! מומלץ לעדכן כעת כדי לקבל את הביצועים הטובים ביותר ושאלות מעודכנות במאגר.</p>
            <button onClick={() => setIsUpdating(true)} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
              <DownloadIcon /> הורד והתקן עדכון ({targetVersion})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}