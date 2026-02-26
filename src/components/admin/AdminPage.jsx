import { useState, useEffect } from 'react';

import UsersTab from './UsersTab';
import ReportsTab from './ReportsTab';
import ManageCoursesTab from './ManageCoursesTab';
import BulkUploadTab from './BulkUploadTab';
import ManageExamsTab from './ManageExamsTab';
import UploadTab from './UploadTab';
import { useAdminAuth } from './useAdminAuth';
import { useCoursesLogic } from './useCoursesLogic';
import { useExamsLogic } from './useExamsLogic';
import { useUploadLogic } from './useUploadLogic';

// --- אייקונים ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const BulkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2 14 8 20 8" /><path d="M2 15h10" /><path d="m9 18 3-3-3-3" /></svg>;

export default function AdminPage() {
  
  const studentYears = ["שנה א'", "שנה ב'", "שנה ג'", "שנה ד'"];
  const semesters = ["סמסטר א'", "סמסטר ב'"];
  const examYearsList = Array.from({ length: 16 }, (_, i) => (2012 + i).toString());
  const moedList = ["מועד א'", "מועד ב'", "מועד מיוחד"];

  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStudentYear, setSelectedStudentYear] = useState("שנה א'");
  const [selectedSemester, setSelectedSemester] = useState("סמסטר א'");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [status, setStatus] = useState('idle');


  const {
    user, userData, isAdminLogin, authLoading, allUsers,
    handleGoogleLogin, handleLogout, handleUpdateUserRole,
    handleToggleUserYear, handleDeleteUser, canEditYear
  } = useAdminAuth();

  const {
    examsList, setExamsList, reportsList, questionsEditorId, setQuestionsEditorId,
    examQuestions, setExamQuestions, showMissingImagesOnly, setShowMissingImagesOnly,
    newQuestionOptionsCount, setNewQuestionOptionsCount, editingExamId, setEditingExamId,
    newAppendicesFile, setNewAppendicesFile, handleDeleteExam, handleUpdateAppendices,
    openQuestionsEditor, handleAddQuestion, handleDeleteQuestion, handleAddOptionToQuestion,
    handleRemoveOptionFromQuestion, handleQuestionTextChange, saveQuestionText,
    handleOptionTextChange, saveOptionText, handleUploadQuestionImage,
    handleSetMainCorrect, handleToggleAppeal, handleToggleCancel,
    getQuestionStatusColor, handleResolveReport
  } = useExamsLogic(setStatus);

  const {
    coursesList, newCourseName, setNewCourseName,
    editingCourseOldData, setEditingCourseOldData,
    editCourseName, setEditCourseName,
    editCourseYear, setEditCourseYear,
    editCourseSemester, setEditCourseSemester,
    handleAddCourse, startEditingCourse, handleUpdateCourse
  } = useCoursesLogic(canEditYear, examsList, setStatus, selectedStudentYear, selectedSemester);

  const {
    examYear, setExamYear, examMoed, setExamMoed,
    file, setFile, appendicesFile, setAppendicesFile,
    parsingMode, setParsingMode, bulkFiles, setBulkFiles,
    debugLog, setDebugLog, handleUploadExam, handleBulkUpload
  } = useUploadLogic(canEditYear, coursesList, selectedStudentYear, selectedSemester, selectedCourseId, setStatus);

  const handleNavigateToReportedQuestion = (examId) => {
    setActiveTab('manage_exams');
    const examToEdit = examsList.find(e => e.id === examId);
    if (examToEdit) {
      setSelectedStudentYear(examToEdit.studentYear);
      setSelectedSemester(examToEdit.semester);
      setSelectedCourseId(examToEdit.courseId);
      setTimeout(() => openQuestionsEditor(examToEdit), 500);
    } else {
      alert("המבחן נמחק או שלא ניתן למצוא אותו.");
    }
  };

  // משתני תצוגה
  const availableCourses = coursesList[selectedStudentYear]?.[selectedSemester] ? Object.entries(coursesList[selectedStudentYear][selectedSemester]) : [];
  const filteredExamsForEdit = selectedCourseId ? examsList.filter(exam => exam.courseId === selectedCourseId) : [];
  const filteredQuestions = showMissingImagesOnly ? examQuestions.filter(q => q.imageNeeded && !q.hasImage) : examQuestions;

  // רינדור המסכים
  if (authLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">בודק הרשאות...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-2 text-center">כניסה למנהלים</h2>
          <p className="text-center text-slate-400 mb-8 text-sm">הזן פרטי גישה כדי לנהל את המאגר</p>
          <button onClick={handleGoogleLogin} className="w-full bg-white text-slate-700 border border-slate-300 p-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            התחבר עם Google
          </button>
          <div className="mt-6 text-center border-t pt-6"><button onClick={() => window.location.href = '/'} className="text-slate-400 font-bold text-sm hover:text-slate-600 transition">חזור לאתר הראשי</button></div>
        </div>
      </div>
    );
  }

  if (user && !isAdminLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center px-4">
        <div className="text-5xl">⏳</div>
        <h2 className="text-xl font-bold text-slate-700">הבקשה בבדיקה</h2>
        <p className="text-slate-500 max-w-md">שלום <b>{user.email}</b>,<br />חשבונך נוצר בהצלחה!<br />כעת עליך להמתין שמנהל ראשי יאשר את הרשאותיך.</p>
        <div className="flex gap-4 mt-4">
          <button onClick={handleLogout} className="text-slate-500 font-bold border border-slate-300 px-4 py-2 rounded-lg hover:bg-white transition">התנתק</button>
          <button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition">חזרה לאתר</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      {/* חלון קופץ - עריכת קורס */}
      {editingCourseOldData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-slate-800">עריכת קורס</h3>
            <input type="text" value={editCourseName} onChange={e => setEditCourseName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div><label className="block text-xs font-bold text-slate-500 mb-1">שנת לימוד:</label><select value={editCourseYear} onChange={e => setEditCourseYear(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">{studentYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">סמסטר:</label><select value={editCourseSemester} onChange={e => setEditCourseSemester(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300">{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateCourse} disabled={status === 'processing'} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">{status === 'processing' ? 'שומר...' : 'שמור שינויים'}</button>
              <button onClick={() => setEditingCourseOldData(null)} className="px-6 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center">
        <button onClick={() => window.location.href = '/'} className="text-slate-500 font-bold hover:text-blue-600 transition">חזור לאתר</button>
        <div className="flex items-center gap-3">
          {userData?.role === 'super_admin' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Super Admin</span>}
          {userData?.role === 'editor' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">עורך {userData.allowed_years ? Object.keys(userData.allowed_years).join(', ') : ''}</span>}
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">{user.email}</span>
          <button onClick={handleLogout} className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition">התנתק</button>
        </div>
      </div>

      <div className="p-8 max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-black mb-6 text-slate-800 text-center">ממשק ניהול</h2>

        {/* --- שורת הטאבים --- */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 overflow-x-auto">
          <button onClick={() => setActiveTab('upload')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'upload' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><UploadIcon /> העלאה</button>
          <button onClick={() => setActiveTab('bulk')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'bulk' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}><BulkIcon /> המונית</button>
          <button onClick={() => setActiveTab('manage_exams')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_exams' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}><EditIcon /> ניהול קיימים</button>
          <button onClick={() => setActiveTab('manage_courses')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'manage_courses' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}><PlusIcon /> קורסים</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'reports' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}><FlagIcon /> דיווחים {reportsList.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full mr-1">{reportsList.length}</span>}</button>
          {userData?.role === 'super_admin' && <button onClick={() => setActiveTab('users')} className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap transition ${activeTab === 'users' ? 'bg-white shadow text-orange-600' : 'text-slate-500'}`}><UsersIcon /> משתמשים</button>}
        </div>

        {/* --- טאב ניהול משתמשים --- */}
        {activeTab === 'users' && userData?.role === 'super_admin' && (
          <UsersTab
            allUsers={allUsers}
            currentUser={user}
            studentYears={studentYears}
            onUpdateRole={handleUpdateUserRole}
            onToggleYear={handleToggleUserYear}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {/* --- טאב דיווחים --- */}
        {activeTab === 'reports' && (
          <ReportsTab
            reportsList={reportsList}
            onResolveReport={handleResolveReport}
            onNavigateToQuestion={handleNavigateToReportedQuestion}
          />
        )}

        {/* --- טאב ניהול קורסים --- */}
        {activeTab === 'manage_courses' && (
          <ManageCoursesTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            newCourseName={newCourseName}
            setNewCourseName={setNewCourseName}
            onAddCourse={handleAddCourse}
            coursesList={coursesList}
            onEditCourse={startEditingCourse}
          />
        )}

        {/* --- טאב ניהול מבחנים (Lazy Load) --- */}
        {activeTab === 'manage_exams' && (
          <ManageExamsTab
            questionsEditorId={questionsEditorId}
            setQuestionsEditorId={setQuestionsEditorId}
            status={status}
            showMissingImagesOnly={showMissingImagesOnly}
            setShowMissingImagesOnly={setShowMissingImagesOnly}
            newQuestionOptionsCount={newQuestionOptionsCount}
            setNewQuestionOptionsCount={setNewQuestionOptionsCount}
            handleAddQuestion={handleAddQuestion}
            filteredQuestions={filteredQuestions}
            examQuestions={examQuestions}
            getQuestionStatusColor={getQuestionStatusColor}
            handleDeleteQuestion={handleDeleteQuestion}
            handleQuestionTextChange={handleQuestionTextChange}
            saveQuestionText={saveQuestionText}
            handleOptionTextChange={handleOptionTextChange}
            saveOptionText={saveOptionText}
            handleRemoveOptionFromQuestion={handleRemoveOptionFromQuestion}
            handleSetMainCorrect={handleSetMainCorrect}
            handleToggleAppeal={handleToggleAppeal}
            handleAddOptionToQuestion={handleAddOptionToQuestion}
            handleUploadQuestionImage={handleUploadQuestionImage}
            handleToggleCancel={handleToggleCancel}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            studentYears={studentYears}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            semesters={semesters}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            filteredExamsForEdit={filteredExamsForEdit}
            handleDeleteExam={handleDeleteExam}
            editingExamId={editingExamId}
            setEditingExamId={setEditingExamId}
            newAppendicesFile={newAppendicesFile}
            setNewAppendicesFile={setNewAppendicesFile}
            handleUpdateAppendices={handleUpdateAppendices}
            openQuestionsEditor={openQuestionsEditor}
          />
        )}

        {/* --- טאב העלאה המונית (Bulk Upload) --- */}
        {activeTab === 'bulk' && (
          <BulkUploadTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            parsingMode={parsingMode}
            setParsingMode={setParsingMode}
            bulkFiles={bulkFiles}
            setBulkFiles={setBulkFiles}
            status={status}
            handleBulkUpload={handleBulkUpload}
            debugLog={debugLog}
          />
        )}

        {/* --- טאב העלאה בודדת --- */}
        {activeTab === 'upload' && (
          <UploadTab
            studentYears={studentYears}
            semesters={semesters}
            selectedStudentYear={selectedStudentYear}
            setSelectedStudentYear={setSelectedStudentYear}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            availableCourses={availableCourses}
            examYear={examYear}
            setExamYear={setExamYear}
            examYearsList={examYearsList}
            examMoed={examMoed}
            setExamMoed={setExamMoed}
            moedList={moedList}
            parsingMode={parsingMode}
            setParsingMode={setParsingMode}
            file={file}
            setFile={setFile}
            appendicesFile={appendicesFile}
            setAppendicesFile={setAppendicesFile}
            handleUploadExam={handleUploadExam}
            status={status}
            debugLog={debugLog}
          />
        )}

      </div>
    </div>
  );
}