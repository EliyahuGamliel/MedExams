import { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase'; 
import { ref, get, push, set, update, onValue } from "firebase/database"; 
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import QuestionCard from '../QuestionCard'; 
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const TimerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

export default function ExamTaking({ examsList }) {
  const { examId, mode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const selectedExam = examsList.find(e => e.id === examId);

  const [examQuestionsData, setExamQuestionsData] = useState([]); 
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [examImages, setExamImages] = useState({}); 
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
  const [eliminatedOptions, setEliminatedOptions] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_eliminated`);
      return saved ? JSON.parse(saved) : {};
  });
  const [modalStats, setModalStats] = useState(() => {
      const saved = localStorage.getItem(`${storageKey}_stats`);
      return saved ? JSON.parse(saved) : { total: 0, perfect: 0, mistakes: 0 };
  });

  // משיכת חבילת הגדרות הלימוד מ-Firebase לחיבור החוטים
  const [userSettings, setUserSettings] = useState({
    timerStrategy: 'stopwatch',
    testReviewMode: 'all',
    practiceShowAppeals: true,
    fontSize: 'normal',
    autoScroll: false,
    blankWarning: true
  });

  useEffect(() => {
    if (!user) return;
    const settingsRef = ref(db, `users/${user.uid}/settings`);
    onValue(settingsRef, (snap) => {
        if (snap.exists()) {
            setUserSettings(prev => ({...prev, ...snap.val()}));
        }
    }, { onlyOnce: true });
  }, [user]);

  // --- לוגיקת טיימר חכם ומדידת זמנים ---
  const [showTimerSetup, setShowTimerSetup] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState(60);
  const [timeRemaining, setTimeRemaining] = useState(null); 
  const [timeElapsed, setTimeElapsed] = useState(0);

  const isSubmitted = finalScore !== null;

  useEffect(() => {
    if (mode === 'test' && !isSubmitted) {
        if (userSettings.timerStrategy === 'manual') {
            const savedRem = localStorage.getItem(`${storageKey}_time_rem`);
            if (savedRem) setTimeRemaining(parseInt(savedRem));
            else setShowTimerSetup(true);
        } else if (userSettings.timerStrategy === 'stopwatch') {
            const savedElapsed = localStorage.getItem(`${storageKey}_time_elap`);
            if (savedElapsed) setTimeElapsed(parseInt(savedElapsed));
        }
    }
  }, [userSettings.timerStrategy, mode, isSubmitted, storageKey]);

  useEffect(() => {
    let interval;
    if (mode === 'test' && !isSubmitted && !showTimerSetup && userSettings.timerStrategy !== 'none') {
        interval = setInterval(() => {
            if (userSettings.timerStrategy === 'stopwatch') {
                setTimeElapsed(prev => {
                    const newTime = prev + 1;
                    localStorage.setItem(`${storageKey}_time_elap`, newTime);
                    return newTime;
                });
            } else if (userSettings.timerStrategy === 'manual' && timeRemaining !== null) {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    const newTime = prev - 1;
                    localStorage.setItem(`${storageKey}_time_rem`, newTime);
                    return newTime;
                });
            }
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, isSubmitted, showTimerSetup, userSettings.timerStrategy, timeRemaining, storageKey]);

  const handleStartManualTimer = () => {
      const seconds = manualTimeInput * 60;
      setTimeRemaining(seconds);
      localStorage.setItem(`${storageKey}_time_rem`, seconds);
      setShowTimerSetup(false);
  };

  const formatTime = (totalSeconds) => {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // פונקציית מעבר אוטומטי לשאלה הבאה (מצב זרימה)
  const handleCorrectAutoScroll = useCallback((currentIndex) => {
      if (mode === 'practice' && userSettings.autoScroll) {
          setTimeout(() => {
              const nextIndex = currentIndex + 1;
              const element = document.getElementById(`question-${nextIndex}`);
              if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
          }, 1000); // השהייה קלה של שנייה כדי לקבל משוב חזותי
      }
  }, [mode, userSettings.autoScroll]);

  useEffect(() => {
      localStorage.setItem(`${storageKey}_answers`, JSON.stringify(userAnswers));
      localStorage.setItem(`${storageKey}_score`, JSON.stringify(finalScore));
      localStorage.setItem(`${storageKey}_excluded`, JSON.stringify(userExcludedQuestions));
      localStorage.setItem(`${storageKey}_flagged`, JSON.stringify(flaggedQuestions));
      localStorage.setItem(`${storageKey}_eliminated`, JSON.stringify(eliminatedOptions));
      localStorage.setItem(`${storageKey}_stats`, JSON.stringify(modalStats));
  }, [userAnswers, finalScore, userExcludedQuestions, flaggedQuestions, eliminatedOptions, modalStats, storageKey]);

  const handleResetExam = () => {
      if (window.confirm("האם למחוק את כל התשובות ולהתחיל את המבחן מחדש?")) {
          Object.keys(localStorage).forEach(key => {
              if (key.includes(examId)) localStorage.removeItem(key);
          });

          setUserAnswers({});
          setFinalScore(null);
          setUserExcludedQuestions({});
          setFlaggedQuestions({});
          setEliminatedOptions({}); 
          setModalStats({ total: 0, perfect: 0, mistakes: 0 });
          setTimeElapsed(0);
          setTimeRemaining(null);
          
          if (userSettings.timerStrategy === 'manual') setShowTimerSetup(true);

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

  const toggleUserExclude = useCallback((index) => setUserExcludedQuestions(prev => ({ ...prev, [index]: !prev[index] })), []);
  const toggleFlag = useCallback((index) => setFlaggedQuestions(prev => ({ ...prev, [index]: !prev[index] })), []);
  
  const toggleEliminateOption = useCallback((questionIndex, optionIndex) => {
      setEliminatedOptions(prev => {
          const currentEliminated = prev[questionIndex] || [];
          if (currentEliminated.includes(optionIndex)) {
              return { ...prev, [questionIndex]: currentEliminated.filter(i => i !== optionIndex) };
          } else {
              return { ...prev, [questionIndex]: [...currentEliminated, optionIndex] };
          }
      });
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoadingQuestions(true);

    const questionsCacheKey = `cache_q_${selectedExam.id}`;
    const imagesCacheKey = `cache_img_${selectedExam.id}`;
    
    if (selectedExam.questions && selectedExam.questions.length > 0) {
        setExamQuestionsData(selectedExam.questions);
        setLoadingQuestions(false);
    } else {
        const cachedQuestions = sessionStorage.getItem(questionsCacheKey);
        if (cachedQuestions) {
            setExamQuestionsData(JSON.parse(cachedQuestions));
            setLoadingQuestions(false);
        } else {
            get(ref(db, `exam_contents/${selectedExam.id}`))
              .then((snapshot) => {
                  const data = snapshot.val() || [];
                  setExamQuestionsData(data);
                  sessionStorage.setItem(questionsCacheKey, JSON.stringify(data)); 
                  setLoadingQuestions(false);
              }).catch(err => {
                  console.error(err);
                  setLoadingQuestions(false);
              });
        }
    }

    const cachedImages = sessionStorage.getItem(imagesCacheKey);
    if (cachedImages) {
        setExamImages(JSON.parse(cachedImages));
    } else {
        get(ref(db, `exam_images/${selectedExam.id}`)).then((snapshot) => {
          const data = snapshot.val() || {};
          setExamImages(data);
          sessionStorage.setItem(imagesCacheKey, JSON.stringify(data)); 
        });
    }
  }, [selectedExam]);

  const handleReturnToCourse = () => {
    if (location.state?.fromCourse) navigate(-1);
    else navigate(`/course/${selectedExam.course}`, { replace: true });
  };

  if (!selectedExam) return <div className="text-center py-20 text-xl font-bold text-slate-500 dark:text-slate-400 transition-colors">המבחן לא נמצא 😕</div>;

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
      } fill `{ loadingAppendices(false); }`
    }
  };

  const handleAnswerUpdate = useCallback((questionIndex, status) => {
      setUserAnswers(prev => {
          if (prev[questionIndex] === status) return prev;
          return { ...prev, [questionIndex]: status };
      });
  }, []);

  const calculateScore = () => {
      const scorableQuestions = examQuestionsData.filter((q, index) => q.type !== 'open_ended' && !q.isCanceled && !userExcludedQuestions[index] );
      const totalScorable = scorableQuestions.length > 0 ? scorableQuestions.length : 1; 

      // --- יישום הגנת שאלות ריקות (blankWarning) ---
      const unansweredCount = scorableQuestions.filter((q) => {
          const originalIndex = examQuestionsData.indexOf(q);
          return !userAnswers[originalIndex] || userAnswers[originalIndex] === 'empty';
      }).length;

      if (userSettings.blankWarning && unansweredCount > 0) {
          if (!window.confirm(`⚠️ שים לב: נותרו עוד ${unansweredCount} שאלות ללא מענה במבחן. האם את/ה בטוח שברצונך להגיש את הבחינה כעת?`)) {
              return; // עצירת תהליך החישוב וההגשה
          }
      }

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
              const updates = {};
              updates[`user_results/${user.uid}/${selectedExam.id}`] = {
                  examId: selectedExam.id,
                  examName: selectedExam.title, 
                  courseName: selectedExam.course,
                  score: calculatedScore,
                  date: new Date().toISOString(),
                  totalQuestions: scorableQuestions.length,
                  correctAnswers: perfectCount,
                  status: 'completed'
              };
              updates[`user_completed_exams/${user.uid}/${selectedExam.id}`] = true;
              update(ref(db), updates);
              toast.success("הציון נשמר והמבחן סומן כהושלם! 🎉");
          } catch (error) { 
              console.error("שגיאה בשמירת תוצאת המבחן:", error); 
          }
      }

      setShowScoreModal(true);
      setIsSidebarOpen(true);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${selectedExam.course} - ${selectedExam.title}`; 
    window.print();
    setTimeout(() => document.title = originalTitle, 100);
  };

  const scrollToQuestion = (index) => {
    setTimeout(() => {
        const element = document.getElementById(`question-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
    }, 100);
  };

  const getSidebarButtonColor = (index) => {
    if (!examQuestionsData || !examQuestionsData[index]) return "bg-slate-50 dark:bg-dark-panel";
    const q = examQuestionsData[index];
    const status = userAnswers[index];
    
    if (userExcludedQuestions[index]) return "bg-slate-200 dark:bg-dark-border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 opacity-50";
    if (q.type === 'open_ended') return "bg-white dark:bg-dark-panel border-blue-200 dark:border-blue-900 text-blue-400 dark:text-blue-500 border-dashed border-2";
    if (mode === 'practice' || (mode === 'test' && !isSubmitted)) {
        if (status !== undefined && status !== null && status !== 'empty') return "bg-blue-600 border-blue-600 text-white font-bold";
        return "bg-slate-50 dark:bg-dark-panel/40 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500";
    }
    if (mode === 'test' && isSubmitted) {
        if (q.isCanceled) return "bg-slate-200 dark:bg-dark-border border-slate-400 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-bold";
        if (status === 'perfect') return "bg-green-100 dark:bg-green-950/30 border-green-500 dark:border-green-800 text-green-700 dark:text-green-400 font-bold";
        if (status === 'partial') return "bg-orange-100 dark:bg-orange-950/30 border-orange-500 dark:border-orange-800 text-orange-700 dark:text-orange-400 font-bold";
        if (status === 'wrong') return "bg-red-100 dark:bg-red-950/30 border-red-500 dark:border-red-800 text-red-700 dark:text-red-400 font-bold";
        return "bg-slate-200 dark:bg-dark-border border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold border-2";
    }
    return "bg-slate-50 dark:bg-dark-panel border-slate-200 dark:border-slate-700 text-slate-400";
  };

  const activeQuestionsForNav = examQuestionsData.filter((q, index) => q.type !== 'open_ended' && !q.isCanceled && !userExcludedQuestions[index]);
  const answeredActiveCount = activeQuestionsForNav.filter(q => {
      const idx = examQuestionsData.indexOf(q);
      return userAnswers[idx] && userAnswers[idx] !== 'empty';
  }).length;

  const isPass = finalScore >= 60;

  // יישום פילטור אסטרטגיית תחקור (testReviewMode === mistakes_only)
  const displayedQuestions = examQuestionsData
    .map((q, i) => ({ ...q, originalIndex: i }))
    .filter(q => {
        if (mode === 'test' && isSubmitted && userSettings.testReviewMode === 'mistakes_only') {
            if (userAnswers[q.originalIndex] === 'perfect' || q.isCanceled || userExcludedQuestions[q.originalIndex]) {
                return false;
            }
        }
        return true;
    });

  return (
    <div className="animate-fade-in-up pb-10">

      {showTimerSetup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-dark-panel rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border dark:border-slate-700">
             <div className="text-5xl mb-4">⏱️</div>
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">זמן למבחן</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">כמה דקות תרצה/י להקציב לסימולציה הנוכחית?</p>
             <input 
                 type="number" 
                 value={manualTimeInput} 
                 onChange={e => setManualTimeInput(Number(e.target.value))} 
                 min="1" 
                 max="300"
                 className="w-24 text-center p-3 text-2xl font-black bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
             <button onClick={handleStartManualTimer} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md">התחל מבחן</button>
           </div>
        </div>
      )}

      {showAppendices && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in print:hidden">
           <div className="bg-white dark:bg-dark-panel w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border dark:border-slate-700">
             <div className="p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-dark-bg flex justify-between items-center transition-colors">
               <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><PaperclipIcon /> נספחים למבחן</h3>
               <button onClick={() => setShowAppendices(false)} className="bg-slate-200 dark:bg-dark-border p-2 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"><CloseIcon /></button>
             </div>
             <div className="flex-1 bg-slate-100 dark:bg-dark-bg relative">
                {loadingAppendices ? <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">טוען קובץ...</div> : appendicesData ? <iframe src={appendicesData} className="w-full h-full dark:bg-dark-bg" title="Appendices" /> : <div className="p-10 text-center text-slate-400">לא ניתן להציג את הקובץ.</div>}
             </div>
           </div>
        </div>
      )}

      {!loadingQuestions && (
        <>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-20 left-4 z-[60] bg-white dark:bg-dark-panel p-3 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition transform hover:scale-105 print:hidden">
             {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
           </button>
           
           {isSidebarOpen && (
             <div onClick={() => setIsSidebarOpen(false)} className="fixed top-16 inset-x-0 bottom-0 bg-black/20 z-[40] backdrop-blur-sm transition-opacity print:hidden" />
           )}
           
           <div className={`fixed top-16 bottom-0 left-0 z-[50] w-72 bg-white dark:bg-dark-panel shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-r border-transparent dark:border-slate-700 print:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-dark-bg/50 transition-colors">
               <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">ניווט מהיר</h3>
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
             <div className="p-4 bg-slate-50 dark:bg-dark-bg/40 border-t border-slate-100 dark:border-slate-700 pb-24 transition-colors">
               <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">
                  <span>שאלות לציון: {activeQuestionsForNav.length}</span>
                  <span>נענו: {answeredActiveCount}</span>
               </div>
               {!isSubmitted && mode === 'test' && <button onClick={() => { setIsSidebarOpen(false); calculateScore(); }} className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition shadow-md">הגש מבחן</button>}
             </div>
           </div>
        </>
      )}

      <div className="sticky top-16 z-20 bg-white/90 dark:bg-dark-bg/90 backdrop-blur p-4 rounded-b-xl shadow-sm border-b border-slate-100 dark:border-slate-800/80 mb-8 transition-colors print:static print:bg-transparent print:shadow-none print:border-b-2 print:border-black print:pb-4 print:mb-12">
        <div className="flex flex-wrap gap-2 justify-between items-center">
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-200 block transition-colors print:text-black print:text-xl">{selectedExam.course}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 print:text-black print:text-base">{selectedExam.title}</span>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
              {mode === 'test' && userSettings.timerStrategy !== 'none' && !showTimerSetup && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 border transition-colors ${
                      userSettings.timerStrategy === 'manual' && timeRemaining <= 300 && !isSubmitted
                      ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 animate-pulse' 
                      : 'bg-white dark:bg-dark-panel border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                      <TimerIcon /> 
                      {userSettings.timerStrategy === 'stopwatch' ? formatTime(timeElapsed) : formatTime(timeRemaining || 0)}
                  </span>
              )}

              <button onClick={handlePrint} className="bg-slate-800 dark:bg-dark-border text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition flex items-center gap-1.5 shadow-sm" title="שמור כ-PDF">
                 <PdfIcon /> ייצא ל-PDF
              </button>

              {selectedExam.hasAppendices && <button onClick={handleOpenAppendices} className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900 transition flex items-center gap-1"><PaperclipIcon /> נספחים</button>}
              
              <button onClick={handleResetExam} className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition flex items-center gap-1.5 border border-red-100 dark:border-red-900" title="מחק את כל התשובות והתחל מחדש">
                 <RefreshIcon /> איפוס
              </button>
              <span className={`text-xs px-2 py-1.5 rounded font-bold transition-colors ${mode==='test'?'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300':'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'}`}>{mode==='test'?'מבחן':'תרגול'}</span>
            </div>
        </div>
      </div>

      {selectedExam.isVerified === false && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-900/60 text-orange-800 dark:text-orange-300 p-4 rounded-xl mb-6 text-sm flex items-start gap-4 shadow-sm animate-fade-in transition-colors print:hidden">
           <span className="text-3xl shrink-0">🤖</span>
           <div>
              <strong className="block mb-1 text-base text-orange-900 dark:text-orange-200">מבחן זה פוענח אוטומטית על ידי בינה מלאכותית (AI) וטרם עבר הגהה.</strong>
              יתכנו אי-דיוקים קלים בניסוח או בסימון התשובה הנכונה. אם נתקלת בשאלה לא הגיונית, נשמח שתשתמש/י בכפתור <b>"דווח על טעות"</b> המופיע בכל שאלה כדי לעזור לנו לתקן זאת!
           </div>
        </div>
      )}

      <div className="space-y-8 print:space-y-4">
        {loadingQuestions ? (
            <div className="text-center py-20 print:hidden"><div className="text-2xl animate-bounce mb-2">🤔</div><div className="text-slate-500 dark:text-slate-400 font-bold">טוען שאלות...</div></div>
        ) : examQuestionsData.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">לא נמצאו שאלות במבחן זה.</div>
        ) : displayedQuestions.length === 0 && userSettings.testReviewMode === 'mistakes_only' ? (
            <div className="text-center py-20 text-slate-500 dark:text-slate-400 animate-fade-in">
                <div className="text-5xl mb-4">🎉</div>
                כל הכבוד! לא נמצאו טעויות במבחן הזה.
            </div>
        ) : (
            displayedQuestions.map((q) => {
                const i = q.originalIndex;
                return (
                    <div key={`${i}-${resetTick}`} id={`question-${i}`} className="scroll-mt-48 print:break-inside-avoid print:pt-4">
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
                        eliminatedOptions={eliminatedOptions[i] || []}
                        onToggleEliminate={toggleEliminateOption}
                        resetTick={resetTick} 
                        userSettings={userSettings}
                        onCorrectAutoScroll={handleCorrectAutoScroll} // מסירת פונקציית הגלילה
                      />
                    </div>
                );
            })
        )}
      </div>

      {!loadingQuestions && displayedQuestions.length > 0 && (
        <div className="text-center pt-10 pb-10 flex flex-col items-center gap-4 print:hidden">
          {mode === 'test' && !isSubmitted && <button onClick={calculateScore} className="bg-blue-600 dark:bg-blue-500 text-white px-12 py-4 rounded-full font-black text-xl shadow-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition transform hover:scale-105">הגש מבחן 🏆</button>}
          {isSubmitted && <button onClick={() => setShowScoreModal(true)} className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-transparent dark:border-green-800 px-8 py-3 rounded-full font-bold transition-all">הצג שוב ציון 📊</button>}
          <button onClick={handleReturnToCourse} className="text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-4 transition-colors">חזור לרשימת המבחנים</button>
        </div>
      )}

      {showScoreModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden border border-transparent dark:border-slate-700">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isPass ? 'from-green-400 to-emerald-600' : 'from-red-400 to-rose-600'}`}></div>
            <div className="mt-4 mb-6">
              <div className="text-6xl mb-4">{finalScore >= 90 ? '🏆' : isPass ? '😎' : '😐'}</div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 transition-colors">{finalScore >= 90 ? 'מדהים!' : isPass ? 'כל הכבוד!' : 'לא נורא...'}</h2>
            </div>
            
            <div className={`relative w-40 h-40 mx-auto my-6 flex items-center justify-center rounded-full border-8 transition-colors ${isPass ? 'border-green-100 dark:border-green-950/40 text-green-600 dark:text-green-400' : 'border-red-100 dark:border-red-950/40 text-red-600 dark:text-red-400'}`}>
              <div className="text-center">
                <span className="text-5xl font-black block">{finalScore}</span>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wide">ציון סופי</span>
              </div>
            </div>
            
            <div className="flex justify-center gap-8 mb-8 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-dark-bg/50 p-4 rounded-2xl transition-colors">
              <div className="text-center"><span className="block text-xl font-bold text-green-600 dark:text-green-400">{modalStats.perfect}</span>נכונות</div>
              <div className="w-px bg-slate-200 dark:bg-dark-border"></div>
              <div className="text-center"><span className="block text-xl font-bold text-red-500 dark:text-red-400">{modalStats.mistakes}</span>טעויות/חוסר</div>
            </div>
            
            <div className="space-y-3">
              <button onClick={() => setShowScoreModal(false)} className="w-full py-4 bg-slate-800 dark:bg-dark-border text-white dark:text-slate-100 rounded-xl font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-md">סגור וצפה במבחן</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}