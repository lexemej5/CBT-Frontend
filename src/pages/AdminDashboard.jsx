import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizzesAPI } from '../services/api';
import api from '../services/api';
import { formatMinutesToMinSec } from '../utils/time';
import CommentsManager from '../components/CommentsManager';
import '../styles/admin-dashboard.css';

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { user, setUser } = useAuth();
  const titleCase = (n) => {
    if (!n) return n;
    return n.split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  };

  const signedInDisplayName = (() => {
    const n = user?.name;
    if (!n) return user?.email || 'Unknown';
    return titleCase(n);
  })();
  // Display name: prefer `user.name`, title-cased; fall back to email or 'Unknown'
  const displayName = (() => {
    const n = user?.name;
    if (!n) return user?.email || 'Unknown';
    return n.split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  })();
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalQuestions: 0,
    totalAttempts: 0
  });
  const [performances, setPerformances] = useState([]);
  const [perfStats, setPerfStats] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.post('/admin/pay');
      // Refresh user data
      const me = await api.get('/admin/me');
      setUser(me.data);
      localStorage.setItem('user', JSON.stringify(me.data));
      alert('Payment recorded! You can now upload questions.');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Payment failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const quizRes = await quizzesAPI.getAll();
      setQuizzes(quizRes.data || []);
      
      const totalQuestions = quizRes.data.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
      setStats({
        totalQuizzes: quizRes.data.length,
        totalQuestions: totalQuestions,
        totalAttempts: 0
      });
      
      setError('');

      // Fetch admin-specific performance data
      try {
        const perfRes = await api.get('/admin/grades');
        setPerformances(perfRes.data.attempts || []);
        setPerfStats(perfRes.data.statsByQuiz || {});
        setStats(prev => ({ ...prev, totalAttempts: (perfRes.data.attempts || []).length }));
      } catch (perfErr) {
        console.warn('Failed to load performance data', perfErr);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await quizzesAPI.delete(quizId);
        setQuizzes(prev => prev.filter(q => q._id !== quizId));
      } catch (err) {
        console.error('Error deleting quiz:', err);
        setError('Failed to delete quiz.');
      }
    }
  };

  const copyQuizLink = (quizId) => {
    const quizUrl = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(quizUrl).then(() => {
      alert('Quiz link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1>Admin Dashboard</h1>
          <div className="signed-in">Signed in as: <strong>{displayName}</strong></div>
        </div>

        {/* Payment Status Card */}
        <div className="payment-card">
          {user?.payment || user?.isPaid ? (
            <div className="payment-status paid">
              <span className="badge">✓ Paid</span>
              <p>You can upload questions</p>
            </div>
          ) : (
            <div className="payment-status unpaid">
              <span className="badge warning">⚠ Not Paid</span>
              <p>You need to pay to upload questions</p>
              <button 
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          )}
        </div>

        <Link to="/admin/create-quiz" className="btn btn-primary">
          + Create New Quiz
        </Link>
      </div>

      <div className="performances-section">
        <h2>Recent Attempts</h2>
        {performances.length === 0 ? (
          <p>No attempts on your quizzes yet.</p>
        ) : (
          <div className="performances-table">
            <table>
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Participant</th>
                  <th>Score</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {performances.map(at => (
                  <tr key={at._id}>
                    <td>{at.quizId?.title || '—'}</td>
                    <td>{at.userId?.name || at.userId?.email || at.tempUserId || 'Guest'}</td>
                    <td>{at.score} / {at.rawScore}</td>
                    <td>{at.submittedAt ? new Date(at.submittedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Participants summary: aggregate attempts per user (placed below Manage Quizzes) */}
      <div className="participants-section" style={{ marginTop: 24 }}>
        <h2>Participants</h2>
        {performances.length === 0 ? (
          <p>No participant data yet.</p>
        ) : (
          (() => {
            const map = {};
            performances.forEach(at => {
              const pid = at.userId && at.userId._id ? at.userId._id : (at.tempUserId || ('guest_' + (at.tempUserId || at._id)));
              const name = at.userId?.name || at.userId?.email || at.tempUserId || 'Guest';
              if (!map[pid]) map[pid] = { id: pid, name, count: 0, totalScore: 0, lastAttempt: null, quizzes: new Set() };
              const entry = map[pid];
              entry.count += 1;
              entry.totalScore += (at.score || 0);
              entry.lastAttempt = (!entry.lastAttempt || new Date(at.submittedAt) > new Date(entry.lastAttempt)) ? at.submittedAt : entry.lastAttempt;
              if (at.quizId && at.quizId.title) entry.quizzes.add(at.quizId.title);
            });
            const rows = Object.values(map).map(e => ({
              id: e.id,
              name: e.name,
              count: e.count,
              avgScore: e.count ? Math.round((e.totalScore / e.count) * 100) / 100 : 0,
              lastAttempt: e.lastAttempt,
              quizzes: Array.from(e.quizzes)
            }));
            return (
              <div className="participants-table">
                <table>
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Email / ID</th>
                      <th>Attempts</th>
                      <th>Avg Score</th>
                      <th>Last Attempt</th>
                      <th>Quizzes Tried</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</td>
                        <td>{r.count}</td>
                        <td>{r.avgScore}</td>
                        <td>{r.lastAttempt ? new Date(r.lastAttempt).toLocaleString() : '-'}</td>
                        <td>{r.quizzes.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </div>

      {/* Participants table moved below quizzes for better layout (see end of file) */}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.totalQuizzes}</h3>
            <p>Total Quizzes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❓</div>
          <div className="stat-content">
            <h3>{stats.totalQuestions}</h3>
            <p>Total Questions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✍️</div>
          <div className="stat-content">
            <h3>{stats.totalAttempts}</h3>
            <p>Total Attempts</p>
          </div>
        </div>
      </div>

      <div className="quizzes-section">
        <h2>Manage Quizzes</h2>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading quizzes...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="empty-state">
            <p>No quizzes created yet. Create your first quiz!</p>
            <Link to="/admin/create-quiz" className="btn btn-primary">
              Create Quiz
            </Link>
          </div>
        ) : (
          <div className="quizzes-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploader</th>
                  <th>Faculty</th>
                  <th>University</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Created</th>
                  <th>Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz._id}>
                    <td className="title-cell">{quiz.title}</td>
                    <td>{(() => {
                      if (quiz.questions && quiz.questions.length > 0) {
                        const qWithUploader = quiz.questions.find(q => q.uploader && (q.uploader.name || q.uploader.email));
                        if (qWithUploader) return titleCase(qWithUploader.uploader.name) || qWithUploader.uploader.email;
                        const qWithSource = quiz.questions.find(q => q.sourceUpload && q.sourceUpload.uploader && (q.sourceUpload.uploader.name || q.sourceUpload.uploader.email));
                        if (qWithSource) return titleCase(qWithSource.sourceUpload.uploader.name) || qWithSource.sourceUpload.uploader.email;
                      }
                      return titleCase(quiz.createdBy?.name) || quiz.createdBy?.email || signedInDisplayName;
                    })()}</td>
                    <td>{quiz.faculty || '-'}</td>
                    <td>{quiz.universityName || '-'}</td>
                    <td>{formatMinutesToMinSec(quiz.durationMinutes)}</td>
                    <td>{quiz.questions?.length || 0}</td>
                    <td>{new Date(quiz.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => copyQuizLink(quiz._id)}
                        className="btn-small btn-link"
                        title="Copy quiz link"
                      >
                        🔗 Copy Link
                      </button>
                    </td>
                    <td className="actions-cell">
                      <Link to={`/admin/quiz/${quiz._id}/settings`} className="btn-small btn-edit">
                        Settings
                      </Link>
                      <Link to={`/admin/quiz/${quiz._id}/questions`} className="btn-small btn-questions">
                        Questions
                      </Link>
                      <button 
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        className="btn-small btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comments Manager */}
        <CommentsManager />
      </div>
    </div>
  );
}
