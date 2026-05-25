import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/home/HomePage';
import AdminPage from './components/admin/AdminPage';
import { Toaster } from 'react-hot-toast';
import AnnouncementPopup from './components/home/AnnouncementPopup'; // ודא שהנתיב תואם לאיפה ששמרת את הקובץ

function App() {
  return (
    <Router>
<div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300" dir="rtl">        
        {/* --- הנה המודעה שלנו! היא תצוץ מעל הכל --- */}
        <AnnouncementPopup />

        <Toaster 
          position="top-center" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              fontWeight: 'bold',
              direction: 'rtl'
            },
          }} 
        />

        <Routes>
          <Route path="/*" element={<HomePage />} />
          <Route path="/admin/*" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;