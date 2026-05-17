import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);       
    const [userData, setUserData] = useState(null); 
    const [loading, setLoading] = useState(true);   

    useEffect(() => {
        // משתנה שיחזיק את פונקציית הניתוק של מסד הנתונים
        let unsubscribeDb = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            // קודם כל: אם יש מאזין ישן ופתוח ל-DB, נסגור אותו מיד כדי למנוע כפילויות של תעבורה!
            if (unsubscribeDb) {
                unsubscribeDb();
                unsubscribeDb = null;
            }

            setUser(currentUser);

            if (currentUser) {
                const userRef = ref(db, `users/${currentUser.uid}`);
                
                // שומרים את פונקציית הניתוק ש-onValue מחזירה
                unsubscribeDb = onValue(userRef, (snapshot) => {
                    setUserData(snapshot.val());
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user data:", error);
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        // בלוק הניקוי הראשי של ה-useEffect
        return () => {
            unsubscribeAuth(); // מנתק את המאזין של ה-Auth
            if (unsubscribeDb) unsubscribeDb(); // מנתק את המאזין של ה-DB במידה ונשאר פתוח
        };
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