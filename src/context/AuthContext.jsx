import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase'; // ודא שהנתיב ל-firebase.js נכון
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

// יצירת ה-Context
const AuthContext = createContext();

// פונקציה לשימוש מהיר ב-Context בכל רכיב במערכת
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);       // פרטי המשתמש מפיירבייס (אימייל, UID)
    const [userData, setUserData] = useState(null); // נתוני הפרופיל מה-DB (תפקיד, שם)
    const [loading, setLoading] = useState(true);   // סטטוס טעינה ראשונית

    useEffect(() => {
        // מאזין לשינויים בסטטוס ההתחברות (Login/Logout)
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // אם המשתמש מחובר, נמשוך את נתוני הפרופיל שלו מה-Database
                const userRef = ref(db, `users/${currentUser.uid}`);
                
                // שימוש ב-onValue מאפשר עדכון חי (Realtime) אם מנהל שינה לו את התפקיד למשל
                onValue(userRef, (snapshot) => {
                    setUserData(snapshot.val());
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const value = {
        user,
        userData,
        loading,
        isAdmin: userData?.role === 'super_admin' || userData?.role === 'editor'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};