import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; 
import { ref, get } from 'firebase/database';

export default function AnnouncementPopup() {
    const [announcement, setAnnouncement] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = sessionStorage.getItem('announcementSeen');
        if (hasSeen) return;

        const fetchAnnouncement = async () => {
            try {
                const snap = await get(ref(db, 'system_announcement'));
                if (snap.exists()) {
                    const data = snap.val();
                    if (data.isActive && data.text) {
                        setAnnouncement(data.text);
                        setIsVisible(true);

                        const timer = setTimeout(() => {
                            closePopup();
                        }, 15000);
                        
                        return () => clearTimeout(timer);
                    }
                }
            } catch (error) {
                console.error("Error fetching announcement:", error);
            }
        };

        fetchAnnouncement();
    }, []);

    const closePopup = () => {
        setIsVisible(false);
        sessionStorage.setItem('announcementSeen', 'true');
    };

    if (!isVisible || !announcement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 sm:p-6 transition-all duration-500">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 sm:p-12 md:p-16 rounded-3xl shadow-2xl relative w-full max-w-3xl border border-white/20 flex flex-col items-center text-center max-h-[85vh] overflow-y-auto">
                
                <button 
                    onClick={closePopup}
                    className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/70 hover:text-white bg-black/10 hover:bg-black/30 rounded-full p-2 transition-transform hover:scale-110"
                    title="סגור"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                
                <div className="mb-6 p-4 bg-white/15 rounded-full shadow-inner">
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
</div>

                <div className="text-xl sm:text-2xl md:text-3xl font-bold whitespace-pre-wrap break-words leading-relaxed text-white drop-shadow-md w-full px-2 sm:px-6">
                    {announcement}
                </div>

            </div>
        </div>
    );
}