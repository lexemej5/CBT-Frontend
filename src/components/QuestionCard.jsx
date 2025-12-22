import { useState } from 'react';
import '../styles/question-card.css';

export default function QuestionCard({ question, index, onAnswer, selectedAnswer }) {
  const [expanded, setExpanded] = useState(false);

  const handleAnswerSelect = (optionIndex) => {
    // Send the numeric index of the selected answer
    onAnswer(question._id, optionIndex);
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">Question {index + 1}</div>
        <div className={`answer-status ${selectedAnswer ? 'answered' : 'unanswered'}`}>
          {selectedAnswer ? '✓ Answered' : '○ Not answered'}
        </div>
      </div>

      <div className="question-text">
        <h3>{question.text}</h3>
      </div>

      {question.imageUrl && (
        <div className="question-image">
          <img src={question.imageUrl} alt="Question" />
        </div>
      )}

      <div className="options-container">
        {question.options && question.options.map((option, idx) => (
          <label key={idx} className="option">
            <input
              type="radio"
              name={`question-${question._id}`}
              value={idx}
              checked={selectedAnswer === idx}
              onChange={() => handleAnswerSelect(idx)}
            />
            <span className="option-text">{option.text || option.label || String(option)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
