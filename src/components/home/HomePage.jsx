import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get } from "firebase/database"; 
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { loginWithGoogle, logoutUser } from '../../services/authService';

import HomeSelection from './HomeSelection';
import CourseExams from './CourseExams';
import ExamTaking from './ExamTaking';
import UserProfile from './UserProfile';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 inline-block align-middle"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;

export default function HomePage() {
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesStructure, setCoursesStructure] = useState({});
  const [examsList, setExamsList] = useState([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [homeYear, setHomeYear] = useState(() => sessionStorage.getItem('savedHomeYear') || "");
  const [homeSemester, setHomeSemester] = useState(() => sessionStorage.getItem('savedHomeSemester') || "");

  // --- סטייט למצב לילה (משיכה ראשונית מ-localStorage) ---
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const { user, userData, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExamMode = location.pathname.includes('/exam/');
  
  const isHomeRoute = location.pathname === '/' || (!location.pathname.includes('/exam/') && !location.pathname.includes('/course/') && !location.pathname.includes('/profile') && !location.pathname.includes('/admin'));

  const needsExams = homeYear || !isHomeRoute;

  // --- אפקט לסנכרון מחלקת ה-dark על ה-HTML הראשי של הדף ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (homeYear) sessionStorage.setItem('savedHomeYear', homeYear);
    else sessionStorage.removeItem('savedHomeYear');
    
    if (homeSemester) sessionStorage.setItem('savedHomeSemester', homeSemester);
    else sessionStorage.removeItem('savedHomeSemester');
  }, [homeYear, homeSemester]);

  useEffect(() => {
    if (!showUserMenu) return;
    const closeMenu = (e) => {
        if (!e.target.closest('.user-menu-area')) setShowUserMenu(false);
    };
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showUserMenu]);

  useEffect(() => {
    const fetchCoursesOnly = async () => {
        const cachedCourses = sessionStorage.getItem('cachedCourses');
        if (cachedCourses) {
            setCoursesStructure(JSON.parse(cachedCourses));
            setLoadingCourses(false);
        }

        try {
            const snap = await get(ref(db, 'courses'));
            const data = snap.val() || {};
            setCoursesStructure(data);
            sessionStorage.setItem('cachedCourses', JSON.stringify(data));
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoadingCourses(false);
        }
    };

    fetchCoursesOnly();
  }, []);

  useEffect(() => {
    if (!needsExams) return;

    const fetchExamsLazy = async () => {
        const cachedExams = sessionStorage.getItem('cachedExams');
        const cacheTimestamp = sessionStorage.getItem('cacheTimeExams');
        const now = new Date().getTime();
        const isCacheFresh = cacheTimestamp && (now - parseInt(cacheTimestamp) < 3600000);

        if (cachedExams) {
            setExamsList(JSON.parse(cachedExams));
            if (isCacheFresh) return;
        }

        try {
            const snap = await get(ref(db, 'uploaded_exams'));
            const data = snap.val() ? Object.values(snap.val()) : [];
            setExamsList(data);
            sessionStorage.setItem('cachedExams', JSON.stringify(data));
            sessionStorage.setItem('cacheTimeExams', now.toString());
        } catch (error) {
            console.error("Error lazy fetching exams:", error);
        }
    };

    fetchExamsLazy();
  }, [needsExams]);

  const showBackBtn = !isHomeRoute || homeYear !== "";

  const handleGoBack = () => {
      if (isHomeRoute) {
          if (homeSemester) {
              setHomeSemester("");
              navigate(`/${encodeURIComponent(homeYear)}`, { replace: true });
          } else if (homeYear) {
              setHomeYear("");
              navigate('/', { replace: true });
          }
      } else {
          navigate(-1);
      }
  };

  const handleGoHome = () => {
      setHomeYear("");
      setHomeSemester("");
      navigate('/', { replace: true });
  };

  if (loadingCourses || authLoading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold text-xl bg-slate-50 dark:bg-dark-bg transition-colors">טוען מערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 font-sans relative flex flex-col pb-20 transition-colors duration-300" dir="rtl">
      
      {/* ה-Header הותאם למצב לילה עם רקע כהה וגבול עדין */}
      <header className="sticky print:hidden top-0 z-[100] bg-white/90 dark:bg-dark-bg/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center shadow-sm h-16 shrink-0 transition-colors">
        
        <div className="w-1/3 flex items-center gap-2">
          {showBackBtn && (
            <button onClick={handleGoBack} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-dark-panel text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm transition rounded-full">
              <BackIcon /> <span className="hidden sm:inline">חזור</span>
            </button>
          )}
          {showBackBtn && (
            <button onClick={handleGoHome} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition" title="ראשי">
              <HomeIcon />
            </button>
          )}
        </div>
        
        <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight cursor-pointer w-1/3 text-center transition-colors" onClick={handleGoHome}>
          Eliko<span className="text-blue-600 dark:text-blue-400">Med</span>
        </h1>
        
        <div className="w-1/3 flex justify-end items-center gap-2">
          
          {/* --- כפתור Toggle מעוצב להחלפת מצב לילה/יום --- */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-1.5 rounded-full bg-slate-100 dark:bg-dark-panel text-slate-500 dark:text-amber-400 hover:scale-105 transition-all shadow-sm shrink-0 border border-transparent dark:border-slate-700"
            title={darkMode ? "מצב יום" : "מצב לילה"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {user ? (
              <div className="user-menu-area flex items-center gap-2 relative">
                  <div className="hidden sm:block text-left mr-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.displayName?.split(' ')[0]}</div>
                  </div>
                  
                  <div 
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm cursor-pointer border-2 border-white dark:border-slate-800 shadow-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition select-none"
                  >
                      {user.displayName?.charAt(0) || 'U'}
                  </div>

                  {showUserMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-dark-panel border border-slate-100 dark:border-slate-700 shadow-lg rounded-xl p-2 flex flex-col gap-1 min-w-[140px] z-50 animate-fade-in-quick">
                        <div className="text-slate-400 dark:text-slate-400 text-[10px] p-2 leading-tight text-right">שלום,<br /><b className="text-slate-700 dark:text-slate-200">{user.displayName}</b></div>
                        <hr className="border-slate-100 dark:border-slate-700 mb-1" />
                        {isAdmin && (
                           <button 
                               onClick={() => { 
                                   sessionStorage.setItem('lastAppUrl', location.pathname + location.search);
                                   navigate('/admin', { replace: true }); 
                                   setShowUserMenu(false); 
                               }} 
                               className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 p-2 rounded-lg text-right transition w-full"
                           >
                               ניהול מערכת
                           </button>
                        )}
                        <button onClick={() => { navigate('/profile'); setShowUserMenu(false)}} className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 p-2 rounded-lg text-right transition w-full">אזור אישי</button>
                        <hr className="my-1 border-slate-100 dark:border-slate-700" />
                        <button onClick={() => { logoutUser(); setShowUserMenu(false); }} className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-lg text-right transition w-full">התנתק</button>
                    </div>
                  )}
              </div>
          ) : (
              <button 
                  onClick={loginWithGoogle}
                  className="bg-white dark:bg-dark-panel text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-sm"
                  title="התחברות לאזור אישי"
              >
                  <GoogleIcon /> <span className="hidden sm:inline">התחברות</span>
              </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 flex-grow w-full">
        <Routes>
          <Route path="/:urlYear?/:urlSemester?" element={<HomeSelection coursesStructure={coursesStructure} examsList={examsList} homeYear={homeYear} setHomeYear={setHomeYear} homeSemester={homeSemester} setHomeSemester={setHomeSemester} />} />
          <Route path="/course/:courseName" element={<CourseExams examsList={examsList} />} />
          <Route path="/exam/:examId/:mode" element={<ExamTaking examsList={examsList} />} />
          <Route path="/profile" element={<UserProfile />} />
        </Routes>
      </main>

      <footer className="w-full text-center py-8 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-dark-bg mt-auto text-xs sm:text-sm print:hidden border-t border-transparent dark:border-slate-800/50 transition-colors">
        <p className="mb-1 flex items-center justify-center gap-1">בפיתוח המערכת הושקעו זמן ומחשבה רבים <HeartIcon /></p>
        <p className="mb-4">נהניתם? מוזמנים לפרגן בביט: <span className="font-bold text-slate-700 dark:text-slate-300 select-all">053-2559635</span></p>
      </footer>

      {!isExamMode && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 w-full text-center py-2.5 text-slate-500 dark:text-slate-400 bg-slate-50/95 dark:bg-dark-bg/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden transition-colors">
          <div className="flex flex-col items-center px-4 max-w-md mx-auto gap-0.5">
            <span className="text-[15px] font-bold text-slate-600 dark:text-slate-300">
              פותח באהבה עבורכם 💙 בהצלחה במבחנים! 🎓
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
            ⚠️ שימו לב: המערכת נמצאת בשלב הרצה (פיילוט). יייתכנו אי-דיוקים או שגיאות בתשובות, וישנה אפשרות שהפרויקט לא יתוחזק בעתיד. ט.ל.ח.
            </span>
            
            <button onClick={() => {
                    sessionStorage.setItem('lastAppUrl', location.pathname + location.search);
                    navigate('/admin', { replace: true });
                }} className="text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1 mx-auto mt-0.5 text-[10px] font-bold opacity-50 hover:opacity-100">
              <LockIcon /> כניסת מנהל
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}