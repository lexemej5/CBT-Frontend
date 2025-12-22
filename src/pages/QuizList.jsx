import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizzesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatMinutesToMinSec } from '../utils/time';
import '../styles/quiz-list.css';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const titleCase = (n) => {
    if (!n) return n;
    return n.split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  };

  const signedInDisplayName = (() => {
    const n = user?.name;
    if (!n) return user?.email || 'Unknown';
    return titleCase(n);
  })();

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const getRelativeTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffInSeconds = Math.floor((now - d) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    return d.toLocaleString();
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await quizzesAPI.getAll();
      setQuizzes(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes. Please try again.');
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-list-container">
      <div className="quiz-list-header">
        <h1>Available Quizzes</h1>
        <p>Select a quiz to begin testing</p>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchQuizzes}>Try Again</button>
        </div>
      )}

      {!loading && quizzes.length === 0 && !error && (
        <div className="empty-state">
          <p>No quizzes available yet.</p>
        </div>
      )}

      {!loading && quizzes.length > 0 && (
        <div className="quizzes-grid">
          {quizzes.map(quiz => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-header">
                <h2>{quiz.title}</h2>
                <span className="university-badge">{quiz.universityName || 'University'}</span>
              </div>

              <div className="quiz-info">
                <div className="info-item">
                  <span className="label">Faculty:</span>
                  <span className="value">{quiz.faculty || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Duration:</span>
                  <span className="value">{formatMinutesToMinSec(quiz.durationMinutes)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Questions:</span>
                  <span className="value">{quiz.questions?.length || 0}</span>
                </div>
              </div>
              <div className="uploader-row" style={{marginTop: '10px', fontSize: '13px', color: '#4a5568'}}>
                Uploaded by: {
                  (() => {
                    // Prefer explicit creator first (so public users see who created it)
                    if (quiz.createdBy && (quiz.createdBy.name || quiz.createdBy.email)) {
                      return titleCase(quiz.createdBy.name) || quiz.createdBy.email;
                    }

                    // Next prefer question uploader or sourceUpload.uploader
                    if (quiz.questions && quiz.questions.length > 0) {
                      const qWithUploader = quiz.questions.find(q => q.uploader && (q.uploader.name || q.uploader.email));
                      if (qWithUploader) return titleCase(qWithUploader.uploader.name) || qWithUploader.uploader.email;
                      const qWithSource = quiz.questions.find(q => q.sourceUpload && q.sourceUpload.uploader && (q.sourceUpload.uploader.name || q.sourceUpload.uploader.email));
                      if (qWithSource) return titleCase(qWithSource.sourceUpload.uploader.name) || qWithSource.sourceUpload.uploader.email;
                    }

                    // If viewer is signed-in admin, show their name as last fallback; otherwise show Unknown
                    return user ? signedInDisplayName : 'Unknown';
                  })()
                }
              </div>

              {quiz.description && (
                <p className="quiz-description">{quiz.description}</p>
              )}

              <div className="timestamp-row">
                <div className="created-time">Created: {formatDateTime(quiz.createdAt)}</div>
                {quiz.updatedAt && quiz.updatedAt !== quiz.createdAt ? (
                  <div className="updated-time-badge">
                    <span className="update-indicator">● </span>
                    Last Updated: {getRelativeTime(quiz.updatedAt)} ({formatDateTime(quiz.updatedAt)})
                  </div>
                ) : null}
              </div>

              <Link to={`/quiz/${quiz._id}`} className="btn btn-quiz">
                Start Quiz →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
