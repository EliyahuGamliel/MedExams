import { signInWithPopup, signOut } from "firebase/auth"; // הוספנו כאן את signOut
import { ref, get, set, update } from "firebase/database";
import { auth, googleProvider, db } from '../firebase'; 

export const loginWithGoogle = async () => {
    try {
        // 1. פותח את חלון ההתחברות של גוגל
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // 2. בודק אם המשתמש כבר קיים במסד הנתונים שלנו
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            // משתמש חדש לגמרי! נייצר לו פרופיל "סטודנט"
            await set(userRef, {
                email: user.email,
                displayName: user.displayName || 'משתמש ללא שם',
                photoURL: user.photoURL || '',
                role: 'student', // כולם מתחילים כסטודנטים
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            console.log("נוצר משתמש חדש!");
        } else {
            // משתמש קיים - רק נעדכן לו את תאריך ההתחברות האחרונה
            await update(userRef, {
                lastLogin: new Date().toISOString()
            });
            console.log("משתמש קיים התחבר.");
        }

        return user; // מחזירים את המשתמש כדי שהאפליקציה תדע שהוא מחובר
    } catch (error) {
        console.error("שגיאה בהתחברות:", error);
        throw error;
    }
};

// --- הפונקציה החדשה להתנתקות ---
export const logoutUser = async () => {
    try {
        await signOut(auth);
        console.log("המשתמש התנתק בהצלחה");
    } catch (error) {
        console.error("שגיאה בהתנתקות:", error);
    }
};