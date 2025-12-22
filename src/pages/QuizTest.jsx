import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizzesAPI, attemptsAPI, commentsAPI } from '../services/api';
import { formatMinutesToMinSec } from '../utils/time';
import QuestionCard from '../components/QuestionCard';
import { useAuth } from '../context/AuthContext';
import '../styles/quiz-test.css';

export default function QuizTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState(null);
  const [isStarted, setIsStarted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const answeredCount = Object.keys(answers).length;

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');

  useEffect(() => {
    fetchQuizData();
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft === 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time finished — auto-submit without showing confirmation modal
          try {
            confirmSubmit();
          } catch (e) {
            // ensure we still clear timer even if confirmSubmit throws
            console.error('Auto-submit failed', e);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Scroll active question button into view on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) {
      const activeButton = document.querySelector('.question-indicator-compact.active');
      if (activeButton) {
        const container = activeButton.closest('.question-list-compact');
        if (container) {
          activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [currentQuestionIndex]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const response = await quizzesAPI.getWithQuestions(id);
      console.log('fetchQuizData response:', response);
      const data = response?.data;
      if (!data || !data.quiz) {
        console.error('Unexpected response from getWithQuestions', data);
        setError('Failed to load quiz data');
        setQuiz(null);
        setQuestions([]);
        return;
      }

      setQuiz(data.quiz);
      // Shuffle questions and options for each attempt
      const incoming = Array.isArray(data.questions) ? data.questions : [];

      const shuffle = (arr) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };

      const processed = incoming.map(q => {
        // keep a copy of original options order so we can map selections back
        const originalOptions = Array.isArray(q.options) ? q.options.slice() : [];
        const shuffledOptions = shuffle(originalOptions.map(o => ({ ...o })));
        return {
          ...q,
          _originalOptions: originalOptions,
          options: shuffledOptions
        };
      });

      const shuffledQuestions = shuffle(processed);
      setQuestions(shuffledQuestions);
      const duration = Number(data.quiz.durationMinutes) || 0;
      setTimeLeft(duration > 0 ? duration * 60 : 0);
      setError('');
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError('Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const areAllQuestionsAnswered = () => {
    if (questions.length === 0) return false;
    return questions.every(q => answers[q._id] !== undefined);
  };

  const handleSubmit = () => {
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      console.log('Starting quiz submission...');
      
      // Use authenticated user if available, otherwise create a temporary session user
      let userId = user?._id;
      
      if (!userId) {
        // Generate a temporary user ID or use one from local storage (persist across restarts)
        userId = localStorage.getItem('tempUserId');
        if (!userId) {
          userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('tempUserId', userId);
        }
      }

      console.log('User ID:', userId);
      console.log('Number of answers:', Object.keys(answers).length);

      const attempt = {
        quizId: id,
        userId,
        answers: Object.entries(answers).map(([questionId, selectedIndex]) => {
          // convert selected indexes (client-side shuffled order) to option IDs
          const q = questions.find(qq => String(qq._id) === String(questionId));
          let selectedIds = [];
          if (q) {
            const idxs = Array.isArray(selectedIndex) ? selectedIndex : [selectedIndex];
            selectedIds = idxs.map(i => q.options[i]?._id).filter(Boolean);
          }
          return {
            questionId,
            selectedOptionIndexes: Array.isArray(selectedIndex) ? selectedIndex : [selectedIndex],
            selectedOptionIds: selectedIds
          };
        })
      };

      console.log('Sending attempt:', attempt);
      const res = await attemptsAPI.submit(attempt);
      console.log('Submit response:', res);
      
      const returnedId = res.data?.attemptId;

      // store attempt id locally so client retains record even after restart
      try {
        const key = `attempts_${id}`;
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ attemptId: returnedId, timestamp: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) {
        console.warn('Failed to persist attempt id locally', e);
      }

      setSubmittedAttempt({
        ...attempt,
        score: res.data?.score || 0,
        total: res.data?.total || questions.length,
        attemptId: returnedId
      });
      setShowConfirmModal(false);
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to submit quiz: ' + (err.response?.data?.message || err.message));
      setIsSubmitting(false);
      setShowConfirmModal(true);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${secs}s`;
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setCommentMessage('Please enter a comment');
      return;
    }

    try {
      setIsSubmittingComment(true);
      await commentsAPI.create({
        quizId: quiz._id,
        text: commentText
      });
      setCommentText('');
      setCommentMessage('Comment submitted! Thank you. It will be reviewed by admins.');
      setTimeout(() => setCommentMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting comment:', err);
      setCommentMessage('Failed to submit comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-test-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-test-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => navigate('/quizzes')}>Back to Quizzes</button>
        </div>
      </div>
    );
  }

  if (!isStarted && quiz && !isSubmitted) {
    return (
      <div className="quiz-test-container">
        <div className="quiz-start-screen">
          <div className="start-content">
            <h1>{quiz.title}</h1>
            <div className="quiz-info">
              <p><strong>Faculty:</strong> {quiz.faculty || 'N/A'}</p>
              <p><strong>University:</strong> {quiz.universityName || 'N/A'}</p>
              <p><strong>Duration:</strong> {formatMinutesToMinSec(quiz.durationMinutes)}</p>
              <p><strong>Total Questions:</strong> {questions.length}</p>
            </div>
            <div className="start-instructions">
              <h3>Instructions:</h3>
              <ul>
                <li>Answer all questions carefully</li>
                <li>You have {formatMinutesToMinSec(quiz.durationMinutes)} to complete this quiz</li>
                <li>You can navigate between questions using the Previous/Next buttons</li>
                <li>Click "Submit Quiz" when you are ready to submit your answers</li>
              </ul>
            </div>
            <button 
              className="btn-start-quiz"
              onClick={() => setIsStarted(true)}
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmModal) {
    return (
      <div className="quiz-test-container">
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="modal-header">
              <h2>Confirm Submission</h2>
            </div>
            <div className="modal-body">
              {isSubmitting ? (
                <div className="submitting-state">
                  <div className="spinner-small"></div>
                  <p className="submitting-message">Submitting your quiz...</p>
                </div>
              ) : (
                <>
                  {error && <p className="error-message">{error}</p>}
                  <p className="modal-message">Are you sure you want to submit your quiz?</p>
                  <div className="modal-stats">
                    <p className="stat-highlight">You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions</p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Go Back
              </button>
              <button 
                className="btn-confirm" 
                onClick={confirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    // Calculate score
    let correctCount = 0;
    const results = questions.map(question => {
      const userAnswer = submittedAttempt.answers.find(a => a.questionId === question._id);
      const userSelectionIndex = userAnswer?.selectedOptionIndexes?.[0];
      const correctOption = question.options.findIndex(opt => opt.isCorrect);
      const isCorrect = userSelectionIndex === correctOption;
      
      if (isCorrect) correctCount++;
      
      return {
        question,
        isCorrect,
        userSelectionIndex,
        correctOption,
        userAnswer: question.options[userSelectionIndex]?.text || 'Not answered',
        correctAnswer: question.options[correctOption]?.text
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Generate compliment based on score
    const getCompliment = (score) => {
      if (score === 100) return "🌟 Perfect! You're absolutely amazing!";
      if (score >= 90) return "🎉 Excellent! Outstanding performance!";
      if (score >= 80) return "👏 Great job! You really know your stuff!";
      if (score >= 70) return "💪 Good effort! You're on the right track!";
      if (score >= 60) return "📚 Keep it up! Every attempt helps you improve!";
      return "🚀 Don't worry! Practice makes perfect!";
    };

    return (
      <div className="quiz-test-container">
        <div className="results-container">
          <div className="results-header">
            <h1>Quiz Results</h1>
            <div className="compliment-message">{getCompliment(score)}</div>
            <div className="score-display">
              <div className="score-circle">
                <div className="score-number">{score}%</div>
                <div className="score-label">Score</div>
              </div>
              <div className="score-details">
                <p className="score-text">You answered correctly</p>
                <div className="score-stats">
                  <div className="stat-item">
                    <span className="stat-label">Correct</span>
                    <span className="stat-value">{correctCount}/{questions.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Percentage</span>
                    <span className="stat-value">{score}%</span>
                  </div>
                </div>
                <p className="quiz-title">{quiz?.title}</p>
              </div>
            </div>
          </div>

          <div className="results-review">
            <h2>Question Review</h2>
            {results.map((result, idx) => (
              <div key={result.question._id} className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="result-header">
                  <span className="result-number">Question {idx + 1}</span>
                  <span className={`result-badge ${result.isCorrect ? 'badge-correct' : 'badge-wrong'}`}>
                    {result.isCorrect ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>
                <div className="result-question-text">{result.question.text}</div>
                
                {result.question.imageUrl && (
                  <div className="result-image">
                    <img src={result.question.imageUrl} alt="Question" />
                  </div>
                )}

                <div className="result-answer-section">
                  <div className="answer-box your-answer">
                    <strong>Your Answer:</strong>
                    <p className={result.isCorrect ? 'text-green' : 'text-red'}>
                      {result.userAnswer || 'Not answered'}
                    </p>
                  </div>
                  
                  {!result.isCorrect && (
                    <div className="answer-box correct-answer">
                      <strong>Correct Answer:</strong>
                      <p className="text-green">{result.correctAnswer}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Comment Form */}
          <div className="comment-section">
            <h2>Share Your Feedback</h2>
            <form onSubmit={handleSubmitComment} className="comment-form">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share your thoughts about this quiz... (Comments are reviewed by admins before publishing)"
                rows="4"
                disabled={isSubmittingComment}
              />
              <button 
                type="submit" 
                className="btn-submit-comment"
                disabled={isSubmittingComment}
              >
                {isSubmittingComment ? 'Submitting...' : 'Submit Comment'}
              </button>
              {commentMessage && (
                <p className={`comment-message ${commentMessage.includes('Thank you') ? 'success' : 'error'}`}>
                  {commentMessage}
                </p>
              )}
            </form>
          </div>

          <div className="results-actions">
            <button className="btn-home" onClick={() => navigate('/')}>
              Home
            </button>
            <button className="btn-restart" onClick={() => {
              setIsSubmitted(false);
              setSubmittedAttempt(null);
              setAnswers({});
              setCurrentQuestionIndex(0);
              fetchQuizData();
            }}>
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="quiz-test-container">
      <div className="quiz-test-sidebar">
        <div className="quiz-info-box">
          <h3>{quiz?.title}</h3>
          <p className="faculty">{quiz?.faculty}</p>
          <p className="university">{quiz?.universityName}</p>
        </div>

        <div className="timer-box">
          <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>
            {formatTime(timeLeft)}
          </div>
          <p className="timer-label">Time Remaining</p>
        </div>

        <div className="progress-box">
          <p className="progress-label">Questions Progress</p>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>
          <p className="progress-text">{answeredCount} of {questions.length} answered</p>
        </div>

        <div className="question-list">
          <p className="list-title">Questions</p>
          <div className="questions-grid">
            {questions.map((q, idx) => (
              <button
                key={q._id}
                className={`question-indicator ${
                  idx === currentQuestionIndex ? 'active' : ''
                } ${answers[q._id] ? 'answered' : 'unanswered'}`}
                onClick={() => setCurrentQuestionIndex(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="submit-btn-sidebar" 
          onClick={handleSubmit}
          disabled={!areAllQuestionsAnswered()}
        >
          Submit Quiz
        </button>
      </div>

      <div className="quiz-test-main">
        <div className="quiz-top-header">
          <p className="question-counter">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>

        <div className="mobile-timer">
          <div className="mobile-timer-title">{quiz?.title}</div>
          <div className="mobile-timer-center">
            <div className={`timer ${timeLeft < 300 ? 'warning' : ''}`}>{formatTime(timeLeft)}</div>
            <div className="timer-label">Time Remaining</div>
          </div>
          <button 
            className="submit-btn-mobile" 
            onClick={handleSubmit}
            disabled={!areAllQuestionsAnswered()}
          >
            Submit
          </button>
        </div>
        {currentQuestion && (
          <>
            <QuestionCard
              question={currentQuestion}
              index={currentQuestionIndex}
              onAnswer={handleAnswerChange}
              selectedAnswer={answers[currentQuestion._id]}
            />

            <div className="navigation-buttons">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="nav-btn prev-btn"
              >
                ← Prev
              </button>

              {/* Question grid centered between buttons */}
              <div className="question-list-compact">
                <div className="questions-grid-compact">
                  {questions.map((q, idx) => (
                    <button
                      key={q._id}
                      ref={idx === currentQuestionIndex && window.innerWidth >= 1024 ? (el) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) : null}
                      className={`question-indicator-compact ${
                        idx === currentQuestionIndex ? 'active' : ''
                      } ${answers[q._id] ? 'answered' : 'unanswered'}`}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="nav-btn next-btn"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
