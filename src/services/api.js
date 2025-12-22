import axios from 'axios';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// If an apiKey is stored (from a previous login), ensure axios includes it immediately
try {
  const storedKey = localStorage.getItem('apiKey');
  if (storedKey) api.defaults.headers.common['x-api-key'] = storedKey;
} catch (e) {
  // localStorage may be unavailable in some environments; ignore
}

// Create a separate instance for file uploads (without Content-Type header)
const uploadAPI_instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Questions API
export const questionsAPI = {
  getAll: () => api.get('/questions'),
  getById: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`)
};

// Upload API
export const uploadAPI = {
  preview: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  saveQuestions: (questions) => api.post('/uploads/save-questions', { questions })
};

// Quizzes API
export const quizzesAPI = {
  getAll: () => api.get('/quizzes'),
  getById: (id) => api.get(`/quizzes/${id}`),
  getWithQuestions: (id) => api.get(`/quizzes/${id}/questions`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  addQuestion: (quizId, questionId) => api.post('/quizzes/add-question', { quizId, questionId }),
  removeQuestion: (quizId, questionId) => api.post('/quizzes/remove-question', { quizId, questionId })
};

// Attempts API
export const attemptsAPI = {
  submit: (data) => api.post('/attempts', data),
  getByUser: () => api.get('/attempts')
};

// Comments API
export const commentsAPI = {
  create: (data) => api.post('/comments', data),
  getApproved: (quizId) => api.get(`/comments/${quizId}/approved`),
  getPending: () => api.get('/comments/admin/pending'),
  approve: (commentId) => api.put(`/comments/${commentId}/approve`),
  delete: (commentId) => api.delete(`/comments/${commentId}`)
};

export default api;
