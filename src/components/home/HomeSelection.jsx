import { useSearchParams, useNavigate } from 'react-router-dom';

export default function HomeSelection({ coursesStructure, examsList }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const selectedYear = searchParams.get('year');
  const selectedSemester = searchParams.get('semester');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "בוקר טוב! ☀️";
    if (hour >= 12 && hour < 17) return "צהריים טובים! 🌤️";
    if (hour >= 17 && hour < 21) return "ערב טוב! 🌇";
    return "לילה טוב! 🌙";
  };

  const relevantCourses = selectedYear && selectedSemester && coursesStructure[selectedYear] && coursesStructure[selectedYear][selectedSemester]
    ? Object.values(coursesStructure[selectedYear][selectedSemester]).sort((a, b) => a.name.localeCompare(b.name, 'he'))
    : [];

  return (
    <>
      {!selectedYear && (
        <div className="animate-fade-in-up text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">{getGreeting()}</h2>
          <p className="text-slate-500 mb-8">יש לבחור שנת לימודים כדי להתחיל</p>
          <div className="grid grid-cols-2 gap-4">
            {["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"].map(year => (
              <button key={year} onClick={() => setSearchParams({ year })} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition text-xl font-bold text-slate-700">
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedYear && !selectedSemester && (
        <div className="animate-fade-in-up text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedYear}</h2>
          <p className="text-slate-500 mb-8">בחירת סמסטר</p>
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            {["סמסטר א'", "סמסטר ב'"].map(sem => (
              <button key={sem} onClick={() => setSearchParams({ year: selectedYear, semester: sem })} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-50 hover:border-blue-300 transition text-lg font-bold text-slate-700">
                {sem}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedYear && selectedSemester && (
        <div className="animate-fade-in-up">
           <div className="text-center mb-8">
             <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{selectedYear} / {selectedSemester}</span>
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