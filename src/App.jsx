import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import AdminPage from './components/AdminPage';

function App() {
  return (
    <Router>
      {/* הוספתי pb-24 (padding-bottom) כדי שהתוכן האחרון לא יוסתר על ידי הפוטר הקבוע */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24" dir="rtl">
        
        {/* הגדרת הנתיבים */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>

        {/* פוטר קבוע בתחתית המסך */}
        <footer className="fixed bottom-0 w-full p-4 text-center text-slate-400 bg-slate-50/90 backdrop-blur border-t border-slate-200 z-50">
          <div className="text-sm font-medium">
            היוצרים מבית <span className="font-black text-blue-600">malmalBOT</span>
          </div>
        </footer>
        
      </div>
    </Router>
  );
}

export default App;