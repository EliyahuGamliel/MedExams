import { useNavigate } from 'react-router-dom';

export default function HomeSelection({ coursesStructure, examsList, homeYear, setHomeYear, homeSemester, setHomeSemester }) {
  const navigate = useNavigate();

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
        <div className="animate-fade-in-up text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">{getGreeting()}</h2>
          <p className="text-slate-500 mb-8">יש לבחור שנת לימודים כדי להתחיל</p>
          
          {/* כפתורי בחירת השנים */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"].map(year => (
              <button key={year} onClick={() => setHomeYear(year)} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition text-xl font-bold text-slate-700">
                {year}
              </button>
            ))}
          </div>

          {/* =========================================
              קיר הכבוד - בגרסה המהירה והנקייה
             ========================================= */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 text-right relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"></div>
            
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">👑</span>
              <div>
                <h3 className="text-lg font-black text-slate-800">קיר התהילה</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                  תודה ענקית לכל הסטודנטים שהקדישו מזמנם לתרום לפיתוח האתר:
                </p>
              </div>
            </div>

            {/* רשימת השמות - פשוט תוסיף שמות למערך והם יסתדרו אוטומטית */}
            <div className="flex flex-wrap gap-2 mt-4 pr-11">
              {[
                  "מישל ברלן", 
                  "אופיר כץ", 
                  "עלמה פרנק", 
                  "שחר דמבו",
                  "עמית פיין", 
                  "זואי מזור", 
                  "שליו אביב", 
                  "אלישע קוך",
                  "יובל דגן",
                  "שגיא מלמד",
                  "יערה נווה",
                  "נועם לוין",
                  "יעקב כהן",
                  "יואב טרבלסי",
                  "בן פרידמן🍫",
                  "פריאל מנגיסטו",
                  "רואי אהרוני",
                  "אור קרבצקי",
                                    "ליאור לובק"

              ].map((name, idx) => (
                <span key={idx} className="bg-amber-50/50 border border-amber-200/60 text-amber-700 font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="text-amber-400 text-[10px]">✨</span> {name}
                </span>
              ))}
            </div>
          </div>
          {/* ========================================= */}

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
             {/* כאן בוצע השינוי: הפכנו את הכפתור ל-div סטטי ללא onClick */}
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