import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import AdminPage from './components/admin/AdminPage';

function App() {
  return (
    <Router>
      {/* מחקתי מכאן את ה-pb-24 שעשה את הרווח הענק */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;