import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from "firebase/database";
import QuestionCard from './QuestionCard';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  
  const [coursesStructure, setCoursesStructure] = useState({});
  const [examsList, setExamsList] = useState([]);

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [mode, setMode] = useState(null);

  const [userAnswers, setUserAnswers] = useState({});
  const [finalScore, setFinalScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => setCoursesStructure(snap.val() || {}));
    onValue(ref(db, 'uploaded_exams'), (snap) => {
      const data = snap.val();
      setExamsList(data ? Object.values(data) : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedExam && mode) {
      setUserAnswers({});
      setFinalScore(null);
      setShowScoreModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedExam, mode]);

  const relevantCourses = selectedYear && selectedSemester && coursesStructure[selectedYear] && coursesStructure[selectedYear][selectedSemester]
    ? Object.values(coursesStructure[selectedYear][selectedSemester])
    : [];

  const getMoedPriority = (moedStr) => {
    if (!moedStr) return 99;
    if (moedStr.includes("א'")) return 1;
    if (moedStr.includes("ב'")) return 2;
    if (moedStr.includes("ג'")) return 3;
    return 5;
  };

  const relevantExams = selectedCourse
    ? examsList
        .filter(e => e.course === selectedCourse.name)
        .sort((a, b) => {
          const yearA = parseInt(a.examYear) || 0;
          const yearB = parseInt(b.examYear) || 0;
          if (yearB !== yearA) return yearB - yearA;
          return getMoedPriority(a.examMoed) - getMoedPriority(b.examMoed);
        })
    : [];

  const handleAnswerUpdate = (questionIndex, isCorrect) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: isCorrect }));
  };

  const calculateScore = () => {
    const totalQuestions = selectedExam.questions.length;
    const correctCount = Object.values(userAnswers).filter(val => val === true).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    setFinalScore(score);
    setShowScoreModal(true);
  };

  const handleBack = () => {
    if (mode) { setMode(null); setFinalScore(null); setShowScoreModal(false); }
    else if (selectedExam) setSelectedExam(null);
    else if (selectedCourse) setSelectedCourse(null);
    else if (selectedSemester) setSelectedSemester(null);
    else if (selectedYear) setSelectedYear(null);
  };

  const handleHome = () => {
    setSelectedYear(null);
    setSelectedSemester(null);
    setSelectedCourse(null);
    setSelectedExam(null);
    setMode(null);
    setFinalScore(null);
    setShowScoreModal(false);
  };

  const handleBackToList = () => {
    setMode(null);
    setSelectedExam(null);
    setFinalScore(null);
    setShowScoreModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const correctCount = finalScore !== null ? Object.values(userAnswers).filter(v => v).length : 0;
  const isPass = finalScore >= 60;
  // משתנה עזר לדעת אם המבחן הוגש
  const isSubmitted = finalScore !== null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold text-xl">טוען מערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans" dir="rtl">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 p-4 flex justify-between items-center shadow-sm h-16">
        <div className="w-24">
          {selectedYear && <button onClick={handleBack} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:text-blue-600 font-bold text-sm transition"><BackIcon /> חזור</button>}
        </div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight cursor-pointer" onClick={handleHome}>Med<span className="text-blue-600">Exams</span></h1>
        <div className="w-24 flex justify-end">
          {selectedYear && <button onClick={handleHome} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><HomeIcon /></button>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8">
        {!selectedYear && (
          <div className="animate-fade-in-up text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">שלום! 👋</h2>
            <p className="text-slate-500 mb-8">בחר שנת לימודים כדי להתחיל</p>
            <div className="grid grid-cols-2 gap-4">
              {["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"].map(year => (
                <button key={year} onClick={() => setSelectedYear(year)} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition text-xl font-bold text-slate-700">{year}</button>
              ))}
            </div>
          </div>
        )}

        {selectedYear && !selectedSemester && (
          <div className="animate-fade-in-up text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedYear}</h2>
            <p className="text-slate-500 mb-8">בחר סמסטר</p>
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              {["סמסטר א'", "סמסטר ב'"].map(sem => (
                <button key={sem} onClick={() => setSelectedSemester(sem)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:bg-blue-50 hover:border-blue-300 transition text-lg font-bold text-slate-700">{sem}</button>
              ))}
            </div>
          </div>
        )}

        {selectedYear && selectedSemester && !selectedCourse && (
          <div className="animate-fade-in-up">
             <div className="text-center mb-8">
               <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{selectedYear} / {selectedSemester}</span>
               <h2 className="text-2xl font-bold text-slate-800 mt-4">בחר קורס</h2>
             </div>
             {relevantCourses.length === 0 ? (
               <div className="text-center p-10 bg-white rounded-3xl border border-dashed text-slate-400">עדיין לא הוגדרו קורסים לשנה/סמסטר זה.</div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {relevantCourses.map(course => {
                   const count = examsList.filter(e => e.course === course.name).length;
                   return (
                     <button key={course.name} onClick={() => setSelectedCourse(course)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-lg transition text-right group">
                       <h3 className="text-lg font-bold text-slate-700 group-hover:text-blue-700">{course.name}</h3>
                       <p className="text-xs text-slate-400 mt-1">{count} מבחנים זמינים</p>
                     </button>
                   );
                 })}
               </div>
             )}
          </div>
        )}

        {selectedCourse && !selectedExam && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">{selectedCourse.name}</h2>
            <p className="text-slate-500 text-center mb-8">בחר שחזור לתרגול</p>
            {relevantExams.length === 0 ? (
              <p className="text-center text-slate-400">עדיין לא הועלו מבחנים לקורס זה.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {relevantExams.map((exam, index) => {
                  const showYearHeader = index === 0 || relevantExams[index-1].examYear !== exam.examYear;
                  return (
                    <div key={exam.id}>
                      {showYearHeader && <div className="text-xs font-bold text-slate-400 mt-4 mb-2 mr-2">{exam.examYear || "שונות"}</div>}
                      <button onClick={() => setSelectedExam(exam)} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex justify-between items-center">
                        <div className="flex items-center gap-3"><span className="font-bold text-slate-800 text-lg">{exam.title}</span></div>
                        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-medium">{exam.questions?.length} שאלות</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedExam && !mode && (
          <div className="animate-fade-in-up text-center pt-8">
            <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedExam.title}</h2>
            <p className="text-slate-500 mb-10">איך תרצה לפתור את המבחן?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button onClick={() => setMode('test')} className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all group text-right">
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">📝</div>
                <h3 className="text-xl font-bold text-slate-700">מצב מבחן</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">סימולציה מלאה. התשובות ייחשפו בסוף.</p>
              </button>
              <button onClick={() => setMode('practice')} className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-green-500 hover:shadow-xl transition-all group text-right">
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">🎯</div>
                <h3 className="text-xl font-bold text-slate-700">מצב תרגול</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">משוב מיידי אחרי כל שאלה.</p>
              </button>
            </div>
          </div>
        )}

        {selectedExam && mode && (
          <div className="animate-fade-in-up space-y-8">
             <div className="sticky top-16 z-30 bg-white/90 backdrop-blur p-4 rounded-b-xl shadow-sm flex justify-between items-center border-b border-slate-100">
               <div>
                 <span className="font-bold text-slate-700 block">{selectedCourse.name}</span>
                 <span className="text-xs text-slate-400">{selectedExam.title}</span>
               </div>
               <span className={`text-xs px-2 py-1 rounded font-bold ${mode==='test'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>
                 {mode==='test'?'מבחן':'תרגול'}
               </span>
             </div>

             {/* העברת המשתנה החדש isSubmitted לכרטיסיות */}
             {selectedExam.questions.map((q, i) => (
                <QuestionCard 
                  key={i} 
                  question={q} 
                  index={i} 
                  mode={mode} 
                  onAnswer={handleAnswerUpdate} 
                  isSubmitted={isSubmitted} 
                />
             ))}

             <div className="text-center pt-10 pb-10 flex flex-col items-center gap-4">
               {/* כפתור הגשה - מופיע רק במצב מבחן ורק אם טרם הוגש */}
               {mode === 'test' && !isSubmitted && (
                 <button onClick={calculateScore} className="bg-blue-600 text-white px-12 py-4 rounded-full font-black text-xl shadow-xl hover:bg-blue-700 transition hover:scale-105">
                   הגש מבחן וקבל ציון 🏆
                 </button>
               )}

               {/* כפתור הצגת ציון - מופיע רק אם כבר הוגש */}
               {isSubmitted && (
                 <button onClick={() => setShowScoreModal(true)} className="bg-green-100 text-green-700 px-8 py-3 rounded-full font-bold hover:bg-green-200 transition">
                   הצג שוב את הציון 📊
                 </button>
               )}
               
               {/* כפתור יציאה */}
               <button onClick={handleBackToList} className="text-slate-500 font-bold hover:text-slate-800 underline decoration-2 underline-offset-4">
                 חזור לרשימת המבחנים
               </button>
             </div>
          </div>
        )}
      </main>

      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden transform transition-all scale-100">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isPass ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'}`}></div>
            <div className="mt-4 mb-6">
              <div className="text-6xl mb-4 animate-bounce-short">{finalScore >= 90 ? '🏆' : isPass ? '😎' : '😐'}</div>
              <h2 className="text-3xl font-black text-slate-800">{finalScore >= 90 ? 'מדהים!' : isPass ? 'כל הכבוד!' : 'לא נורא...'}</h2>
              <p className="text-slate-500 mt-2">{isPass ? 'עברת את המבחן בהצלחה' : 'זה הזמן לחזור על החומר'}</p>
            </div>
            <div className={`relative w-40 h-40 mx-auto my-6 flex items-center justify-center rounded-full border-8 ${isPass ? 'border-green-100 text-green-600' : 'border-red-100 text-red-600'}`}>
               <div className="text-center"><span className="text-5xl font-black block">{finalScore}</span><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ציון סופי</span></div>
            </div>
            <div className="flex justify-center gap-8 mb-8 text-sm font-medium text-slate-500 bg-slate-50 p-4 rounded-2xl">
              <div className="text-center"><span className="block text-xl font-bold text-green-600">{correctCount}</span>תשובות נכונות</div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center"><span className="block text-xl font-bold text-red-500">{selectedExam.questions.length - correctCount}</span>טעויות</div>
            </div>
            <div className="space-y-3">
              <button onClick={handleBackToList} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition active:scale-95">חזור לרשימת המבחנים</button>
              <button onClick={() => setShowScoreModal(false)} className="w-full py-4 text-blue-600 font-bold hover:bg-blue-50 rounded-xl transition">סגור וצפה בטעויות שלך</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}