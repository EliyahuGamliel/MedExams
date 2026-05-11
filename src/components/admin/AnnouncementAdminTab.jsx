import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { ref, get, set } from 'firebase/database';
import toast from 'react-hot-toast';

const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>;

export default function AnnouncementAdminTab() {
    const [text, setText] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrent = async () => {
            const snap = await get(ref(db, 'system_announcement'));
            if (snap.exists()) {
                const data = snap.val();
                setText(data.text || "");
                setIsActive(data.isActive || false);
            }
            setLoading(false);
        };
        fetchCurrent();
    }, []);

    const handleSave = async () => {
        try {
            await set(ref(db, 'system_announcement'), {
                text: text,
                isActive: isActive,
                updatedAt: new Date().toISOString()
            });
            toast.success("ההודעה עודכנה בהצלחה! 📢");
        } catch (error) {
            toast.error("שגיאה בעדכון ההודעה");
        }
    };

    if (loading) return <div className="text-center py-10 font-bold text-slate-500">טוען נתונים...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><MegaphoneIcon /></div>
                    <h3 className="text-xl font-bold text-slate-800">הודעה קופצת לאתר</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">תוכן ההודעה:</label>
                        <textarea 
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="למשל: בהצלחה בתקופת המבחנים שנה ג'!"
                            className="w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                        <input 
                            type="checkbox" 
                            checked={isActive} 
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" 
                        />
                        <div>
                            <div className="font-bold text-slate-800">הפעל מודעה</div>
                            <div className="text-xs text-slate-500">כאשר מסומן, ההודעה תקפוץ לסטודנטים בראש האתר</div>
                        </div>
                    </label>

                    <button 
                        onClick={handleSave}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        שמור ופרסם באתר
                    </button>
                </div>
            </div>
        </div>
    );
}