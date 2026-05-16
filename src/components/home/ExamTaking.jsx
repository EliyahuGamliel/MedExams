import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase'; 
import { ref, onValue, get, push, update, remove, set } from "firebase/database"; 
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import QuestionCard from '../QuestionCard'; 
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;

export default function ExamTaking({ examsList }) {
  const { examId, mode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const selectedExam = examsList.find(e => e.id === examId);

  const [examQuestionsData, setExamQuestionsData] = useState([]); 
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [examImages, setExamImages] = useState({}); 

  // הסטייט הקריטי שמודיע לכרטיסיות להתאפס!
  const [resetTick, setResetTick] = useState(0);

  const storageKey = `exam_state_${user ? user.uid : 'guest'}_${examId}_${mode}`;
  
  const [userAnswers, setUserAnswers] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_answers`);
      return saved ? JSON.parse(saved) : {};
  });
  const [finalScore, setFinalScore] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_score`);
      return saved ? JSON.parse(saved) : null;
  });
  const [userExcludedQuestions, setUserExcludedQuestions] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_excluded`);
      return saved ? JSON.parse(saved) : {};
  });
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_flagged`);
      return saved ? JSON.parse(saved) : {};
  });
  const [modalStats, setModalStats] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_stats`);
      return saved ? JSON.parse(saved) : { total: 0, perfect: 0, mistakes: 0 };
  });

  // משיכת גיבוי מהענן
  useEffect(() => {
      if (!user || !selectedExam) return;
      const stateRef = ref(db, `user_active_exams/${user.uid}/${examId}_${mode}`);
      get(stateRef).then((snapshot) => {
          if (snapshot.exists()) {
              const cloudData = snapshot.val();
              if (cloudData.answers) setUserAnswers(cloudData.answers);
              if (cloudData.score !== undefined) setFinalScore(cloudData.score);
              if (cloudData.excluded) setUserExcludedQuestions(cloudData.excluded);
              if (cloudData.flagged) setFlaggedQuestions(cloudData.flagged);
              if (cloudData.stats) setModalStats(cloudData.stats);
          }
      }).catch(err => console.error("שגיאה במשיכת מצב המבחן מהענן:", err));
  }, [user, examId, mode, selectedExam]);

  // שמירה משולבת
  useEffect(() => {
      localStorage.setItem(`${storageKey}_answers`, JSON.stringify(userAnswers));
      localStorage.setItem(`${storageKey}_score`, JSON.stringify(finalScore));
      localStorage.setItem(`${storageKey}_excluded`, JSON.stringify(userExcludedQuestions));
      localStorage.setItem(`${storageKey}_flagged`, JSON.stringify(flaggedQuestions));
      localStorage.setItem(`${storageKey}_stats`, JSON.stringify(modalStats));

      if (user) {
          const timeoutId = setTimeout(() => {
              const stateRef = ref(db, `user_active_exams/${user.uid}/${examId}_${mode}`);
              update(stateRef, {
                  answers: userAnswers,
                  score: finalScore,
                  excluded: userExcludedQuestions,
                  flagged: flaggedQuestions,
                  stats: modalStats,
                  lastUpdated: new Date().toISOString()
              }).catch(err => console.error("שגיאה בסנכרון לענן:", err));
          }, 1000); 
          return () => clearTimeout(timeoutId); 
      }
  }, [userAnswers, finalScore, userExcludedQuestions, flaggedQuestions, modalStats, storageKey, user, examId, mode]);

  // פונקציית האיפוס החדשה והאגרסיבית!
  const handleResetExam = async () => {
      if (window.confirm("האם למחוק את כל התשובות ולהתחיל את המבחן מחדש?")) {
          
          if (user) {
              try {
                  const stateRef = ref(db, `user_active_exams/${user.uid}/${examId}_${mode}`);
                  await remove(stateRef);
              } catch (error) {
                  console.error("שגיאה במחיקה מהענן:", error);
              }
          }

          // מחיקת כל זכר למבחן הזה מהזיכרון הלוקאלי
          Object.keys(localStorage).forEach(key => {
              if (key.includes(examId)) {
                  localStorage.removeItem(key);
              }
          });

          setUserAnswers({});
          setFinalScore(null);
          setUserExcludedQuestions({});
          setFlaggedQuestions({});
          setModalStats({ total: 0, perfect: 0, mistakes: 0 });

          // הטריגר שמעדכן את המסך באותו רגע
          setResetTick(prev => prev + 1);

          toast.success("המבחן אופס והלוח נקי! בהצלחה 🚀");
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAppendices, setShowAppendices] = useState(false);
  const [appendicesData, setAppendicesData] = useState(null);
  const [loadingAppendices, setLoadingAppendices] = useState(false);

  // הפונקציות עכשיו יציבות ולא גורמות לרינדור מחדש של כל המבחן!
  const toggleUserExclude = useCallback((index) => {
      setUserExcludedQuestions(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleFlag = useCallback((index) => {
      setFlaggedQuestions(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoadingQuestions(true);
    if (selectedExam.questions && selectedExam.questions.length > 0) {
        setExamQuestionsData(selectedExam.questions);
        setLoadingQuestions(false);
    } else {
        get(ref(db, `exam_contents/${selectedExam.id}`))
          .then((snapshot) => {
              setExamQuestionsData(snapshot.val() || []);
              setLoadingQuestions(false);
          }).catch(err => {
              console.error(err);
              setLoadingQuestions(false);
          });
    }

    const imagesRef = ref(db, `exam_images/${selectedExam.id}`);
    const unsub = onValue(imagesRef, (snapshot) => {
      setExamImages(snapshot.val() || {});
    });
    return () => unsub();
  }, [selectedExam]);

  const handleReturnToCourse = () => {
    if (location.state?.fromCourse) { navigate(-1); } 
    else { navigate(`/course/${selectedExam.course}`, { replace: true }); }
  };

  if (!selectedExam) return <div className="text-center py-20 text-xl font-bold text-slate-500">המבחן לא נמצא 😕</div>;

  const handleOpenAppendices = async () => {
    setShowAppendices(true);
    if (!appendicesData) {
      setLoadingAppendices(true);
      try {
        const snapshot = await get(ref(db, `exam_appendices/${selectedExam.id}`));
        if (snapshot.exists() && (snapshot.val().fileUrl || snapshot.val().fileData)) {
          setAppendicesData(snapshot.val().fileUrl || `data:application/pdf;base64,${snapshot.val().fileData}`); 
        } else {
          toast.error("לא נמצא קובץ נספחים");
          setShowAppendices(false);
        }
      } catch (e) {
        toast.error("שגיאה בטעינת נספחים");
        setShowAppendices(false);
      } finally { setLoadingAppendices(false); }
    }
  };

// --- התיקון שעוצר את הלולאה האינסופית ומשחרר את המערכת! ---
  const handleAnswerUpdate = useCallback((questionIndex, status) => {
      setUserAnswers(prev => {
          // הקסם כאן: אם הסטטוס של התשובה לא באמת השתנה, פשוט תעצור ואל תרנדר מחדש!
          if (prev[questionIndex] === status) return prev;
          return { ...prev, [questionIndex]: status };
      });
  }, []);

  const calculateScore = () => {
      const scorableQuestions = examQuestionsData.filter((q, index) => q.type !== 'open_ended' && !q.isCanceled && !userExcludedQuestions[index] );
      const totalScorable = scorableQuestions.length > 0 ? scorableQuestions.length : 1; 
      const perfectCount = scorableQuestions.filter((q) => {
          const originalIndex = examQuestionsData.indexOf(q);
          return userAnswers[originalIndex] === 'perfect';
      }).length;

      const actualMistakes = scorableQuestions.length - perfectCount;
      const calculatedScore = scorableQuestions.length === 0 ? 100 : Math.round((perfectCount / totalScorable) * 100);

      setFinalScore(calculatedScore);
      setModalStats({ total: scorableQuestions.length, perfect: perfectCount, mistakes: actualMistakes });

      if (user && finalScore === null) { 
          try {
              // שינוי קריטי: הנתיב עכשיו נגמר ב-selectedExam.id!
              const resultRef = ref(db, `user_results/${user.uid}/${selectedExam.id}`);
              
              // אנחנו משתמשים ב-set כדי לדרוס את הקובץ הקיים (אם יש כזה) במקום push
              set(resultRef, {
                  examId: selectedExam.id,
                  examName: selectedExam.title, 
                  courseName: selectedExam.course,
                  score: calculatedScore,
                  date: new Date().toISOString(), // תאריך של ההגשה האחרונה
                  totalQuestions: scorableQuestions.length,
                  correctAnswers: perfectCount
              });
              toast.success("הציון עודכן באזור האישי! 🎉");
          } catch (error) { 
              console.error("שגיאה בשמירת תוצאת המבחן:", error); 
          }
      }

      setShowScoreModal(true);
      setIsSidebarOpen(true);
  };

  const scrollToQuestion = (index) => {
    const element = document.getElementById(`question-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const getSidebarButtonColor = (index) => {
    if (!examQuestionsData || !examQuestionsData[index]) return "bg-slate-50";
    const q = examQuestionsData[index];
    const status = userAnswers[index];
    const isSubmitted = finalScore !== null;
    
    if (userExcludedQuestions[index]) return "bg-slate-200 border-slate-300 text-slate-400 opacity-50";
    if (q.type === 'open_ended') return "bg-white border-blue-200 text-blue-400 border-dashed border-2";
    if (mode === 'practice' || (mode === 'test' && !isSubmitted)) {
        if (status !== undefined && status !== null && status !== 'empty') return "bg-blue-600 border-blue-600 text-white font-bold";
        return "bg-slate-50 border-slate-200 text-slate-400";
    }
    if (mode === 'test' && isSubmitted) {
        if (q.isCanceled) return "bg-slate-200 border-slate-400 text-slate-500 font-bold";
        if (status === 'perfect') return "bg-green-100 border-green-500 text-green-700 font-bold";
        if (status === 'partial') return "bg-orange-100 border-orange-500 text-orange-700 font-bold";
        if (status === 'wrong') return "bg-red-100 border-red-500 text-red-700 font-bold";
        return "bg-slate-200 border-slate-400 text-slate-600 font-bold border-2";
    }
    return "bg-slate-50 border-slate-200 text-slate-400";
  };

  const activeQuestionsForNav = examQuestionsData.filter((q, index) => q.type !== 'open_ended' && !q.isCanceled && !userExcludedQuestions[index]);
  const answeredActiveCount = activeQuestionsForNav.filter(q => {
      const idx = examQuestionsData.indexOf(q);
      return userAnswers[idx] && userAnswers[idx] !== 'empty';
  }).length;

  const isPass = finalScore >= 60;
  const isSubmitted = finalScore !== null;

  return (
    <div className="animate-fade-in-up pb-10">
      
      {showAppendices && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><PaperclipIcon /> נספחים למבחן</h3>
               <button onClick={() => setShowAppendices(false)} className="bg-slate-200 p-2 rounded-full hover:bg-slate-300 text-slate-600 transition"><CloseIcon /></button>
             </div>
             <div className="flex-1 bg-slate-100 relative">
                {loadingAppendices ? <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold">טוען קובץ...</div> : appendicesData ? <iframe src={appendicesData} className="w-full h-full" title="Appendices" /> : <div className="p-10 text-center text-slate-400">לא ניתן להציג את הקובץ.</div>}
             </div>
           </div>
        </div>
      )}

      {!loadingQuestions && (
        <>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-20 left-4 z-[60] bg-white p-3 rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-blue-600 transition transform hover:scale-105">
             {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
           </button>
           
           {isSidebarOpen && (
             <div onClick={() => setIsSidebarOpen(false)} className="fixed top-16 inset-x-0 bottom-0 bg-black/20 z-[40] backdrop-blur-sm transition-opacity" />
           )}
           
           <div className={`fixed top-16 bottom-0 left-0 z-[50] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 text-lg">ניווט מהיר</h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4">
               <div className="grid grid-cols-4 gap-3">
                 {examQuestionsData.map((_, i) => (
                   <button key={i} onClick={() => scrollToQuestion(i)} className={`relative overflow-hidden aspect-square rounded-xl border flex items-center justify-center text-sm transition ${getSidebarButtonColor(i)}`}>
                     {i + 1}
                     {flaggedQuestions[i] && (
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-l-[16px] border-t-red-500 border-l-transparent"></div>
                     )}
                   </button>
                 ))}
               </div>
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 pb-24">
               <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
                  <span>שאלות לציון: {activeQuestionsForNav.length}</span>
                  <span>נענו: {answeredActiveCount}</span>
               </div>
               {!isSubmitted && mode === 'test' && <button onClick={() => { setIsSidebarOpen(false); calculateScore(); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">הגש מבחן</button>}
             </div>
           </div>
        </>
      )}

      <div className="sticky top-16 z-20 bg-white/90 backdrop-blur p-4 rounded-b-xl shadow-sm flex flex-wrap gap-2 justify-between items-center border-b border-slate-100 mb-8">
        <div>
          <span className="font-bold text-slate-700 block">{selectedExam.course}</span>
          <span className="text-xs text-slate-400">{selectedExam.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedExam.hasAppendices && <button onClick={handleOpenAppendices} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-200 transition flex items-center gap-1"><PaperclipIcon /> נספחים</button>}
          
          <button onClick={handleResetExam} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-red-100 transition flex items-center gap-1.5 border border-red-100" title="מחק את כל התשובות והתחל מחדש">
             <RefreshIcon /> איפוס
          </button>
          <span className={`text-xs px-2 py-1.5 rounded font-bold ${mode==='test'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}`}>{mode==='test'?'מבחן':'תרגול'}</span>
        </div>
      </div>

      {selectedExam.isVerified === false && (
        <div className="bg-orange-50 border-2 border-orange-200 text-orange-800 p-4 rounded-xl mb-6 text-sm flex items-start gap-4 shadow-sm animate-fade-in">
           <span className="text-3xl shrink-0">🤖</span>
           <div>
              <strong className="block mb-1 text-base text-orange-900">מבחן זה פוענח אוטומטית על ידי בינה מלאכותית (AI) וטרם עבר הגהה.</strong>
              יתכנו אי-דיוקים קלים בניסוח או בסימון התשובה הנכונה. אם נתקלת בשאלה לא הגיונית, נשמח שתשתמש/י בכפתור <b>"דווח על טעות"</b> המופיע בכל שאלה כדי לעזור לנו לתקן זאת!
           </div>
        </div>
      )}

      <div className="space-y-8">
        {loadingQuestions ? (
            <div className="text-center py-20"><div className="text-2xl animate-bounce mb-2">🤔</div><div className="text-slate-500 font-bold">טוען שאלות...</div></div>
        ) : examQuestionsData.length === 0 ? (
            <div className="text-center py-10 text-slate-400">לא נמצאו שאלות במבחן זה.</div>
        ) : (
            examQuestionsData.map((q, i) => (
                <div key={`${i}-${resetTick}`} id={`question-${i}`} className="scroll-mt-36">
                  <QuestionCard 
                    question={q} 
                    index={i} 
                    mode={mode} 
                    onAnswer={handleAnswerUpdate} 
                    isSubmitted={isSubmitted} 
                    examId={selectedExam.id} 
                    imageUrl={q.imageUrl || examImages[i]} 
                    isFlagged={!!flaggedQuestions[i]}
onToggleFlag={toggleFlag}
  onToggleUserExclude={toggleUserExclude}
                      isUserExcluded={!!userExcludedQuestions[i]}

                    resetTick={resetTick} 
                  />
                </div>
            ))
        )}
      </div>

      {!loadingQuestions && examQuestionsData.length > 0 && (
        <div className="text-center pt-10 pb-10 flex flex-col items-center gap-4">
        {mode === 'test' && !isSubmitted && <button onClick={calculateScore} className="bg-blue-600 text-white px-12 py-4 rounded-full font-black text-xl shadow-xl hover:bg-blue-700 transition">הגש מבחן 🏆</button>}
        {isSubmitted && <button onClick={() => setShowScoreModal(true)} className="bg-green-100 text-green-700 px-8 py-3 rounded-full font-bold">הצג שוב ציון 📊</button>}
        <button onClick={handleReturnToCourse} className="text-slate-500 font-bold hover:text-slate-800 underline underline-offset-4">חזור לרשימת המבחנים</button>
        </div>
      )}

      {showScoreModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isPass ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'}`}></div>
            <div className="mt-4 mb-6"><div className="text-6xl mb-4">{finalScore >= 90 ? '🏆' : isPass ? '😎' : '😐'}</div><h2 className="text-3xl font-black text-slate-800">{finalScore >= 90 ? 'מדהים!' : isPass ? 'כל הכבוד!' : 'לא נורא...'}</h2></div>
            <div className={`relative w-40 h-40 mx-auto my-6 flex items-center justify-center rounded-full border-8 ${isPass ? 'border-green-100 text-green-600' : 'border-red-100 text-red-600'}`}><div className="text-center"><span className="text-5xl font-black block">{finalScore}</span><span className="text-xs font-bold text-slate-400 uppercase">ציון סופי</span></div></div>
            <div className="flex justify-center gap-8 mb-8 text-sm font-medium text-slate-500 bg-slate-50 p-4 rounded-2xl">
              <div className="text-center"><span className="block text-xl font-bold text-green-600">{modalStats.perfect}</span>נכונות</div>
              <div className="w-px bg-slate-200"></div>
              <div className="text-center"><span className="block text-xl font-bold text-red-500">{modalStats.mistakes}</span>טעויות/חוסר</div>
            </div>
            <div className="space-y-3">
              <button onClick={() => setShowScoreModal(false)} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold">סגור וצפה בטעויות</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}