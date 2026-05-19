import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SoftwareUpdate from './SoftwareUpdate';

// אייקון חץ נפתח/נסגר בשביל קיר התהילה
const ChevronIcon = ({ isOpen }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function HomeSelection({ coursesStructure, examsList, homeYear, setHomeYear, homeSemester, setHomeSemester }) {
  const navigate = useNavigate();
  const [isFameOpen, setIsFameOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "בוקר טוב! ☀️";
    if (hour >= 12 && hour < 17) return "צהריים טובים! 🌤️";
    if (hour >= 17 && hour < 21) return "ערב טוב! 🌇";
    return "לילה טוב! 🌙";
  };

  const relevantCourses = homeYear && homeSemester && coursesStructure[homeYear] && coursesStructure[homeYear][homeSemester]
    ? Object.values(coursesStructure[homeYear][homeSemester]).sort((a, b) => a.name.localeCompare(b.name, 'he'))
    : [];

  return (
    <>
      {!homeYear && (
        <div className="animate-fade-in-up w-full max-w-3xl mx-auto">
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">{getGreeting()}</h2>
            <p className="text-slate-500 mb-8">יש לבחור שנת לימודים כדי להתחיל</p>
            
            {/* כפתורי בחירת השנים - נמצאים עכשיו במרכז הבמה */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"].map(year => (
                <button key={year} onClick={() => setHomeYear(year)} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition text-xl font-bold text-slate-700">
                  {year}
                </button>
              ))}
            </div>

            {/* =========================================
                קיר הכבוד - אקורדיון
               ========================================= */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 text-right relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"></div>
              
              <button 
                onClick={() => setIsFameOpen(!isFameOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-amber-50/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl filter drop-shadow-sm">👑</span>
                  <div className="text-right">
                    <h3 className="text-lg font-black text-slate-800">קיר התהילה</h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">לחץ כאן לראות את התורמים לפרויקט</p>
                  </div>
                </div>
                <div className="bg-slate-50 text-slate-400 p-2 rounded-full border border-slate-100">
                  <ChevronIcon isOpen={isFameOpen} />
                </div>
              </button>

              <div 
                className={`transition-all duration-500 ease-in-out ${isFameOpen ? 'max-h-[500px] opacity-100 pb-6 px-6' : 'max-h-0 opacity-0 px-6 overflow-hidden'}`}
              >
                <div className="w-full h-px bg-slate-100 mb-4"></div>
                <p className="text-xs text-slate-500 font-bold mb-4">
                  תודה ענקית לכל הסטודנטים שהקדישו מזמנם לתרום לפיתוח ולמאגר השאלות:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                      "מישל ברלן", 
                      "אופיר כץ", 
                      "עלמה פרנק❤️", 
                      "שחר דמבו",
                      "עמית פיין", 
                      "זואי מזור", 
                      "אלישע קוך",
                      "יובל דגן",
                      "יערה נוה",
                      "נועם לוין",
                      "יעקב כהן",
                      "יואב טרבלסי",
                      "בן פרידמן🍫",
                      "פריאל מנגיסטו",
                      "רואי אהרוני",
                      "אור קרבצקי",
                      "ליאור לובק"
                  ].map((name, idx) => (
                    <span key={idx} className="bg-amber-50/80 border border-amber-200/60 text-amber-700 font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm hover:scale-105 cursor-default transition-transform">
                      <span className="text-amber-400 text-[10px]">✨</span> {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* ========================================= */}

            {/* =========================================
                עדכון התוכנה - נמצא עכשיו בתחתית המסך הראשון
               ========================================= */}
            <div className="mt-8 mb-4">
              <SoftwareUpdate targetVersion="v2.1" />
            </div>
            {/* ========================================= */}

          </div>
        </div>
      )}

      {homeYear && !homeSemester && (
        <div className="animate-fade-in-up text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{homeYear}</h2>
          <p className="text-slate-500 mb-8">בחירת סמסטר</p>
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            {["סמסטר א'", "סמסטר ב'"].map(sem => (
              <button key={sem} onClick={() => setHomeSemester(sem)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-50 hover:border-blue-300 transition text-lg font-bold text-slate-700">
                {sem}
              </button>
            ))}
          </div>
        </div>
      )}

      {homeYear && homeSemester && (
        <div className="animate-fade-in-up">
           <div className="text-center mb-8">
             <div className="inline-flex items-center text-xs font-bold bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full">
                <span>{homeYear} / {homeSemester}</span>
             </div>
             
             <h2 className="text-2xl font-bold text-slate-800 mt-4">בחר קורס</h2>
           </div>
           
           {relevantCourses.length === 0 ? (
             <div className="text-center p-10 bg-white rounded-3xl border border-dashed text-slate-400">עדיין לא הוגדרו קורסים.</div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {relevantCourses.map(course => {
                 const count = examsList.filter(e => e.course === course.name).length;
                 return (
                   <button key={course.name} onClick={() => navigate(`/course/${course.name}`)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-lg transition text-right group">
                     <h3 className="text-lg font-bold text-slate-700 group-hover:text-blue-700">{course.name}</h3>
                     <p className="text-xs text-slate-400 mt-1">{count} מבחנים זמינים</p>
                   </button>
                 );
               })}
             </div>
           )}
        </div>
      )}
    </>
  );
}