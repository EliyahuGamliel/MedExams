import React from 'react';

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function UsersTab({ allUsers, currentUser, onUpdateRole, onToggleYear, onDeleteUser, studentYears }) {
    return (
        <div className="animate-fade-in space-y-4 text-right">
            {/* תיבת המידע העליונה הותאמה לגווני זהב-עמוקים בלילה */}
            <div className="bg-orange-50 dark:bg-amber-950/20 p-4 rounded-xl border border-orange-100 dark:border-amber-900/40 text-sm text-orange-800 dark:text-amber-400 mb-4 transition-colors duration-300">
                💡 <b>איך זה עובד?</b> משתמשים חדשים שנרשמו יופיעו כאן כ-<b>Guest</b>. כאן תוכל לאשר אותם.
            </div>

            {allUsers.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-slate-500 py-10 font-bold transition-colors">אין משתמשים נוספים.</div>
            ) : (
                <div className="space-y-3">
                    {allUsers.map(u => (
                        /* כרטיס המשתמש הותאם לרקע וגבול כהים בלילה */
                        <div key={u.uid} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-3 transition-all duration-300">
                            
                            <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2 mb-1 transition-colors">
                                <div className="text-right">
                                    <div className="font-bold text-slate-700 dark:text-slate-200 transition-colors">{u.email}</div>
                                    <div className="text-xs text-slate-400 dark:text-slate-500 select-all font-mono tracking-wide transition-colors">{u.uid}</div>
                                </div>
                                {u.uid !== currentUser.uid && (
                                    <button onClick={() => onDeleteUser(u.uid)} className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="מחק משתמש">
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                            
                            {/* שדה בחירת התפקיד מותאם למצב לילה */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-16 shrink-0 transition-colors">תפקיד:</span>
                                <select
                                    value={u.role || 'guest'}
                                    onChange={(e) => onUpdateRole(u.uid, e.target.value)}
                                    className={`flex-1 p-2 rounded-lg border text-sm font-bold transition-colors ${
                                        u.role === 'guest' 
                                            ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/40' 
                                            : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                                    }`}
                                    disabled={u.uid === currentUser.uid}
                                >
                                    <option value="guest">Guest (ממתין לאישור ⏳)</option>
                                    <option value="editor">Editor (עורך)</option>
                                    <option value="super_admin">Super Admin (מנהל על)</option>
                                </select>
                            </div>
                            
                            {/* פאנל ניהול השנים המורשות (יוצג רק עבור עורכים) */}
                            {u.role === 'editor' && (
                                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 transition-colors">שנים מותרות לעריכה:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {studentYears.map(year => {
                                            const isAllowed = u.allowed_years && u.allowed_years[year];
                                            return (
                                                <label key={year} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-800 p-1 rounded text-slate-700 dark:text-slate-300 transition-all duration-150">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!isAllowed} 
                                                        onChange={() => onToggleYear(u.uid, year, isAllowed)} 
                                                        className="rounded text-blue-600 dark:text-blue-500 dark:bg-slate-800 dark:border-slate-600" 
                                                    />
                                                    {year}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}