import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../firebase'; 
import { ref, set, remove, onValue } from 'firebase/database'; 
import { useAuth } from '../../context/AuthContext'; 
import toast from 'react-hot-toast';

// ייבוא הבאנר של מחולל המבחנים החכם
import ExamGeneratorBanner from './ExamGeneratorBanner'; 

const PaperclipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const CheckedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const UncheckedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;

export default function CourseExams({ examsList }) {
  const { courseName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedExamId = searchParams.get('exam');
  
  const selectedExamForMode = selectedExamId ? examsList.find(e => String(e.id) === String(selectedExamId)) : null;

  // --- סטייט למעקב אחרי המבחנים שבוצעו ---
  const [completedExams, setCompletedExams] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(true);

  // משיכת היסטוריית הסימונים של הסטודנט בזמן אמת
  useEffect(() => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }

    const examsRef = ref(db, `user_completed_exams/${user.uid}`);
    
    // onValue פותח "האזנה" חיה - מעדכן את המסך מיד כשיש שינוי ב-Firebase
    const unsubscribe = onValue(examsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCompletedExams(snapshot.val()); 
      } else {
        setCompletedExams({});
      }
      setLoadingHistory(false);
    }, (error) => {
      console.error("Error fetching completed exams:", error);
      setLoadingHistory(false);
    });

    // ניקוי ההאזנה בעת עזיבת המסך
    return () => unsubscribe();
  }, [user]);

  // פונקציית ה-Toggle לסימון מבחן כבוצע
  const handleToggleComplete = async (e, examId) => {
    e.stopPropagation(); 
    if (!user) return;

    const isCurrentlyDone = !!completedExams[examId];
    const examStatusRef = ref(db, `user_completed_exams/${user.uid}/${examId}`);

    try {
      if (isCurrentlyDone) {
        await remove(examStatusRef);
        // הסטייט יתעדכן אוטומטית בזכות ה-onValue
        toast.success("סימון המבחן בוטל");
      } else {
        await set(examStatusRef, true);
        toast.success("המבחן סומן כבוצע! 🎉");
      }
    } catch (error) {
      console.error("Error toggling exam status:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const relevantExams = examsList
      .filter(e => e.course === courseName)
      .sort((a, b) => {
          const yearA = a.examYear || "";
          const yearB = b.examYear || "";
          
          if (yearB !== yearA) {
              return yearB.localeCompare(yearA);
          }
          
          const getMoedPriority = (m) => {
              if (!m) return 99;
              if (m.includes("א'")) return 1;
              if (m.includes("ב'")) return 2;
              if (m.includes("ג'")) return 3;
              return 4;
          };
          return getMoedPriority(a.examMoed) - getMoedPriority(b.examMoed);
      });

  // --- תצוגת בחירת מצב (מבחן / תרגול) ---
  if (selectedExamForMode) {
    return (
      <div className="animate-fade-in-up text-center pt-8">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 transition-colors">{selectedExamForMode.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-10 transition-colors">איך נפתור את המבחן?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            <button 
                onClick={() => navigate(`/exam/${selectedExamForMode.id}/test`, { replace: true, state: { fromCourse: true } })} 
                className="relative bg-white dark:bg-dark-panel p-8 rounded-3xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all group text-right"
            >
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">📝</div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 transition-colors">מצב מבחן</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed transition-colors">סימולציה מלאה. התשובות ייחשפו בסוף.</p>
            </button>
            
            <button 
                onClick={() => navigate(`/exam/${selectedExamForMode.id}/practice`, { replace: true, state: { fromCourse: true } })} 
                className="relative bg-white dark:bg-dark-panel p-8 rounded-3xl shadow-sm border-2 border-slate-100 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-400 hover:shadow-xl transition-all group text-right"
            >
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">🎯</div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 transition-colors">מצב תרגול</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed transition-colors">משוב מיידי עם סימון כל תשובה.</p>
            </button>
        </div>
        <button onClick={() => navigate(-1)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold underline underline-offset-4 transition-colors">ביטול וחזרה לרשימה</button>
      </div>
    );
  }

  // --- תצוגת רשימת המבחנים בקורס ---
  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center transition-colors">{courseName}</h2>
      
      {/* --- באנר מחולל המבחנים החדש שלנו! --- */}
<ExamGeneratorBanner courseId={courseName} examsList={examsList} />

      <p className="text-slate-500 dark:text-slate-400 text-center mb-8 transition-colors">יש לבחור שחזור לתרגול</p>
      
      {relevantExams.length === 0 ? (
          <p className="text-center text-slate-400 dark:text-slate-500 transition-colors">אין מבחנים.</p>
      ) : (
          <div className="grid grid-cols-1 gap-3">
              {relevantExams.map((exam, index) => { 
                  const showYearHeader = index === 0 || relevantExams[index-1].examYear !== exam.examYear; 
                  const isDone = !!completedExams[exam.id];

                  return (
                      <div key={exam.id}>
                          {showYearHeader && (
                            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-4 mb-2 mr-2 transition-colors">
                              {exam.examYear || "שונות"}
                            </div>
                          )}
                          
                          <div 
                            onClick={() => setSearchParams({ exam: exam.id })} 
                            className={`w-full p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center flex-wrap gap-4 sm:gap-0 group ${
                              isDone 
                                ? 'border-green-200 dark:border-green-900 bg-green-50/20 dark:bg-green-950/10 hover:shadow-md' 
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-panel hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm'
                            }`}
                          >
                              <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`font-bold text-lg transition-all ${
                                    isDone 
                                      ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' 
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {exam.title}
                                  </span>
                                  
                                  {exam.isVerified === false && (
                                     <span className="bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 text-[10px] font-bold px-2 py-1 rounded-md mr-1 border border-orange-200 dark:border-orange-900 shadow-sm whitespace-nowrap transition-colors">
                                       🤖 AI (טרם עבר אימות אנושי)
                                     </span>
                                  )}
                                  
                                  {exam.hasAppendices && (
                                    <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 p-1 rounded transition-colors">
                                      <PaperclipIcon />
                                    </span>
                                  )}
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                  {/* כפתור הסימון הידני מתעדכן בזמן אמת */}
                                  {user ? (
                                    loadingHistory ? (
                                      <div className="w-4 h-4 border-2 border-slate-200 dark:border-slate-700 border-t-slate-400 dark:border-t-slate-500 rounded-full animate-spin"></div>
                                    ) : (
                                      <button
                                        onClick={(e) => handleToggleComplete(e, exam.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                                          isDone 
                                            ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 group/btn' 
                                            : 'bg-white dark:bg-dark-border text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                        }`}
                                      >
                                        {isDone ? (
                                          <>
                                            <span className="group-hover/btn:hidden flex items-center gap-1.5"><CheckedIcon /> בוצע</span>
                                            <span className="hidden group-hover/btn:inline">בטל סימון</span>
                                          </>
                                        ) : (
                                          <><UncheckedIcon /> סמן כבוצע</>
                                        )}
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] bg-slate-50 dark:bg-dark-bg text-slate-400 dark:text-slate-500 px-2.5 py-1 rounded-md transition-colors">
                                      התחבר לשמירת התקדמות
                                    </span>
                                  )}

                                  <span className="text-xs bg-slate-100 dark:bg-dark-border px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 font-medium shrink-0 transition-colors">
                                      {exam.questionCount ? `${exam.questionCount} שאלות` : 'כניסה למבחן'}
                                  </span>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  );
}