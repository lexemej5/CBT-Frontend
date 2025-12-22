import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAPI, quizzesAPI } from '../services/api';
import '../styles/question-uploader.css';

export default function QuestionUploader({ quizId, onQuestionsAdded, onClose }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleFileChange = (e) => {
    console.log('🔍 handleFileChange triggered');
    const selectedFile = e.target.files?.[0];
    console.log('📁 Selected file:', selectedFile);
    
    if (selectedFile) {
      const ext = selectedFile.name.toLowerCase().split('.').pop();
      console.log('📌 File extension:', ext);
      
      if (!['pdf', 'docx'].includes(ext)) {
        console.error('❌ Invalid extension:', ext);
        setError('Only PDF and DOCX files are allowed');
        setFile(null);
        return;
      }
      console.log('✓ File is valid, setting state');
      // Clear any previous preview/edited questions when selecting a new file
      setEditedQuestions([]);
      setPreview(null);
      setError('');
      setFile(selectedFile);
      console.log('✓ File state updated:', { name: selectedFile.name, size: selectedFile.size });
    } else {
      console.warn('⚠️ No file selected');
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('📤 Uploading file:', { 
        name: file.name, 
        type: file.type,
        size: file.size
      });
      
      const response = await uploadAPI.preview(file);
      
      console.log('✓ Preview response:', response.data);
      
      if (!response.data.questions || response.data.questions.length === 0) {
        setError('No questions found in file. Please check the file format.');
        setLoading(false);
        return;
      }
      
      setPreview(response.data);
      // Normalize questions: ensure only one correct answer per question (pick first detected)
      const normalized = response.data.questions.map((q, idx) => {
        const options = q.options || [];
        const firstCorrect = options.findIndex(o => o.isCorrect);
        const normalizedOptions = options.map((o, i) => ({
          ...o,
          isCorrect: firstCorrect !== -1 ? i === firstCorrect : !!o.isCorrect
        }));
        return {
          ...q,
          id: `q-${idx}`,
          selected: true,
          options: normalizedOptions
        };
      });
      setEditedQuestions(normalized);
      console.log('✓ Questions loaded and ready for editing');
    } catch (err) {
      console.error('❌ Preview error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error message:', err.message);
      
      // Check for payment error (402)
      if (err.response?.status === 402) {
        setError('Payment required to upload questions. Redirecting to payment page...');
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to parse file');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (questionId, field, value) => {
    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? { ...q, [field]: value }
          : q
      )
    );
  };

  const handleOptionChange = (questionId, optionIndex, field, value) => {
    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) =>
                idx === optionIndex ? { ...opt, [field]: value } : opt
              )
            }
          : q
      )
    );
  };

  const handleAddOption = (questionId) => {
    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: [...q.options, { label: String.fromCharCode(65 + q.options.length), text: '', isCorrect: false }]
            }
          : q
      )
    );
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === questionId && q.options.length > 2
          ? {
              ...q,
              options: q.options.filter((_, idx) => idx !== optionIndex)
            }
          : q
      )
    );
  };

  const handleToggleQuestion = (questionId) => {
    setEditedQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, selected: !q.selected } : q
      )
    );
  };

  const handleDeleteQuestion = (questionId) => {
    setEditedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleSaveQuestions = async () => {
    const selectedQuestions = editedQuestions
      .filter(q => q.selected)
      .map(q => ({
        text: q.text,
        options: q.options,
        points: q.points || 1
      }));

    if (selectedQuestions.length === 0) {
      setError('Please select at least one question to save');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');
      console.log('Saving questions, quizId:', quizId);
      const response = await uploadAPI.saveQuestions(selectedQuestions);
      console.log('Saved questions response:', response.data);

      // Add questions to quiz
      if (quizId && response.data.questions) {
        console.log(`Adding ${response.data.questions.length} questions to quiz ${quizId}`);
        const failedAdds = [];
        for (const question of response.data.questions) {
          try {
            console.log('Adding question:', question._id);
            await quizzesAPI.addQuestion(quizId, question._id);
          } catch (addErr) {
            console.error('Failed to add question to quiz:', addErr);
            failedAdds.push(question._id);
          }
        }
        if (failedAdds.length > 0) {
          setError(`Saved ${response.data.questions.length} questions but failed to add ${failedAdds.length} to quiz`);
          return;
        }
        console.log('All questions added to quiz successfully');
      } else {
        console.warn('No quizId or questions returned:', { quizId, questions: response.data.questions });
        setError('Failed to add questions to quiz: missing quiz ID or questions');
        return;
      }

      if (onQuestionsAdded) {
        onQuestionsAdded(response.data.questions);
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setEditedQuestions([]);
      if (onClose) onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Failed to save questions');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="question-uploader">
      <div className="uploader-header">
        <h3>Upload Questions from File</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {!preview ? (
        <div className="upload-section">
          <div className="file-input-wrapper">
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              onChange={handleFileChange}
              accept=".pdf,.docx"
              disabled={loading}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="file-input-label"
              onClick={(e) => {
                e.preventDefault();
                console.log('🖱️ Button clicked, opening file dialog');
                  // Reset input value so selecting the same file name again triggers onChange
                  try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch(_) {}
                  fileInputRef.current?.click();
              }}
            >
              {file ? `✓ ${file.name}` : '📁 Choose PDF or DOCX file...'}
            </button>
          </div>

          <button
            className="btn-preview"
            onClick={handlePreview}
            disabled={!file || loading}
          >
            {loading ? 'Parsing...' : 'Preview Questions'}
          </button>

          <div className="upload-info">
            <p>📄 Supported formats: PDF, DOCX</p>
            <p>📋 Format: Questions with options A-H and answer indicators</p>
            <p>✏️ You'll be able to edit all questions before saving</p>
          </div>
        </div>
      ) : (
        <div className="preview-section">
          <div className="preview-header">
            <h4>Parsed Questions ({preview.questionsCount})</h4>
            <div className="preview-info">
              <span>File: {preview.fileName}</span>
              <span>•</span>
              <span>Size: {(preview.fileSize / 1024).toFixed(2)} KB</span>
            </div>
          </div>

          <div className="questions-preview">
            {editedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`preview-question ${!q.selected ? 'disabled' : ''}`}
              >
                  <div className="question-header">
                  <label
                    className="question-checkbox"
    
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleQuestion(q.id); }}
                  >
                    <input
                      type="checkbox"
                      checked={q.selected}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    />
                    <span className="q-num">Q{idx + 1}</span>
                  </label>
                  <button
                    className="btn-delete-question"
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Remove this question"
                  >
                    🗑️
                  </button>
                </div>

                <div className="question-body">
                  <textarea
                    value={q.text}
                    onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                    className="question-text"
                    rows="2"
                    disabled={!q.selected}
                  />

                  <div className="options-container">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="option-row">
                        <span className="opt-label">{opt.label}</span>
                        <div className="option-text-wrapper">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) =>
                              handleOptionChange(q.id, optIdx, 'text', e.target.value)
                            }
                            placeholder={`Option ${opt.label}`}
                            disabled={!q.selected}
                          />
                        </div>
                        <label
                          className="option-radio"
                          onPointerDown={(e) => { e.preventDefault(); }}
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            if (!q.selected) return;
                            const updatedQuestions = editedQuestions.map(question => {
                              if (question.id === q.id) {
                                return {
                                  ...question,
                                  options: question.options.map((o, idx) => ({
                                    ...o,
                                    isCorrect: idx === optIdx
                                  }))
                                };
                              }
                              return question;
                            });
                            setEditedQuestions(updatedQuestions);
                          }}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={opt.isCorrect}
                            readOnly
                            disabled={!q.selected}
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onFocus={(e) => e.target.blur()}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                            aria-hidden="true"
                          />
                          <span className={`checkmark ${opt.isCorrect ? 'checked' : ''}`} aria-hidden>
                            ✓
                          </span>
                        </label>
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            className="btn-remove-option"
                            onClick={() => handleRemoveOption(q.id, optIdx)}
                            disabled={!q.selected}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-add-option"
                    onClick={() => handleAddOption(q.id)}
                    disabled={!q.selected || q.options.length >= 8}
                  >
                    + Add Option
                  </button>

                  <div className="points-input">
                    <label>Points:</label>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => handleQuestionChange(q.id, 'points', parseInt(e.target.value) || 1)}
                      disabled={!q.selected}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="preview-actions">
            <button
              className="btn-back"
              onClick={() => {
                setPreview(null);
                setEditedQuestions([]);
                setFile(null);
              }}
            >
              ← Back
            </button>
            <button
              className="btn-save-all"
              onClick={handleSaveQuestions}
              disabled={saveLoading || editedQuestions.filter(q => q.selected).length === 0}
            >
              {saveLoading ? 'Saving...' : `Save ${editedQuestions.filter(q => q.selected).length} Questions`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
