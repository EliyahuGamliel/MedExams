import React, { useState, useMemo, useEffect } from 'react';

// אייקונים לממשק הניהול
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const NextPageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const PrevPageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

export default function UsersTab({ allUsers, currentUser, onUpdateRole, onToggleYear, onDeleteUser, studentYears }) {
    
    // --- States של הסינון, העימוד ותצוגת ההרשאות ---
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedUserId, setExpandedUserId] = useState(null); // ה-State של התפריט הנפתח
    const usersPerPage = 15;

    // איפוס עמוד נוכחי כשמשנים את סינון החיפוש/תפקיד
    useEffect(() => {
        setCurrentPage(1);
        setExpandedUserId(null); // סוגר תפריטים פתוחים בזמן סינון
    }, [searchTerm, roleFilter]);

    // --- פונקציית עזר לחילוץ ופירמוט התאריך להצגה ---
    const formatJoinDate = (user) => {
        let dateObj;
        if (user.createdAt?.seconds) {
            dateObj = new Date(user.createdAt.seconds * 1000);
        } else if (user.createdAt) {
            dateObj = new Date(user.createdAt);
        } else if (user.metadata?.creationTime) {
            dateObj = new Date(user.metadata.creationTime);
        } else {
            return "לא ידוע";
        }
        
        if (isNaN(dateObj.getTime())) return "לא ידוע";
        
        return dateObj.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    // --- חישוב משתמשים מסוננים ומיון ---
    const filteredUsers = useMemo(() => {
        const filtered = allUsers.filter(user => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = (user.email || "").toLowerCase().includes(searchLower) || 
                                  (user.uid || "").toLowerCase().includes(searchLower);
            const userRole = user.role || 'guest';
            const matchesRole = roleFilter === 'all' || userRole === roleFilter;
            
            return matchesSearch && matchesRole;
        });

        return filtered.sort((a, b) => {
            const getTimestamp = (u) => {
                if (u.createdAt?.seconds) return u.createdAt.seconds * 1000;
                if (u.createdAt) return new Date(u.createdAt).getTime();
                if (u.metadata?.creationTime) return new Date(u.metadata.creationTime).getTime();
                return 0;
            };
            return getTimestamp(b) - getTimestamp(a);
        });
    }, [allUsers, searchTerm, roleFilter]);

    // --- חישוב לעימוד ---
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

    return (
        <div className="animate-fade-in space-y-6 text-right">
            
            <div className="bg-orange-50 dark:bg-amber-950/20 p-4 rounded-xl border border-orange-100 dark:border-amber-900/40 text-sm text-orange-800 dark:text-amber-400 transition-colors duration-300">
                💡 <b>איך זה עובד?</b> משתמשים חדשים שנרשמו יופיעו כאן כ-<b>Guest</b> (ללא גישה). כאן תוכל להפוך אותם לעורכים ולהעניק הרשאות לשנים ספציפיות. המשתמשים החדשים ביותר מופיעים למעלה.
            </div>

            {/* סרגל כלים: חיפוש וסינון */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-dark-panel p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <SearchIcon />
                    </div>
                    <input 
                        type="text" 
                        placeholder="חפש לפי אימייל או מזהה משתמש (UID)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pr-10 p-2.5 transition-colors"
                    />
                </div>
                
                <div className="relative min-w-[200px]">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                        <FilterIcon />
                    </div>
                    <select 
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pr-10 p-2.5 font-bold transition-colors appearance-none cursor-pointer"
                    >
                        <option value="all">כל המשתמשים</option>
                        <option value="guest">אורחים (ממתינים לאישור)</option>
                        <option value="editor">עורכים פעילים</option>
                        <option value="super_admin">מנהלי על</option>
                    </select>
                </div>
            </div>

            {/* טבלת הנתונים */}
            {filteredUsers.length === 0 ? (
                <div className="text-center bg-white dark:bg-dark-panel border border-slate-200 dark:border-slate-700 rounded-xl p-10 text-slate-400 dark:text-slate-500 font-bold transition-colors">
                    {allUsers.length === 0 ? "אין משתמשים במערכת." : "לא נמצאו משתמשים התואמים לחיפוש."}
                </div>
            ) : (
                <div className="bg-white dark:bg-dark-panel border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-dark-bg/50 text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700 transition-colors">
                                <tr>
                                    <th className="px-6 py-4">משתמש</th>
                                    <th className="px-6 py-4 whitespace-nowrap">הצטרפות</th>
                                    <th className="px-6 py-4 w-48">תפקיד במערכת</th>
                                    <th className="px-6 py-4 w-64">הרשאות (שנות לימוד)</th>
                                    <th className="px-6 py-4 text-center whitespace-nowrap">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {currentUsers.map(u => (
                                    <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors align-top">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{u.email}</div>
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 select-all">{u.uid}</div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 mt-1">
                                            {formatJoinDate(u)}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <select
                                                value={u.role || 'guest'}
                                                onChange={(e) => onUpdateRole(u.uid, e.target.value)}
                                                className={`w-full p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                    u.role === 'guest' || !u.role
                                                        ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/40' 
                                                        : 'bg-slate-50 dark:bg-dark-bg border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                                                }`}
                                                disabled={u.uid === currentUser.uid}
                                            >
                                                <option value="guest">Guest (ממתין ⏳)</option>
                                                <option value="editor">Editor (עורך)</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        </td>
                                        
                                        {/* תצוגת ההרשאות החכמה (Dropdown / Accordion) */}
                                        <td className="px-6 py-4 relative">
                                            {u.role === 'editor' ? (
                                                <div className="flex flex-col">
                                                    {/* כפתור הראשי שפותח/סוגר */}
                                                    <button 
                                                        onClick={() => setExpandedUserId(prev => prev === u.uid ? null : u.uid)}
                                                        className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700"
                                                    >
                                                        <span>
                                                            {(() => {
                                                                const count = studentYears.filter(y => u.allowed_years?.[y]).length;
                                                                if (count === 0) return "ללא הרשאות (לחץ להגדרה)";
                                                                if (count === studentYears.length) return "כל השנים מאושרות";
                                                                return `${count} שנים מאושרות`;
                                                            })()}
                                                        </span>
                                                        <span className={`transition-transform duration-200 ${expandedUserId === u.uid ? 'rotate-180' : ''}`}>
                                                            <ChevronDownIcon />
                                                        </span>
                                                    </button>

                                                    {/* האזור הנפתח שמכיל את הצ'קבוקסים */}
                                                    {expandedUserId === u.uid && (
                                                        <div className="mt-2 p-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-slate-700 rounded-lg animate-fade-in grid grid-cols-1 gap-2 shadow-inner">
                                                            {studentYears.map(year => {
                                                                const isAllowed = u.allowed_years && u.allowed_years[year];
                                                                return (
                                                                    <label key={year} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md border cursor-pointer transition-all ${
                                                                        isAllowed 
                                                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold' 
                                                                            : 'bg-white dark:bg-dark-panel border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                    }`}>
                                                                        <span>{year}</span>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={!!isAllowed} 
                                                                            onChange={() => onToggleYear(u.uid, year, isAllowed)} 
                                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                                                                        />
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600 text-xs italic mt-2 block">לא רלוונטי לתפקיד זה</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            {u.uid !== currentUser.uid ? (
                                                <button 
                                                    onClick={() => onDeleteUser(u.uid)} 
                                                    className="inline-flex items-center justify-center p-2 mt-1 text-slate-400 hover:text-white hover:bg-red-500 dark:text-slate-500 dark:hover:bg-red-600 dark:hover:text-white rounded-lg transition-all" 
                                                    title="מחק משתמש לצמיתות"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            ) : (
                                                <span className="text-[10px] bg-slate-100 dark:bg-dark-border px-2 py-1 rounded text-slate-400 dark:text-slate-500 whitespace-nowrap mt-2 inline-block">זה אתה</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* פס ניווט עמודים */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-bg/50 transition-colors">
                            <span className="text-sm text-slate-500 dark:text-slate-400 mb-4 sm:mb-0">
                                מציג <span className="font-bold text-slate-800 dark:text-slate-200">{indexOfFirstUser + 1}</span> עד <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(indexOfLastUser, filteredUsers.length)}</span> מתוך <span className="font-bold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span> משתמשים
                            </span>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-white dark:bg-dark-panel border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <PrevPageIcon /> הקודם
                                </button>
                                
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-2">
                                    {currentPage} / {totalPages}
                                </span>

                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-white dark:bg-dark-panel border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    הבא <NextPageIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}