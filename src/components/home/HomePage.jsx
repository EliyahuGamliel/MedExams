import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, onValue } from "firebase/database";
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// הייבואים החדשים שלנו
import { useAuth } from '../../context/AuthContext';
import { loginWithGoogle, logoutUser } from '../../services/authService';

import HomeSelection from './HomeSelection';
import CourseExams from './CourseExams';
import ExamTaking from './ExamTaking';
import UserProfile from './UserProfile';
<<<<<<< HEAD
import UserProfile from './UserProfile';
=======
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 inline-block align-middle"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [coursesStructure, setCoursesStructure] = useState({});
  const [examsList, setExamsList] = useState([]);
<<<<<<< HEAD
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user, userData, loading: authLoading, isAdmin } = useAuth();
=======
  
  // הוספת סטייט חדש לשליטה בתפריט המשתמש
  const [showUserMenu, setShowUserMenu] = useState(false);

  // שימוש ב-Context של המשתמשים
  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
  const navigate = useNavigate();
  const location = useLocation();

  // סגירה אוטומטית של התפריט אם לוחצים מחוץ אליו
  useEffect(() => {
    if (!showUserMenu) return;
    
    const closeMenu = (e) => {
        if (!e.target.closest('.user-menu-area')) {
            setShowUserMenu(false);
        }
    };
    
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;
    const closeMenu = (e) => {
        if (!e.target.closest('.user-menu-area')) setShowUserMenu(false);
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showUserMenu]);

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => setCoursesStructure(snap.val() || {}));
    onValue(ref(db, 'uploaded_exams'), (snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
      setLoading(false);
    });
  }, []);

  const isExamMode = location.pathname.includes('/exam/');
  const showBackBtn = location.pathname !== '/' || location.pathname !== '';

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold text-xl bg-slate-50">טוען מערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative flex flex-col pb-20" dir="rtl">
<<<<<<< HEAD
      <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur border-b border-slate-100 p-4 flex justify-between items-center shadow-sm h-16 shrink-0">
        
=======
      
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 p-4 flex justify-between items-center shadow-sm h-16 shrink-0">
        
        {/* צד ימין (כפתורי ניווט) */}
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
        <div className="w-1/3 flex items-center gap-2">
          {showBackBtn && (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:text-blue-600 font-bold text-sm transition">
              <BackIcon /> <span className="hidden sm:inline">חזור</span>
            </button>
          )}
          {showBackBtn && (
            <button onClick={() => navigate('/')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="ראשי">
              <HomeIcon />
            </button>
          )}
        </div>
        
<<<<<<< HEAD
=======
        {/* אמצע (לוגו) */}
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
        <h1 className="text-xl font-black text-slate-800 tracking-tight cursor-pointer w-1/3 text-center" onClick={() => navigate('/')}>
          Exa<span className="text-blue-600">Med</span>
        </h1>
        
<<<<<<< HEAD
        <div className="w-1/3 flex justify-end">
          {user ? (
=======
        {/* צד שמאל (אזור אישי) */}
        <div className="w-1/3 flex justify-end">
          {user ? (
              // משתמש מחובר
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
              <div className="user-menu-area flex items-center gap-2 relative">
                  <div className="hidden sm:block text-left mr-1">
                      <div className="text-xs font-bold text-slate-800 leading-tight">{user.displayName?.split(' ')[0]}</div>
                  </div>
                  
<<<<<<< HEAD
=======
                  {/* העיגול בלבד (ללא תמונה), נפתח בלחיצה */}
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
                  <div 
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm cursor-pointer border-2 border-white shadow-sm hover:bg-blue-200 transition select-none"
                  >
                      {user.displayName?.charAt(0) || 'U'}
                  </div>

<<<<<<< HEAD
=======
                  {/* תפריט נפתח - תלוי בלחיצה עכשיו ולא בריחוף */}
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
                  {showUserMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-slate-100 shadow-lg rounded-xl p-2 flex flex-col gap-1 min-w-[140px] z-50">
                        <div className="text-slate-400 text-[10px] p-2 leading-tight text-right">שלום,<br /><b>{user.displayName}</b></div>
                        <hr className="border-slate-100 mb-1" />
                        {isAdmin && (
<<<<<<< HEAD
                           <button 
                               onClick={() => { 
                                   // הוספנו את פקודת ההחלפה שמונעת את הלופ!
                                   sessionStorage.setItem('lastAppUrl', location.pathname + location.search);
                                   navigate('/admin', { replace: true }); 
                                   setShowUserMenu(false); 
                               }} 
                               className="text-xs font-bold text-slate-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg text-right transition w-full"
                           >
                               ניהול מערכת
                           </button>
                        )}
=======
   <button onClick={() => { navigate('/admin'); setShowUserMenu(false); }} className="text-xs font-bold text-slate-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg text-right transition w-full">ניהול מערכת</button>
)}
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
                        <button onClick={() => { navigate('/profile'); setShowUserMenu(false)}} className="text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-right transition w-full">אזור אישי</button>
                        <hr className="my-1 border-slate-100" />
                        <button onClick={() => { logoutUser(); setShowUserMenu(false); }} className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg text-right transition w-full">התנתק</button>
                    </div>
                  )}
              </div>
          ) : (
<<<<<<< HEAD
=======
              // משתמש לא מחובר
>>>>>>> 571221c2446204293016196ae4c2258bed8cf3da
              <button 
                  onClick={loginWithGoogle}
                  className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-50 transition flex items-center gap-1.5 shadow-sm"
                  title="התחברות לאזור אישי"
              >
                  <GoogleIcon /> <span className="hidden sm:inline">התחברות</span>
              </button>
          )}
        </div>

      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 flex-grow w-full">
        <Routes>
          <Route path="/" element={<HomeSelection coursesStructure={coursesStructure} examsList={examsList} />} />
          <Route path="/course/:courseName" element={<CourseExams examsList={examsList} />} />
          <Route path="/exam/:examId/:mode" element={<ExamTaking examsList={examsList} />} />
          <Route path="/profile" element={<UserProfile />} />
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
            
            <button onClick={() => {
                    // הוספנו את פקודת ההחלפה שמונעת את הלופ!
                    sessionStorage.setItem('lastAppUrl', location.pathname + location.search);
                    navigate('/admin', { replace: true });
                }} className="text-slate-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 mx-auto mt-0.5 text-[10px] font-bold opacity-50 hover:opacity-100">
              <LockIcon /> כניסת מנהל
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}