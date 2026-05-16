import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext' // <-- הייבוא החדש

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* <-- עוטפים את האפליקציה במוח של המשתמשים */}
      <App />
    </AuthProvider>
  </StrictMode>,
)