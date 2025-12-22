import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizzesAPI, questionsAPI } from '../services/api';
import QuizForm from '../components/QuizForm';
import QuestionUploader from '../components/QuestionUploader';
import '../styles/quiz-settings.css';

export default function QuizSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [showUploader, setShowUploader] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);

  useEffect(() => {
    fetchQuizData();
  }, [id]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const response = await quizzesAPI.getWithQuestions(id);
      setQuiz(response.data.quiz);
      
      // Fetch questions
      if (response.data.quiz?.questions?.length > 0) {
        const questionsRes = await questionsAPI.getAll();
        const quizQuestionsData = questionsRes.data.filter(q => 
          response.data.quiz.questions.includes(q._id)
        );
        setQuizQuestions(quizQuestionsData);
      }
      
      setError('');
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuiz = async (formData) => {
    try {
      setIsUpdating(true);
      setError('');

      await quizzesAPI.update(id, {
        title: formData.title,
        description: formData.description,
        faculty: formData.faculty,
        universityName: formData.universityName,
        durationMinutes: formData.durationMinutes
      });

      setQuiz(prev => ({
        ...prev,
        ...formData
      }));
      alert('Quiz updated successfully!');
    } catch (err) {
      console.error('Error updating quiz:', err);
      setError(err.response?.data?.message || 'Failed to update quiz.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-settings-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="quiz-settings-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => navigate('/admin')}>Back to Admin</button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          ← Back
        </button>
        <h1>Quiz Settings</h1>
      </div>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Basic Settings
        </button>
        <button 
          className={`tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({quiz?.questions?.length || 0})
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="settings-tab">
          <h2>Basic Settings</h2>
          <p className="tab-description">Edit quiz information including title, duration, faculty, and university</p>
          
          {quiz && (
            <QuizForm 
              initialData={quiz}
              onSubmit={handleUpdateQuiz}
              isLoading={isUpdating}
            />
          )}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="questions-tab">
          <div className="questions-header">
            <div>
              <h2>Questions Management</h2>
              <p className="tab-description">
                Currently showing {quizQuestions?.length || 0} questions in this quiz
              </p>
            </div>
            <button 
              className="btn-upload-questions"
              onClick={() => setShowUploader(!showUploader)}
            >
              {showUploader ? '✕ Cancel' : '📤 Upload Questions'}
            </button>
          </div>

          {showUploader && (
            <QuestionUploader
              quizId={id}
              onQuestionsAdded={(questions) => {
                fetchQuizData();
                setShowUploader(false);
              }}
              onClose={() => setShowUploader(false)}
            />
          )}

          {quizQuestions?.length > 0 ? (
            <div className="questions-list">
              <h3>Quiz Questions</h3>
              <div className="questions-grid">
                {quizQuestions.map((q, idx) => (
                  <div key={q._id} className="question-item">
                    <div className="q-number">Q{idx + 1}</div>
                    <div className="q-content">
                      <p className="q-text">{q.text}</p>
                      <div className="q-meta">
                        <span className="q-options">{q.options?.length || 0} options</span>
                        <span className="q-points">{q.points} pts</span>
                      </div>
                      <div className="q-options-preview">
                        {q.options?.slice(0, 2).map((opt, i) => (
                          <span key={i} className={`opt ${opt.isCorrect ? 'correct' : ''}`}>
                            {opt.label}: {opt.text.substring(0, 20)}...
                          </span>
                        ))}
                        {q.options?.length > 2 && (
                          <span className="opt-more">+{q.options.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !showUploader ? (
            <div className="questions-empty">
              <p>📝 No questions added yet</p>
              <p>Click "📤 Upload Questions" to add questions from a file</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
