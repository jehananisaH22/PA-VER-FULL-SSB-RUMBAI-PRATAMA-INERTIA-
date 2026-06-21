import axios from 'axios'; 
window.axios = axios; 

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'; 
window.axios.defaults.withCredentials = true; 
window.axios.defaults.xsrfCookieName = 'XSRF-TOKEN'; 
window.axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN'; 

window.refreshCsrfToken = (csrfToken = null) => {
  const tokenMeta = document.head.querySelector('meta[name="csrf-token"]'); 
  const token = csrfToken || tokenMeta?.content || window.axios.defaults.headers.common['X-CSRF-TOKEN'] || ''; 

  if (token) {
    if (tokenMeta) {
      tokenMeta.setAttribute('content', token);
    } 

    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
  } 

  return token;
}; 

window.refreshCsrfToken(); 

window.axios.interceptors.request.use((config) => {
  const token = window.refreshCsrfToken?.(); 

  if (token) {
    config.headers = config.headers || {}; 
    config.headers['X-CSRF-TOKEN'] = token;
  } 

  return config;
}); 

window.axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config; 

    if (error?.response?.status === 419 && originalRequest && !originalRequest.__csrfRetried) {
      originalRequest.__csrfRetried = true; 

      try {
        const response = await axios.get('/api/csrf-token', { 
          headers: { 'X-Requested-With': 'XMLHttpRequest' }, 
          withCredentials: true
        }); 
        const token = window.refreshCsrfToken?.(response?.data?.csrfToken); 

        if (token) {
          originalRequest.headers = originalRequest.headers || {}; 
          originalRequest.headers['X-CSRF-TOKEN'] = token;
        } 

        return window.axios(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    } 

    return Promise.reject(error);
  }
);
