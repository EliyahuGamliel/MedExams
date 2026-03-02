# 🩺 MedExams

MedExams is a comprehensive, AI-powered web platform built with React and Vite, designed to manage, parse, and practice academic and medical exams. The system leverages Google's Gemini AI to automatically extract questions from PDF exams and provides an advanced Admin Dashboard for seamless content management.

## ✨ Key Features

### 👨‍💻 Admin Panel (Dashboard)
* **AI-Powered Parsing:** Upload exam PDFs and let Gemini AI automatically extract questions, multiple-choice options, and correct answers.
* **Bulk Upload:** Scan and process multiple exams in a single batch with real-time progress indicators.
* **Advanced Question Editor:** * Edit question text and options.
  * Support for multiple correct answers and cloze (fill-in-the-blank) questions.
  * Upload, compress, and attach images to specific questions.
  * Mark questions as "Canceled" or manage student "Appeals".
* **Course Management:** Organize exams by academic years, semesters, and specific courses.
* **Real-time UX:** Seamless notifications and loading states powered by `react-hot-toast` and Firebase Realtime Database.

### 🎓 Student Interface
* Access a categorized database of medical exams.
* Practice questions with instant feedback.
* Report errors or missing images directly to the admin.

## 🛠️ Tech Stack

* **Frontend Framework:** React (with Vite for fast HMR and optimized builds)
* **Styling:** Tailwind CSS
* **Routing:** React Router (`react-router-dom`)
* **Backend & Database:** Firebase (Realtime Database, Cloud Storage)
* **Serverless Functions:** Firebase Cloud Functions (Node.js)
* **AI Integration:** Google Gemini API (via Firebase Functions)
* **Utilities:** * `react-hot-toast` (Notifications & Promise tracking)
  * `browser-image-compression` (Client-side image optimization)

## 🏗️ Project Architecture

The project follows strict React best practices and Separation of Concerns (SoC):
* **UI Components:** Divided into modular components (e.g., `QuestionItem.jsx`, `ManageExamsTab.jsx`).
* **Custom Hooks:** Business logic and Firebase interactions are separated into dedicated hooks:
  * `useExamsLogic`: Manages exam fetching, editing, and deleting.
  * `useUploadLogic`: Handles file encoding, Gemini AI processing, and batch uploads.
  * `useCoursesLogic`: Manages course hierarchy and metadata.
  * `useAdminAuth`: Handles secure admin access and permissions.

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* NPM or Yarn
* A Firebase Project with Realtime Database, Storage, and Functions enabled.