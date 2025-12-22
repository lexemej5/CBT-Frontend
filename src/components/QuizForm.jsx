import { useState } from 'react';
import '../styles/quiz-form.css';

export default function QuizForm({ initialData, onSubmit, isLoading }) {
  // support minutes + seconds input; initialData.durationMinutes may be a float
  const toInit = (initialData) => {
    if (!initialData) return {
      title: '',
      description: '',
      faculty: '',
      universityName: '',
      durationMinutes: 60,
      durationSeconds: 0
    };
    const dm = Number(initialData.durationMinutes) || 0;
    const mins = Math.floor(dm);
    const secs = Math.round((dm - mins) * 60);
    return {
      ...initialData,
      durationMinutes: mins,
      durationSeconds: secs
    };
  };

  const [formData, setFormData] = useState(toInit(initialData));

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.faculty.trim()) newErrors.faculty = 'Faculty is required';
    if (!formData.universityName.trim()) newErrors.universityName = 'University name is required';
    const totalSeconds = (Number(formData.durationMinutes || 0) * 60) + (Number(formData.durationSeconds || 0));
    if (totalSeconds < 1) newErrors.durationMinutes = 'Duration must be at least 1 second';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'durationMinutes' || name === 'durationSeconds') ? (parseInt(value) || 0) : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // compute durationMinutes as minutes + seconds/60 to keep same backend field
      const minutes = Number(formData.durationMinutes || 0);
      const seconds = Number(formData.durationSeconds || 0);
      const payload = {
        ...formData,
        durationMinutes: minutes + (seconds / 60)
      };
      onSubmit(payload);
    }
  };

  return (
    <form className="quiz-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">Quiz Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter quiz title"
          className={errors.title ? 'error' : ''}
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter quiz description"
          rows="3"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="universityName">University Name *</label>
          <input
            type="text"
            id="universityName"
            name="universityName"
            value={formData.universityName}
            onChange={handleChange}
            placeholder="e.g., University of Example"
            className={errors.universityName ? 'error' : ''}
          />
          {errors.universityName && <span className="error-message">{errors.universityName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="faculty">Faculty *</label>
          <input
            type="text"
            id="faculty"
            name="faculty"
            value={formData.faculty}
            onChange={handleChange}
            placeholder="e.g., Engineering, Medicine"
            className={errors.faculty ? 'error' : ''}
          />
          {errors.faculty && <span className="error-message">{errors.faculty}</span>}
        </div>
      </div>

      <div className="form-group">
        <label>Duration *</label>
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          <div style={{flex: '1'}}>
            <input
              type="number"
              id="durationMinutes"
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              min="0"
              placeholder="Minutes"
              className={errors.durationMinutes ? 'error' : ''}
            />
            <div className="small-label">Minutes</div>
          </div>
          <div style={{width: '110px'}}>
            <input
              type="number"
              id="durationSeconds"
              name="durationSeconds"
              value={formData.durationSeconds}
              onChange={handleChange}
              min="0"
              max="59"
              placeholder="Seconds"
              className={errors.durationMinutes ? 'error' : ''}
            />
            <div className="small-label">Seconds</div>
          </div>
        </div>
        {errors.durationMinutes && <span className="error-message">{errors.durationMinutes}</span>}
      </div>

      <button type="submit" className="submit-btn" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Quiz'}
      </button>
    </form>
  );
}
