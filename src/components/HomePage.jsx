import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, get } from "firebase/database";
import QuestionCard from './QuestionCard';

// אייקונים
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 inline-block align-middle"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;

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
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [showAppendices, setShowAppendices] = useState(false);
  const [appendicesData, setAppendicesData] = useState(null);
  const [loadingAppendices, setLoadingAppendices] = useState(false);

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
      setIsSidebarOpen(false);
      setShowAppendices(false);
      setAppendicesData(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedExam, mode]);

  const handleOpenAppendices = async () => {
    setShowAppendices(true);
    if (!appendicesData) {
      setLoadingAppendices(true);
      try {
        const snapshot = await get(ref(db, `exam_appendices/${selectedExam.id}`));
        if (snapshot.exists()) {
          setAppendicesData(snapshot.val().fileData);
        } else {
          alert("לא נמצא קובץ נספחים (אולי נמחק מהשרת?)");
          setShowAppendices(false);
        }
      } catch (e) {
        console.error(e);
        alert("שגיאה בטעינת נספחים");
      } finally {
        setLoadingAppendices(false);
      }
    }
  };

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

  const handleAnswerUpdate = (questionIndex, status) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: status }));
  };

  const calculateScore = () => {
    const totalQuestions = selectedExam.questions.length;
    const perfectCount = Object.values(userAnswers).filter(val => val === 'perfect').length;
    const score = Math.round((perfectCount / totalQuestions) * 100);
    setFinalScore(score);
    setShowScoreModal(true);
    setIsSidebarOpen(true);
  };

  const handleBack = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mode) { setMode(null); setFinalScore(null); setShowScoreModal(false); }
    else if (selectedExam) setSelectedExam(null);
    else if (selectedCourse) setSelectedCourse(null);
    else if (selectedSemester) setSelectedSemester(null);
    else if (selectedYear) setSelectedYear(null);
  };

  const handleHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedYear(null); setSelectedSemester(null); setSelectedCourse(null); setSelectedExam(null);
    setMode(null); setFinalScore(null); setShowScoreModal(false);
  };

  const handleBackToList = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMode(null); setSelectedExam(null); setFinalScore(null); setShowScoreModal(false);
  };

  const scrollToQuestion = (index) => {
    const element = document.getElementById(`question-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const getSidebarButtonColor = (index) => {
    const status = userAnswers[index];
    const isSubmitted = finalScore !== null;

    if (mode === 'practice' || (mode === 'test' && !isSubmitted)) {
        if (status !== undefined && status !== null && status !== 'empty') {
            return "bg-blue-600 border-blue-600 text-white font-bold";
        }
        return "bg-slate-50 border-slate-200 text-slate-400";
    }

    if (mode === 'test' && isSubmitted) {
        if (status === 'perfect') return "bg-green-100 border-green-500 text-green-700 font-bold";
        if (status === 'partial') return "bg-orange-100 border-orange-500 text-orange-700 font-bold";
        if (status === 'wrong') return "bg-red-100 border-red-500 text-red-700 font-bold";
        return "bg-slate-200 border-slate-400 text-slate-600 font-bold border-2";
    }
    
    return "bg-slate-50 border-slate-200 text-slate-400";
  };

  const perfectCount = finalScore !== null ? Object.values(userAnswers).filter(v => v === 'perfect').length : 0;
  const isPass = finalScore >= 60;
  const isSubmitted = finalScore !== null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold text-xl">טוען מערכת...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans relative flex flex-col" dir="rtl">
      
      {showAppendices && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><PaperclipIcon /> נספחים למבחן</h3>
               <button onClick={() => setShowAppendices(false)} className="bg-slate-200 p-2 rounded-full hover:bg-slate-300 text-slate-600 transition"><CloseIcon /></button>
             </div>
             <div className="flex-1 bg-slate-100 relative">
                {loadingAppendices ? <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold">טוען קובץ...</div> : appendicesData ? <iframe src={`data:application/pdf;base64,${appendicesData}`} className="w-full h-full" title="Appendices" /> : <div className="p-10 text-center text-slate-400">לא ניתן להציג את הקובץ.</div>}
             </div>
           </div>
        </div>
      )}

      {selectedExam && mode && (
        <>
           <button onClick={() => setIsSidebarOpen(true)} className="fixed top-24 left-4 z-40 bg-white p-3 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-blue-600 transition"><MenuIcon /></button>
           {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity" />}
           <div className={`fixed inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 text-lg">ניווט מהיר</h3>
               <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-red-500 transition"><CloseIcon /></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4">
               <div className="grid grid-cols-4 gap-3">
                 {selectedExam.questions.map((_, i) => (
                   <button key={i} onClick={() => scrollToQuestion(i)} className={`aspect-square rounded-xl border flex items-center justify-center text-sm transition ${getSidebarButtonColor(i)}`}>{i + 1}</button>
                 ))}
               </div>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 pb-24">
               <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
                  <span>סה"כ שאלות: {selectedExam.questions.length}</span>
                  <span>נענו: {Object.keys(userAnswers).filter(k => userAnswers[k] && userAnswers[k] !== 'empty').length}</span>
               </div>
               {!isSubmitted && mode === 'test' && <button onClick={() => { setIsSidebarOpen(false); calculateScore(); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">הגש מבחן</button>}
             </div>
           </div>
        </>
      )}

      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 p-4 flex justify-between items-center shadow-sm h-16 shrink-0">
        <div className="w-24">{selectedYear && <button onClick={handleBack} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 hover:text-blue-600 font-bold text-sm transition"><BackIcon /> חזור</button>}</div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight cursor-pointer" onClick={handleHome}>Med<span className="text-blue-600">Exams</span></h1>
        <div className="w-24 flex justify-end">{selectedYear && <button onClick={handleHome} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><HomeIcon /></button>}</div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-8 flex-grow w-full">
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
             <div className="text-center mb-8"><span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{selectedYear} / {selectedSemester}</span><h2 className="text-2xl font-bold text-slate-800 mt-4">בחר קורס</h2></div>
             {relevantCourses.length === 0 ? <div className="text-center p-10 bg-white rounded-3xl border border-dashed text-slate-400">עדיין לא הוגדרו קורסים.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{relevantCourses.map(course => {
               const count = examsList.filter(e => e.course === course.name).length;
               return (
                 <button key={course.name} onClick={() => setSelectedCourse(course)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-lg transition text-right group">
                   <h3 className="text-lg font-bold text-slate-700 group-hover:text-blue-700">{course.name}</h3>
                   <p className="text-xs text-slate-400 mt-1">{count} מבחנים זמינים</p>
                 </button>
               );
             })}</div>}
          </div>
        )}

        {selectedCourse && !selectedExam && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">{selectedCourse.name}</h2>
            <p className="text-slate-500 text-center mb-8">בחר שחזור לתרגול</p>
            {relevantExams.length === 0 ? <p className="text-center text-slate-400">אין מבחנים.</p> : <div className="grid grid-cols-1 gap-3">{relevantExams.map((exam, index) => { const showYearHeader = index === 0 || relevantExams[index-1].examYear !== exam.examYear; return (<div key={exam.id}>{showYearHeader && <div className="text-xs font-bold text-slate-400 mt-4 mb-2 mr-2">{exam.examYear || "שונות"}</div>}<button onClick={() => setSelectedExam(exam)} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition flex justify-between items-center"><div className="flex items-center gap-3"><span className="font-bold text-slate-800 text-lg">{exam.title}</span>{exam.hasAppendices && <span className="bg-indigo-100 text-indigo-700 p-1 rounded"><PaperclipIcon /></span>}</div><span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-medium">{exam.questions?.length} שאלות</span></button></div>);})}</div>}
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
             <div className="sticky top-16 z-20 bg-white/90 backdrop-blur p-4 rounded-b-xl shadow-sm flex justify-between items-center border-b border-slate-100">
               <div><span className="font-bold text-slate-700 block">{selectedCourse.name}</span><span className="text-xs text-slate-400">{selectedExam.title}</span></div>
               <div className="flex items-center gap-2">{selectedExam.hasAppendices && <button onClick={handleOpenAppendices} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-indigo-200 transition"><PaperclipIcon /> נספחים</button>}<span className={`text-xs px-2 py-1 rounded font-bold ${mode==='test'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{mode==='test'?'מבחן':'תרגול'}</span></div>
             </div>

             {selectedExam.questions.map((q, i) => (
                <div key={i} id={`question-${i}`} className="scroll-mt-36">
                  <QuestionCard question={q} index={i} mode={mode} onAnswer={handleAnswerUpdate} isSubmitted={isSubmitted} examId={selectedExam.id} />
                </div>
             ))}

             <div className="text-center pt-10 pb-10 flex flex-col items-center gap-4">
               {mode === 'test' && !isSubmitted && <button onClick={calculateScore} className="bg-blue-600 text-white px-12 py-4 rounded-full font-black text-xl shadow-xl hover:bg-blue-700 transition">הגש מבחן 🏆</button>}
               {isSubmitted && <button onClick={() => setShowScoreModal(true)} className="bg-green-100 text-green-700 px-8 py-3 rounded-full font-bold">הצג שוב ציון 📊</button>}
               <button onClick={handleBackToList} className="text-slate-500 font-bold hover:text-slate-800 underline underline-offset-4">חזור לרשימת המבחנים</button>
             </div>
          </div>
        )}
      </main>

      {/* FOOTER - עם בקשת הטיפ בביט */}
      <footer className="w-full text-center py-8 text-slate-400 text-xs sm:text-sm bg-slate-50 mt-auto">
          <p className="mb-1 flex items-center justify-center gap-1">בפיתוח המערכת הושקעו זמן ומשאבים רבים <HeartIcon /></p>
          <p>נהניתם? מוזמנים לפרגן בביט: <span className="font-bold text-slate-600 select-all">053-2559635</span></p>
      </footer>

      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isPass ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'}`}></div>
            <div className="mt-4 mb-6"><div className="text-6xl mb-4">{finalScore >= 90 ? '🏆' : isPass ? '😎' : '😐'}</div><h2 className="text-3xl font-black text-slate-800">{finalScore >= 90 ? 'מדהים!' : isPass ? 'כל הכבוד!' : 'לא נורא...'}</h2></div>
            <div className={`relative w-40 h-40 mx-auto my-6 flex items-center justify-center rounded-full border-8 ${isPass ? 'border-green-100 text-green-600' : 'border-red-100 text-red-600'}`}><div className="text-center"><span className="text-5xl font-black block">{finalScore}</span><span className="text-xs font-bold text-slate-400 uppercase">ציון סופי</span></div></div>
            <div className="flex justify-center gap-8 mb-8 text-sm font-medium text-slate-500 bg-slate-50 p-4 rounded-2xl">
              <div className="text-center"><span className="block text-xl font-bold text-green-600">{perfectCount}</span>נכונות</div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center"><span className="block text-xl font-bold text-red-500">{selectedExam.questions.length - perfectCount}</span>טעויות/חוסר</div>
            </div>
            <div className="space-y-3">
              <button onClick={handleBackToList} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold">חזור לרשימת המבחנים</button>
              <button onClick={() => setShowScoreModal(false)} className="w-full py-4 text-blue-600 font-bold">סגור וצפה בטעויות</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}