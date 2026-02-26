import React from 'react';

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

export default function UsersTab({ allUsers, currentUser, onUpdateRole, onToggleYear, onDeleteUser, studentYears }) {
    return (
        <div className="animate-fade-in space-y-4">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm text-orange-800 mb-4">
                💡 <b>איך זה עובד?</b> משתמשים חדשים שנרשמו יופיעו כאן כ-<b>Guest</b>. כאן תוכל לאשר אותם.
            </div>

            {allUsers.length === 0 ? (
                <div className="text-center text-slate-400">אין משתמשים נוספים.</div>
            ) : (
                <div className="space-y-3">
                    {allUsers.map(u => (
                        <div key={u.uid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b pb-2 mb-1">
                                <div>
                                    <div className="font-bold text-slate-700">{u.email}</div>
                                    <div className="text-xs text-slate-400 select-all font-mono">{u.uid}</div>
                                </div>
                                {u.uid !== currentUser.uid && (
                                    <button onClick={() => onDeleteUser(u.uid)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="מחק משתמש">
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-500 w-16">תפקיד:</span>
                                <select
                                    value={u.role || 'guest'}
                                    onChange={(e) => onUpdateRole(u.uid, e.target.value)}
                                    className={`flex-1 p-2 rounded-lg border text-sm font-bold ${u.role === 'guest' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-slate-50 border-slate-300'}`}
                                    disabled={u.uid === currentUser.uid}
                                >
                                    <option value="guest">Guest (ממתין לאישור ⏳)</option>
                                    <option value="editor">Editor (עורך)</option>
                                    <option value="super_admin">Super Admin (מנהל על)</option>
                                </select>
                            </div>
                            {u.role === 'editor' && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 mb-2">שנים מותרות לעריכה:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {studentYears.map(year => {
                                            const isAllowed = u.allowed_years && u.allowed_years[year];
                                            return (
                                                <label key={year} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition">
                                                    <input type="checkbox" checked={!!isAllowed} onChange={() => onToggleYear(u.uid, year, isAllowed)} className="rounded text-blue-600" />
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