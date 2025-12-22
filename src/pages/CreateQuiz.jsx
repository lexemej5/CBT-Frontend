import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizzesAPI } from '../services/api';
import QuizForm from '../components/QuizForm';
import '../styles/create-quiz.css';

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateQuiz = async (formData) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await quizzesAPI.create({
        title: formData.title,
        description: formData.description,
        faculty: formData.faculty,
        universityName: formData.universityName,
        durationMinutes: formData.durationMinutes,
        questions: []
      });

      if (response.data._id) {
        navigate(`/admin/quiz/${response.data._id}/settings`);
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      setError(err.response?.data?.message || 'Failed to create quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="create-quiz-container">
      <div className="create-quiz-header">
        <h1>Create New Quiz</h1>
        <p>Set up your quiz with basic information</p>
      </div>

      {error && (
        <div className="error-alert">
          <p>{error}</p>
        </div>
      )}

      <div className="form-wrapper">
        <QuizForm 
          onSubmit={handleCreateQuiz}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
