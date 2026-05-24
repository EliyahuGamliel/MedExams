import { useState, useEffect } from 'react';
import { db } from "../../firebase";
import { ref, onValue, set, update, remove, get } from "firebase/database"; 
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import toast from 'react-hot-toast'; 

export function useAdminAuth() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);

    // 1. האזנה אקטיבית למצב החיבור של המשתמש (Firebase Auth)
    useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) { 
                setUserData(null); 
                setIsAdminLogin(false); 
                setAuthLoading(false); 
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. קריאת אובייקט הגדרות המשתמש מה-DB ובדיקת תפקידים (Guest/Editor/Super Admin)
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
                } else { 
                    setIsAdminLogin(false); 
                }
            } else {
                // רישום ראשוני כמשתמש אורח אם אינו קיים במערכת
                await set(userRef, { 
                    email: user.email, 
                    role: 'guest', 
                    createdAt: new Date().toISOString() 
                });
            }
            setAuthLoading(false);
        });
        return () => unsubscribeDB();
    }, [user]);

    // 3. משיכת כל רשימת המשתמשים (לשימוש מנהל על בלבד) - קריאת get חד-פעמית חסכונית
    useEffect(() => {
        if (userData?.role === 'super_admin') {
            get(ref(db, 'users')).then((snapshot) => {
                const data = snapshot.val();
                setAllUsers(data ? Object.entries(data).map(([uid, val]) => ({ uid, ...val })) : []);
            }).catch(e => console.error("Error fetching users:", e));
        }
    }, [userData?.role]); 

    // --- פונקציות פעולה וניהול (Actions) ---
    
    // התחברות מהירה באמצעות Google
    const handleGoogleLogin = async () => {
        try { 
            await signInWithPopup(getAuth(), new GoogleAuthProvider()); 
        } catch (e) { 
            toast.error("שגיאה בהתחברות: " + e.message); 
        }
    };
            
    // התנתקות וריענון הדף לאיפוס זיכרון המטמון
    const handleLogout = async () => {
        await signOut(getAuth());
        window.location.reload();
    };

    // שינוי הרשאת תפקיד של משתמש קיים (וניקוי השנים המורשות אם הוסר מעריכה)
    const handleUpdateUserRole = async (targetUid, newRole) => {
        try {
            await update(ref(db, `users/${targetUid}`), { role: newRole });
            if (newRole !== 'editor') {
                await update(ref(db, `users/${targetUid}`), { allowed_years: null });
            }
            
            // עדכון אופטימי (Optimistic Update) מקומי על המסך לחוויה מהירה ללא ריענון
            setAllUsers(prev => prev.map(u => 
                u.uid === targetUid 
                    ? { ...u, role: newRole, allowed_years: newRole === 'editor' ? u.allowed_years : null } 
                    : u
            ));
            toast.success("תפקיד המשתמש עודכן בהצלחה!");
        } catch (e) { 
            toast.error("שגיאה בעדכון התפקיד: " + e.message); 
        }
    };

    // מתן/הסרת הרשאה לעורך עבור שנת לימוד ספציפית
    const handleToggleUserYear = async (targetUid, year, currentStatus) => {
        try {
            const updates = {};
            updates[`users/${targetUid}/allowed_years/${year}`] = currentStatus ? null : true;
            await update(ref(db), updates);

            // עדכון אופטימי מהיר ישירות על הסטייט של המסך
            setAllUsers(prev => prev.map(u => {
                if (u.uid === targetUid) {
                    const newYears = { ...(u.allowed_years || {}) };
                    if (currentStatus) delete newYears[year]; 
                    else newYears[year] = true;
                    return { ...u, allowed_years: newYears };
                }
                return u;
            }));
        } catch (e) { 
            toast.error("שגיאה בעדכון הרשאות שנה: " + e.message); 
        }
    };

    // מחיקת משתמש לצמיתות ממסד הנתונים של ניהול המשתמשים
    const handleDeleteUser = async (targetUid) => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק משתמש זה ממערכת הניהול?")) return;
        try { 
            await remove(ref(db, `users/${targetUid}`)); 
            
            // הסרה מקומית מהירה של המשתמש מהרשימה המוצגת באותו הרגע
            setAllUsers(prev => prev.filter(u => u.uid !== targetUid));
            toast.success("המשתמש נמחק בהצלחה");
        } catch (e) { 
            toast.error("שגיאה במחיקת המשתמש: " + e.message); 
        }
    };

    // פונקציית הגנה קלילה הבודקת אם לעורך הנוכחי מותר לגעת/לערוך מבחנים של שנה מסוימת
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