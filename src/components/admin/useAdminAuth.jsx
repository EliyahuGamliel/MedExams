import { useState, useEffect } from 'react';
import { db } from "../../firebase";
import { ref, onValue, set, update, remove, get } from "firebase/database"; // הוספנו את get!
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import toast from 'react-hot-toast'; 

export function useAdminAuth() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);

    // 1. האזנה למשתמש מחובר
    useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) { setUserData(null); setIsAdminLogin(false); setAuthLoading(false); }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. בדיקת הרשאות במסד הנתונים (כאן onValue זה בסדר כי זה רק אובייקט קטנצ'יק של המשתמש עצמו)
    useEffect(() => {
        if (!user) return;
        setAuthLoading(true);
        const userRef = ref(db, `users/${user.uid}`);
        const unsubscribeDB = onValue(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setUserData(data);
                if (data.role === 'super_admin' || data.role === 'editor') {
                    setIsAdminLogin(true);
                } else { setIsAdminLogin(false); }
            } else {
                await set(userRef, { email: user.email, role: 'guest', createdAt: new Date().toISOString() });
            }
            setAuthLoading(false);
        });
        return () => unsubscribeDB();
    }, [user]);

    // 3. טעינת כל המשתמשים (למנהל על) - הוחלף ל-get!
    useEffect(() => {
        // שמנו כתלות רק את ה-role כדי שזה לא ייקרא מחדש סתם
        if (userData?.role === 'super_admin') {
            get(ref(db, 'users')).then((snapshot) => {
                const data = snapshot.val();
                setAllUsers(data ? Object.entries(data).map(([uid, val]) => ({ uid, ...val })) : []);
            }).catch(e => console.error("Error fetching users:", e));
        }
    }, [userData?.role]); 

    // --- פעולות ---
    const handleGoogleLogin = async () => {
        try { await signInWithPopup(getAuth(), new GoogleAuthProvider()); } catch (e) { toast.error("שגיאה: " + e.message); }
    };
            
    const handleLogout = async () => {
        await signOut(getAuth());
        window.location.reload();
    };

    const handleUpdateUserRole = async (targetUid, newRole) => {
        try {
            await update(ref(db, `users/${targetUid}`), { role: newRole });
            if (newRole !== 'editor') await update(ref(db, `users/${targetUid}`), { allowed_years: null });
            
            // עדכון מקומי של המסך כדי לחסוך קריאה לשרת
            setAllUsers(prev => prev.map(u => 
                u.uid === targetUid 
                    ? { ...u, role: newRole, allowed_years: newRole === 'editor' ? u.allowed_years : null } 
                    : u
            ));
            toast.success("תפקיד עודכן בהצלחה");
        } catch (e) { toast.error("שגיאה: " + e.message); }
    };

    const handleToggleUserYear = async (targetUid, year, currentStatus) => {
        try {
            const updates = {};
            updates[`users/${targetUid}/allowed_years/${year}`] = currentStatus ? null : true;
            await update(ref(db), updates);

            // עדכון מקומי של המסך
            setAllUsers(prev => prev.map(u => {
                if (u.uid === targetUid) {
                    const newYears = { ...(u.allowed_years || {}) };
                    if (currentStatus) delete newYears[year]; 
                    else newYears[year] = true;
                    return { ...u, allowed_years: newYears };
                }
                return u;
            }));
        } catch (e) { toast.error("שגיאה: " + e.message); }
    };

    const handleDeleteUser = async (targetUid) => {
        if (!window.confirm("למחוק משתמש זה?")) return;
        try { 
            await remove(ref(db, `users/${targetUid}`)); 
            
            // מחיקה מקומית מהמסך
            setAllUsers(prev => prev.filter(u => u.uid !== targetUid));
            toast.success("משתמש נמחק");
        } catch (e) { toast.error("שגיאה: " + e.message); }
    };

    const canEditYear = (yearToCheck) => {
        if (!userData) return false;
        if (userData.role === 'super_admin') return true;
        if (userData.role === 'editor' && userData.allowed_years && userData.allowed_years[yearToCheck]) return true;
        return false;
    };

    return {
        user, userData, isAdminLogin, authLoading, allUsers,
        handleGoogleLogin, handleLogout, handleUpdateUserRole,
        handleToggleUserYear, handleDeleteUser, canEditYear
    };
}