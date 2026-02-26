import React from 'react';

export default function ReportsTab({ reportsList, onResolveReport, onNavigateToQuestion }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="font-bold text-slate-800 text-xl mb-4">דיווחי סטודנטים ({reportsList.length})</h3>

      {reportsList.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          אין דיווחים כרגע. הכל תקין! 🎉
        </div>
      ) : (
        reportsList.map(report => {
          const examTitle = report.examId !== "unknown" ? report.examId.split('_').slice(0, -1).join(' ') : 'מבחן לא ידוע';
          return (
            <div key={report.id} className="bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold text-red-800 bg-red-100 px-2 py-1 rounded">
                  {examTitle} • שאלה {report.questionIndex + 1}
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(report.timestamp).toLocaleString('he-IL')}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-bold mb-2 line-clamp-2">{report.questionText}</p>
              <div className="bg-white p-3 rounded-lg border border-red-100 text-sm text-slate-600 mb-3">
                <span className="font-bold text-red-500">דיווח: </span>{report.reportText}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onNavigateToQuestion(report.examId)}
                  className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 transition"
                >
                  עבור לשאלה
                </button>
                <button
                  onClick={() => onResolveReport(report.id)}
                  className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-200 transition"
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