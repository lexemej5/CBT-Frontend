import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { commentsAPI, quizzesAPI } from '../services/api';
import '../styles/home.css';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAdmin, user } = useAuth();
  const [allComments, setAllComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  useEffect(() => {
    fetchAllComments();
  }, []);

  const fetchAllComments = async () => {
    try {
      setCommentsLoading(true);
      // Fetch all quizzes to get their comments
      const quizzesRes = await quizzesAPI.getAll();
      const quizzes = quizzesRes.data || [];

      let allApprovedComments = [];
      for (const quiz of quizzes) {
        try {
          const commentsRes = await commentsAPI.getApproved(quiz._id);
          const comments = commentsRes.data || [];
          allApprovedComments = allApprovedComments.concat(
            comments.map(c => ({ ...c, quizTitle: quiz.title, quizId: quiz._id }))
          );
        } catch (e) {
          // Ignore if no comments for this quiz
        }
      }

      // Sort by date, most recent first
      allApprovedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllComments(allApprovedComments.slice(0, 5)); // Show latest 5
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString();
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      setDeletingCommentId(commentId);
      await commentsAPI.delete(commentId);
      setAllComments(prev => prev.filter(c => c._id !== commentId));
      setDeletingCommentId(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="video-bg">
  <video autoPlay muted loop playsinline>
    <source src="./public/assets/brains.mp4"/>
  </video>
   <div className="video-overlay"></div>
    <div className="home">

      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to CBT System</h1>
          <p>Computer Based Testing Platform</p>
          <div className="hero-buttons">
            <Link to="/quizzes" className="btn btn-primary">
              Take a Quiz
            </Link>
            {isAdmin && (
              <Link to="/admin" className="btn btn-secondary">
                Admin Panel
              </Link>
            )}
          </div>
        </div>
        <div className="hero-illustration">
          <div className="illustration-box">📚</div>
        </div>
      </div>
       <div className="quote">
        <p>"Brainstorming turns problems into opportunities by exploring every possible solution..." <span> <h4>W.Edwards Deming</h4></span></p>
       </div>

      <div className="features-section">
        <div className="features-title">
        <h2>Why Choose Our Platform?</h2>

        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Fast & Reliable</h3>
            <p>Experience smooth and responsive testing interface</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure</h3>
            <p>Your answers are securely saved and protected</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics</h3>
            <p>Track your performance and progress over time</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Customizable</h3>
            <p>Quizzes tailored to your curriculum and needs</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="admin-section">
          <h2>Admin Tools</h2>
          <p>Manage quizzes, questions, and track student performance</p>
          <Link to="/admin" className="btn btn-admin">
            Go to Admin Dashboard
          </Link>
        </div>
      )}

      {!commentsLoading && allComments.length > 0 && (
        <div className="comments-section">
          <h2>User Feedback</h2>
          <p className="section-subtitle">See what students are saying about our quizzes</p>
          <div className="comments-grid">
            {allComments.map((comment, idx) => {
              const canDelete = isAdmin || (user && comment.userName === user.name);
              return (
                <div key={idx} className="feedback-card">
                  <div className="feedback-header">
                    <div className="feedback-user">{comment.userName}</div>
                    <div className="feedback-quiz">
                      <span className="feedback-quiz-title">{comment.quizTitle}</span>
                    </div>
                  </div>
                  <div className="feedback-text">{comment.text}</div>
                  <div className="feedback-footer">
                    <div className="feedback-date">{formatDateTime(comment.createdAt)}</div>
                    {canDelete && (
                      <button
                        className="btn-delete-comment"
                        onClick={() => handleDeleteComment(comment._id)}
                        disabled={deletingCommentId === comment._id}
                        title="Delete this comment"
                      >
                        {deletingCommentId === comment._id ? '...' : '✕'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <footer className="home-footer">
        <div className="developer">
          <img src="././public\assets\images\user-profile.png"/>
          <p>Developed By: Whizzer</p>
        </div>
        <p>&copy; {new Date().getFullYear()} CBT System. All rights reserved.</p>
      </footer>
    </div>
    </div>
  );
}
