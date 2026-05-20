import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../firebase'; // ודא שהנתיב ל-firebase.js תקין אצלך
import { ref, get, set, remove } from 'firebase/database';
import { useAuth } from '../../context/AuthContext'; // ודא שהנתיב תקין
import toast from 'react-hot-toast';

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

  // משיכת היסטוריית הסימונים של הסטודנט
  useEffect(() => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }

    const fetchCompletedExams = async () => {
      try {
        const snapshot = await get(ref(db, `user_completed_exams/${user.uid}`));
        if (snapshot.exists()) {
          setCompletedExams(snapshot.val()); 
        }
      } catch (error) {
        console.error("Error fetching completed exams:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchCompletedExams();
  }, [user]);

  // פונקציית ה-Toggle לסימון מבחן כבוצע
  const handleToggleComplete = async (e, examId) => {
    e.stopPropagation(); // קריטי: מונע את פתיחת מסך המבחן בלחיצה על כפתור הסימון
    if (!user) return;

    const isCurrentlyDone = !!completedExams[examId];
    const examStatusRef = ref(db, `user_completed_exams/${user.uid}/${examId}`);

    try {
      if (isCurrentlyDone) {
        await remove(examStatusRef);
        setCompletedExams(prev => {
          const updated = { ...prev };
          delete updated[examId];
          return updated;
        });
        toast.success("סימון המבחן בוטל");
      } else {
        await set(examStatusRef, true);
        setCompletedExams(prev => ({ ...prev, [examId]: true }));
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

  if (selectedExamForMode) {
    return (
      <div className="animate-fade-in-up text-center pt-8">
        <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedExamForMode.title}</h2>
        <p className="text-slate-500 mb-10">איך נפתור את המבחן?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
            <button 
                onClick={() => navigate(`/exam/${selectedExamForMode.id}/test`, { replace: true, state: { fromCourse: true } })} 
                className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all group text-right"
            >
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">📝</div>
                <h3 className="text-xl font-bold text-slate-700">מצב מבחן</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">סימולציה מלאה. התשובות ייחשפו בסוף.</p>
            </button>
            
            <button 
                onClick={() => navigate(`/exam/${selectedExamForMode.id}/practice`, { replace: true, state: { fromCourse: true } })} 
                className="relative bg-white p-8 rounded-3xl shadow-sm border-2 border-slate-100 hover:border-green-500 hover:shadow-xl transition-all group text-right"
            >
                <div className="text-4xl mb-4 group-hover:scale-110 transition transform">🎯</div>
                <h3 className="text-xl font-bold text-slate-700">מצב תרגול</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">משוב מיידי עם סימון כל תשובה.</p>
            </button>
        </div>
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 font-bold underline underline-offset-4">ביטול וחזרה לרשימה</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">{courseName}</h2>
      <p className="text-slate-500 text-center mb-8">יש לבחור שחזור לתרגול</p>
      
      {relevantExams.length === 0 ? (
          <p className="text-center text-slate-400">אין מבחנים.</p>
      ) : (
          <div className="grid grid-cols-1 gap-3">
              {relevantExams.map((exam, index) => { 
                  const showYearHeader = index === 0 || relevantExams[index-1].examYear !== exam.examYear; 
                  const isDone = !!completedExams[exam.id];

                  return (
                      <div key={exam.id}>
                          {showYearHeader && <div className="text-xs font-bold text-slate-400 mt-4 mb-2 mr-2">{exam.examYear || "שונות"}</div>}
                          
                          {/* הפכנו את המעטפת ל-div לחיץ כדי לאפשר כפתור פנימי */}
                          <div 
                            onClick={() => setSearchParams({ exam: exam.id })} 
                            className={`w-full p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center flex-wrap gap-4 sm:gap-0 group ${
                              isDone ? 'border-green-200 bg-green-50/20 hover:shadow-md' : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm'
                            }`}
                          >
                              <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`font-bold text-lg transition-colors ${isDone ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                    {exam.title}
                                  </span>
                                  
                                  {exam.isVerified === false && (
                                     <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-md mr-1 border border-orange-200 shadow-sm whitespace-nowrap">
                                       🤖 AI (טרם עבר אימות אנושי)
                                     </span>
                                  )}
                                  
                                  {exam.hasAppendices && <span className="bg-indigo-100 text-indigo-700 p-1 rounded"><PaperclipIcon /></span>}
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                  {/* כפתור הסימון הידני (רק לרשומים) */}
                                  {user ? (
                                    loadingHistory ? (
                                      <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
                                    ) : (
                                      <button
                                        onClick={(e) => handleToggleComplete(e, exam.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                                          isDone 
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 group/btn' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                                    <span className="text-[10px] bg-slate-50 text-slate-400 px-2.5 py-1 rounded-md">התחבר לשמירת התקדמות</span>
                                  )}

                                  <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-medium shrink-0">
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