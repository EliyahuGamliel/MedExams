import React from 'react';

// אייקון משתמש קטן שיוצג ליד שם המדווח
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;

export default function ReportsTab({ reportsList, onResolveReport, onNavigateToQuestion }) {
  return (
    <div className="space-y-4 animate-fade-in text-right">
      <h3 className="font-bold text-slate-800 dark:text-white text-xl mb-4 transition-colors">דיווחי סטודנטים ({reportsList.length})</h3>

      {reportsList.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-dark-panel/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 transition-colors">
          אין דיווחים כרגע. הכל תקין! 🎉
        </div>
      ) : (
        reportsList.map(report => {
          const examTitle = report.examId !== "unknown" ? report.examId.split('_').slice(0, -1).join(' ') : 'מבחן לא ידוע';
          return (
            <div key={report.id} className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-xl shadow-sm transition-all duration-300">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950 px-2 py-1 rounded transition-colors">
                  {examTitle} • שאלה {report.questionIndex + 1}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors">
                  {new Date(report.timestamp).toLocaleString('he-IL')}
                </span>
              </div>
              
              <p className="text-sm text-slate-700 dark:text-slate-200 font-bold mb-2 line-clamp-2 transition-colors">{report.questionText}</p>
              
              <div className="bg-white dark:bg-dark-bg p-3 rounded-lg border border-red-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300 mb-3 transition-colors">
                <span className="font-bold text-red-500 dark:text-red-400">דיווח: </span>{report.reportText}
              </div>

              {/* === התוספת שלנו: פרטי המדווח === */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-4 bg-white/60 dark:bg-dark-bg/50 w-fit px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
                <UserIcon />
                <span>דווח ע"י: </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {report.reporterName || 'משתמש אנונימי (או דיווח ישן)'}
                </span>
                {report.reporterEmail && <span dir="ltr">({report.reporterEmail})</span>}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigateToQuestion(report.examId)}
                  className="bg-white dark:bg-dark-panel text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                >
                  עבור לשאלה
                </button>
                <button
                  onClick={() => onResolveReport(report.id)}
                  className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 dark:hover:bg-green-900/50 transition-all border border-transparent dark:border-green-900/30 shadow-sm"
                >
                  סמן שטופל (מחק דיווח)
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  );
}