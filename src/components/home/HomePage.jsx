import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue } from "firebase/database";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import HomeSelection from './HomeSelection';
import CourseExams from './CourseExams';
import ExamTaking from './ExamTaking';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 inline-block align-middle"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [coursesStructure, setCoursesStructure] = useState({});
  const [examsList, setExamsList] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => setCoursesStructure(snap.val() || {}));
    onValue(ref(db, 'uploaded_exams'), (snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
      setLoading(false);
    });
  }, []);

  const isExamMode = location.pathname.includes('/exam/');
  const showBackBtn = location.pathname !== '/' || location.search !== '';

  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold text-xl bg-slate-50">טוען מערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative flex flex-col pb-20" dir="rtl">
      
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 p-4 flex justify-between items-center shadow-sm h-16 shrink-0">
        <div className="w-24">
          {showBackBtn && (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:text-blue-600 font-bold text-sm transition">
              <BackIcon /> חזור
            </button>
          )}
        </div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight cursor-pointer" onClick={() => navigate('/')}>
          Exa<span className="text-blue-600">Med</span>
        </h1>
        <div className="w-24 flex justify-end">
          {showBackBtn && (
            <button onClick={() => navigate('/')} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><HomeIcon /></button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 flex-grow w-full">
        <Routes>
          <Route path="/" element={<HomeSelection coursesStructure={coursesStructure} examsList={examsList} />} />
          <Route path="/course/:courseName" element={<CourseExams examsList={examsList} />} />
          <Route path="/exam/:examId/:mode" element={<ExamTaking examsList={examsList} />} />
        </Routes>
      </main>

      <footer className="w-full text-center py-8 text-slate-400 bg-slate-50 mt-auto text-xs sm:text-sm">
        <p className="mb-1 flex items-center justify-center gap-1">בפיתוח המערכת הושקעו זמן ומחשבה רבים <HeartIcon /></p>
        <p className="mb-4">נהניתם? מוזמנים לפרגן בביט: <span className="font-bold text-slate-700 select-all">053-2559635</span></p>
      </footer>

      {!isExamMode && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 w-full text-center py-2.5 text-slate-500 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col items-center px-4 max-w-md mx-auto gap-0.5">
            <span className="text-[15px] font-bold text-slate-600">
              פותח באהבה עבורכם 💙 בהצלחה במבחנים! 🎓
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
            ⚠️ שימו לב: המערכת נמצאת בשלב הרצה (פיילוט). ייתכנו אי-דיוקים או שגיאות בתשובות, וישנה אפשרות שהפרויקט לא יתוחזק בעתיד. ט.ל.ח.
            </span>
            
            <button onClick={() => navigate('/admin')} className="text-slate-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 mx-auto mt-0.5 text-[10px] font-bold opacity-50 hover:opacity-100">
              <LockIcon /> כניסת מנהל
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}