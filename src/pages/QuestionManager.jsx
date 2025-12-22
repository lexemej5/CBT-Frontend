import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizzesAPI, questionsAPI } from '../services/api';
import QuestionUploader from '../components/QuestionUploader';
import '../styles/question-manager.css';

export default function QuestionManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // Helper to format dates
  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: [
      { label: 'A', text: '', isCorrect: false },
      { label: 'B', text: '', isCorrect: false },
      { label: 'C', text: '', isCorrect: false },
      { label: 'D', text: '', isCorrect: false }
    ],
    points: 1
  });

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editFormData, setEditFormData] = useState({
    text: '',
    options: [],
    points: 1
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizRes, questionsRes] = await Promise.all([
        quizzesAPI.getWithQuestions(id),
        questionsAPI.getAll()
      ]);
      setQuiz(quizRes.data.quiz);
      // ensure questions are sorted by upload/creation time ascending (oldest first)
      const qs = Array.isArray(questionsRes.data) ? questionsRes.data.slice() : [];
      qs.sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      });
      setAllQuestions(qs);
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      if (!newQuestion.text.trim()) {
        setError('Question text is required');
        return;
      }

      const hasCorrectAnswer = newQuestion.options.some(opt => opt.isCorrect && opt.text.trim());
      if (!hasCorrectAnswer) {
        setError('At least one option must be marked as correct');
        return;
      }

      const filledOptions = newQuestion.options.filter(opt => opt.text.trim());
      if (filledOptions.length < 2) {
        setError('At least 2 options are required');
        return;
      }

      const createdQuestion = await questionsAPI.create({
        text: newQuestion.text,
        options: filledOptions,
        points: newQuestion.points
      });

      // Add to quiz
      await quizzesAPI.addQuestion(id, createdQuestion.data._id);

      setAllQuestions([createdQuestion.data, ...allQuestions]);
      setNewQuestion({
        text: '',
        options: [
          { label: 'A', text: '', isCorrect: false },
          { label: 'B', text: '', isCorrect: false },
          { label: 'C', text: '', isCorrect: false },
          { label: 'D', text: '', isCorrect: false }
        ],
        points: 1
      });
      setShowNewQuestionForm(false);
      fetchData();
      setError('');
    } catch (err) {
      console.error('Error adding question:', err);
      setError(err.response?.data?.error || 'Failed to create question');
    }
  };

  const handleAddExistingQuestion = async (questionId) => {
    try {
      await quizzesAPI.addQuestion(id, questionId);
      fetchData();
      setError('');
    } catch (err) {
      console.error('Error adding question to quiz:', err);
      setError('Failed to add question to quiz');
    }
  };

  const handleRemoveQuestion = async (questionId) => {
    if (!window.confirm('Remove this question from the quiz?')) return;
    try {
      await quizzesAPI.removeQuestion(id, questionId);
      fetchData();
      setError('');
    } catch (err) {
      console.error('Error removing question:', err);
      setError('Failed to remove question');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await questionsAPI.delete(questionId);
      setAllQuestions(prev => prev.filter(q => q._id !== questionId));
    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question');
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question._id);
    setEditFormData({
      text: question.text,
      options: [...question.options],
      points: question.points
    });
  };

  const handleEditOptionChange = (index, field, value) => {
    const updatedOptions = [...editFormData.options];
    if (field === 'isCorrect') {
      updatedOptions[index].isCorrect = value;
    } else {
      updatedOptions[index][field] = value;
    }
    setEditFormData(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      if (!editFormData.text.trim()) {
        setError('Question text is required');
        return;
      }

      const hasCorrectAnswer = editFormData.options.some(opt => opt.isCorrect && opt.text.trim());
      if (!hasCorrectAnswer) {
        setError('At least one option must be marked as correct');
        return;
      }

      const filledOptions = editFormData.options.filter(opt => opt.text.trim());
      if (filledOptions.length < 2) {
        setError('At least 2 options are required');
        return;
      }

      setIsSavingEdit(true);
      await questionsAPI.update(editingQuestion, {
        text: editFormData.text,
        options: filledOptions,
        points: editFormData.points
      });

      // Update quiz's timestamp to reflect that questions were modified
      await quizzesAPI.update(id, {
        title: quiz.title,
        description: quiz.description,
        faculty: quiz.faculty,
        universityName: quiz.universityName,
        durationMinutes: quiz.durationMinutes
      });

      setAllQuestions(prev =>
        prev.map(q =>
          q._id === editingQuestion
            ? { ...q, text: editFormData.text, options: filledOptions, points: editFormData.points, updatedAt: new Date() }
            : q
        )
      );

      setEditingQuestion(null);
      setEditFormData({ text: '', options: [], points: 1 });
      setError('');
      setIsSavingEdit(false);
      fetchData();
    } catch (err) {
      console.error('Error updating question:', err);
      setError(err.response?.data?.error || 'Failed to update question');
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setEditFormData({ text: '', options: [], points: 1 });
    setError('');
  };

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...newQuestion.options];
    if (field === 'isCorrect') {
      updatedOptions[index].isCorrect = value;
    } else {
      updatedOptions[index][field] = value;
    }
    setNewQuestion(prev => ({
      ...prev,
      options: updatedOptions
    }));
  };

  if (loading) {
    return (
      <div className="qm-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const quizQuestionIds = quiz?.questions || [];
  // Maintain ascending order by createdAt for both lists
  const availableQuestions = allQuestions
    .filter(q => !quizQuestionIds.includes(q._id))
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const quizQuestions = allQuestions
    .filter(q => quizQuestionIds.includes(q._id))
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="qm-container">
      <div className="qm-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          ← Back
        </button>
        <h1>Manage Questions</h1>
        <p className="subtitle">{quiz?.title}</p>
      </div>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      {/* Current Questions in Quiz */}
      <div className="section">
        <h2>Questions in Quiz ({quizQuestions.length})</h2>
        {quizQuestions.length === 0 ? (
          <p className="empty-msg">No questions added yet</p>
        ) : (
          <div className="questions-list">
            {quizQuestions.map((q, idx) => (
              <div key={q._id} className="question-item">
                <div className="question-content">
                  <span className="q-number">{idx + 1}.</span>
                  <div className="q-details">
                    <p className="q-text">{q.text}</p>
                    <div className="q-meta">
                      <small>Uploaded: {formatDateTime(q.createdAt)}</small>
                      {q.updatedAt && q.updatedAt !== q.createdAt && (
                        <small style={{ marginLeft: 12 }}>Updated: {formatDateTime(q.updatedAt)}</small>
                      )}
                    </div>
                    <div className="q-options">
                      {q.options?.map((opt, i) => (
                        <span key={i} className={`option-badge ${opt.isCorrect ? 'correct' : ''}`}>
                          {opt.label}: {opt.text} {opt.isCorrect && '✓'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="q-actions">
                  <button
                    onClick={() => handleRemoveQuestion(q._id)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Question Form */}
      <div className="section">
        <div className="section-buttons">
          <button
            className="btn-add-new"
            onClick={() => setShowNewQuestionForm(!showNewQuestionForm)}
          >
            {showNewQuestionForm ? '✕ Cancel' : '+ Create New Question'}
          </button>
          <button
            className="btn-upload"
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? '✕ Cancel' : '📤 Upload from File'}
          </button>
        </div>

        {showUploader && (
          <QuestionUploader
            quizId={id}
            onQuestionsAdded={(questions) => {
              fetchData();
              setShowUploader(false);
              setError('');
            }}
            onClose={() => setShowUploader(false)}
          />
        )}

        {showNewQuestionForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <form className="new-question-form" onSubmit={handleAddQuestion}>
              <div className="form-group">
                <label>Question Text *</label>
                <textarea
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                  placeholder="Enter the question"
                  rows="3"
                />
              </div>

              <div className="options-section">
                <label className="section-label">Options *</label>
                {newQuestion.options.map((opt, idx) => (
                  <div key={idx} className="option-input">
                    <span className="opt-label">{opt.label}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                      placeholder={`Option ${opt.label}`}
                    />
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)}
                      />
                      <span>Correct Answer</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Points</label>
                <input
                  type="number"
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>

              <button type="submit" className="btn-submit">
                Save Question
              </button>
            </form>

            {/* Preview of new question */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
              <h4 style={{ marginTop: 0 }}>Preview</h4>
              {newQuestion.text ? (
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{newQuestion.text}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {newQuestion.options.map((opt, i) => (
                      opt.text && (
                        <span key={i} style={{ padding: '8px 12px', background: 'white', borderRadius: '6px', borderLeft: opt.isCorrect ? '4px solid #48bb78' : '4px solid #cbd5e0' }}>
                          <strong>{opt.label}:</strong> {opt.text} {opt.isCorrect && <strong style={{ color: '#48bb78' }}>✓</strong>}
                        </span>
                      )
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: '#718096', marginTop: '12px' }}>Points: <strong>{newQuestion.points}</strong></p>
                </div>
              ) : (
                <p style={{ color: '#a0aec0', fontStyle: 'italic' }}>Question preview will appear here...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Available Questions */}
      {availableQuestions.length > 0 && (
        <div className="section">
          <h2>Available Questions ({availableQuestions.length})</h2>
          <div className="questions-list">
            {availableQuestions.map((q) => (
              <div key={q._id} className="question-item available">
                <div className="question-content">
                  <div className="q-details">
                      <p className="q-text">{q.text}</p>
                      <div className="q-meta">
                        <small>Uploaded: {formatDateTime(q.createdAt)}</small>
                        {q.updatedAt && q.updatedAt !== q.createdAt && (
                          <small style={{ marginLeft: 12 }}>Updated: {formatDateTime(q.updatedAt)}</small>
                        )}
                      </div>
                    <div className="q-options">
                      {q.options?.map((opt, i) => (
                        <span key={i} className={`option-badge ${opt.isCorrect ? 'correct' : ''}`}>
                          {opt.label}: {opt.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="q-actions">
                  <button
                    onClick={() => handleAddExistingQuestion(q._id)}
                    className="btn-add"
                  >
                    Add to Quiz
                  </button>
                  <button
                    onClick={() => handleEditQuestion(q)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q._id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit Question</h3>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Question Text *</label>
                <textarea
                  value={editFormData.text}
                  onChange={(e) => setEditFormData({...editFormData, text: e.target.value})}
                  placeholder="Enter the question"
                  rows="3"
                />
              </div>

              <div className="options-section">
                <label className="section-label">Options *</label>
                {editFormData.options.map((opt, idx) => (
                  <div key={idx} className="option-input">
                    <span className="opt-label">{opt.label}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleEditOptionChange(idx, 'text', e.target.value)}
                      placeholder={`Option ${opt.label}`}
                    />
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) => handleEditOptionChange(idx, 'isCorrect', e.target.checked)}
                      />
                      <span>Correct Answer</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Points</label>
                <input
                  type="number"
                  value={editFormData.points}
                  onChange={(e) => setEditFormData({...editFormData, points: parseInt(e.target.value) || 1})}
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="submit" 
                  className="btn-submit"
                  disabled={isSavingEdit}
                  style={{ opacity: isSavingEdit ? 0.6 : 1, cursor: isSavingEdit ? 'not-allowed' : 'pointer' }}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSavingEdit}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e0', background: '#f7fafc', cursor: isSavingEdit ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: isSavingEdit ? 0.6 : 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
  
