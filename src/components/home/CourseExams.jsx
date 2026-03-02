import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;

export default function CourseExams({ examsList }) {
  const { courseName } = useParams();
  const navigate = useNavigate();
  const [selectedExamForMode, setSelectedExamForMode] = useState(null);

  const relevantExams = examsList
      .filter(e => e.course === courseName)
      .sort((a, b) => {
          const yearA = parseInt(a.examYear) || 0;
          const yearB = parseInt(b.examYear) || 0;
          if (yearB !== yearA) return yearB - yearA;
          const getMoedPriority = (m) => {
              if (!m) return 99;
              if (m.includes("א'")) return 1;
              if (m.includes("ב'")) return 2;
              if (m.includes("ג'")) return 3;
              return 4;
          };
          return getMoedPriority(a.examMoed) - getMoedPriority(b.examMoed);
      });

  if (selectedExamForMode) {
    return (
      <div className="animate-fade-in-up text-center pt-8">
        <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedExamForMode.title}</h2>
        <p className="text-slate-500 mb-10">איך נפתור את המבחן?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            <button onClick={() => navigate(`/exam/${selectedExamForMode.id}/test`, { state: { fromCourse: true } })} className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all group text-right">
    <div className="text-4xl mb-4 group-hover:scale-110 transition transform">📝</div>
    <h3 className="text-xl font-bold text-slate-700">מצב מבחן</h3>
    <p className="text-sm text-slate-400 mt-2 leading-relaxed">סימולציה מלאה. התשובות ייחשפו בסוף.</p>
</button>
<button onClick={() => navigate(`/exam/${selectedExamForMode.id}/practice`, { state: { fromCourse: true } })} className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-green-500 hover:shadow-xl transition-all group text-right">
    <div className="text-4xl mb-4 group-hover:scale-110 transition transform">🎯</div>
    <h3 className="text-xl font-bold text-slate-700">מצב תרגול</h3>
    <p className="text-sm text-slate-400 mt-2 leading-relaxed">משוב מיידי עם סימון כל תשובה.</p>
</button>
        </div>
        <button onClick={() => setSelectedExamForMode(null)} className="text-slate-400 hover:text-slate-600 font-bold underline underline-offset-4">ביטול וחזרה לרשימה</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">{courseName}</h2>
      <p className="text-slate-500 text-center mb-8">יש לבחור שחזור לתרגול</p>
      {relevantExams.length === 0 ? <p className="text-center text-slate-400">אין מבחנים.</p> : <div className="grid grid-cols-1 gap-3">{relevantExams.map((exam, index) => { const showYearHeader = index === 0 || relevantExams[index-1].examYear !== exam.examYear; return (<div key={exam.id}>{showYearHeader && <div className="text-xs font-bold text-slate-400 mt-4 mb-2 mr-2">{exam.examYear || "שונות"}</div>}<button onClick={() => setSelectedExamForMode(exam)} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition flex justify-between items-center"><div className="flex items-center gap-3"><span className="font-bold text-slate-800 text-lg">{exam.title}</span>{exam.hasAppendices && <span className="bg-indigo-100 text-indigo-700 p-1 rounded"><PaperclipIcon /></span>}</div><span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-medium">{exam.questionCount ? `${exam.questionCount} שאלות` : 'כניסה למבחן'}</span></button></div>);})}</div>}
    </div>
  );
}