import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import QuizList from './pages/QuizList';
import QuizTest from './pages/QuizTest';
import AdminDashboard from './pages/AdminDashboard';
import CreateQuiz from './pages/CreateQuiz';
import QuizSettings from './pages/QuizSettings';
import QuestionManager from './pages/QuestionManager';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminForgot from './pages/AdminForgot';
import AdminReset from './pages/AdminReset';
import './App.css';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quizzes" element={<QuizList />} />
        <Route path="/quiz/:id" element={<QuizTest />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/forgot" element={<AdminForgot />} />
        <Route path="/admin/reset" element={<AdminReset />} />
        <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/create-quiz" element={isAdmin ? <CreateQuiz /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/quiz/:id/settings" element={isAdmin ? <QuizSettings /> : <Navigate to="/admin/login" />} />
        <Route path="/admin/quiz/:id/questions" element={isAdmin ? <QuestionManager /> : <Navigate to="/admin/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
