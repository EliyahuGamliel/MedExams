import { useState, useEffect } from 'react';
import { db } from "../../firebase";
import { ref, onValue, set, update, remove } from "firebase/database";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

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

    // 2. בדיקת הרשאות במסד הנתונים
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

    // 3. טעינת כל המשתמשים (למנהל על)
    useEffect(() => {
        if (userData?.role === 'super_admin') {
            onValue(ref(db, 'users'), (snapshot) => {
                const data = snapshot.val();
                setAllUsers(data ? Object.entries(data).map(([uid, val]) => ({ uid, ...val })) : []);
            });
        }
    }, [userData]);

    // --- פעולות ---
    const handleGoogleLogin = async () => {
        try { await signInWithPopup(getAuth(), new GoogleAuthProvider()); } catch (error) { alert(error.message); }
    };

    const handleLogout = async () => {
        await signOut(getAuth());
        window.location.reload();
    };

    const handleUpdateUserRole = async (targetUid, newRole) => {
        try {
            await update(ref(db, `users/${targetUid}`), { role: newRole });
            if (newRole !== 'editor') await update(ref(db, `users/${targetUid}`), { allowed_years: null });
        } catch (e) { alert("שגיאה: " + e.message); }
    };

    const handleToggleUserYear = async (targetUid, year, currentStatus) => {
        try {
            const updates = {};
            updates[`users/${targetUid}/allowed_years/${year}`] = currentStatus ? null : true;
            await update(ref(db), updates);
        } catch (e) { alert("שגיאה: " + e.message); }
    };

    const handleDeleteUser = async (targetUid) => {
        if (!window.confirm("למחוק משתמש זה?")) return;
        try { await remove(ref(db, `users/${targetUid}`)); } catch (e) { alert("שגיאה: " + e.message); }
    };

    const canEditYear = (yearToCheck) => {
        if (!userData) return false;
        if (userData.role === 'super_admin') return true;
        if (userData.role === 'editor' && userData.allowed_years && userData.allowed_years[yearToCheck]) return true;
        return false;
    };

    // מחזירים את כל מה שה-UI יצטרך
    return {
        user, userData, isAdminLogin, authLoading, allUsers,
        handleGoogleLogin, handleLogout, handleUpdateUserRole,
        handleToggleUserYear, handleDeleteUser, canEditYear
    };
}