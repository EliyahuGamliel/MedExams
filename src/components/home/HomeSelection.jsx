import { useNavigate } from 'react-router-dom';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

export default function HomeSelection({ coursesStructure, examsList, homeYear, setHomeYear, homeSemester, setHomeSemester }) {
  const navigate = useNavigate();

  const handleResetSelection = () => {
    setHomeYear("");
    setHomeSemester("");
  };

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
          <div className="grid grid-cols-2 gap-4">
            {["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"].map(year => (
              <button key={year} onClick={() => setHomeYear(year)} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition text-xl font-bold text-slate-700">
                {year}
              </button>
            ))}
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
             <button 
                onClick={handleResetSelection}
                title="לחץ כדי לשנות שנה וסמסטר"
                className="inline-flex items-center gap-2 text-xs font-bold bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full hover:bg-blue-200 hover:shadow-md transition cursor-pointer"
             >
                <span>{homeYear} / {homeSemester}</span>
                <EditIcon />
             </button>
             
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