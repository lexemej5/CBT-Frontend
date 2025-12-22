import { useState, useEffect } from 'react';
import { commentsAPI } from '../services/api';
import '../styles/comments-manager.css';

export default function CommentsManager() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchPendingComments();
  }, []);

  const fetchPendingComments = async () => {
    try {
      setLoading(true);
      const res = await commentsAPI.getPending();
      setComments(res.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load pending comments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId) => {
    try {
      setActionLoading(commentId);
      await commentsAPI.approve(commentId);
      setComments(comments.filter(c => c._id !== commentId));
      setActionLoading(null);
    } catch (err) {
      console.error('Error approving comment:', err);
      setActionLoading(null);
    }
  };

  const handleReject = async (commentId) => {
    try {
      setActionLoading(commentId);
      await commentsAPI.delete(commentId);
      setComments(comments.filter(c => c._id !== commentId));
      setActionLoading(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setActionLoading(null);
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  if (loading) {
    return (
      <div className="comments-manager">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comments-manager">
      <div className="cm-header">
        <h2>Pending Comments</h2>
        <span className="comment-count">{comments.length}</span>
      </div>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
          <button onClick={fetchPendingComments}>Try Again</button>
        </div>
      )}

      {comments.length === 0 && !error && (
        <div className="empty-state">
          <p>✓ No pending comments. All comments have been reviewed!</p>
        </div>
      )}

      {comments.length > 0 && (
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment._id} className="comment-card">
              <div className="comment-header">
                <div className="comment-meta">
                  <strong className="commenter-name">{comment.userName}</strong>
                  {comment.userEmail && (
                    <span className="commenter-email">({comment.userEmail})</span>
                  )}
                  <span className="quiz-name">
                    on <strong>{comment.quizId?.title}</strong>
                  </span>
                </div>
                <span className="comment-date">{formatDateTime(comment.createdAt)}</span>
              </div>

              <div className="comment-text">
                {comment.text}
              </div>

              <div className="comment-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(comment._id)}
                  disabled={actionLoading === comment._id}
                >
                  {actionLoading === comment._id ? 'Processing...' : '✓ Approve'}
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleReject(comment._id)}
                  disabled={actionLoading === comment._id}
                >
                  {actionLoading === comment._id ? 'Processing...' : '✕ Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
