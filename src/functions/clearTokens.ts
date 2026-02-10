export const clearTokens = () => {
  // Clear tokens from localStorage and sessionStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};