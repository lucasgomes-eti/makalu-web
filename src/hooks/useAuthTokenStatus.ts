import { useState, useEffect } from 'react';
import installAuth from '@/functions/installAuth';

export const useAuthTokenStatus = (): { hasToken: boolean; isLoading: boolean } => {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check localStorage first
    const accessTokenLocal = localStorage.getItem('access_token');
    const refreshTokenLocal = localStorage.getItem('refresh_token');

    if (accessTokenLocal && refreshTokenLocal) {
      setHasToken(true);
      setIsLoading(false);
      installAuth(accessTokenLocal);
      return;
    }

    // Check sessionStorage if not found in localStorage
    const accessTokenSession = sessionStorage.getItem('access_token');
    const refreshTokenSession = sessionStorage.getItem('refresh_token');

    if (accessTokenSession && refreshTokenSession) {
      setHasToken(true);
      setIsLoading(false);
      installAuth(accessTokenSession);
      return;
    }

    // No tokens found
    setHasToken(false);
    setIsLoading(false);
  }, []);

  return { hasToken, isLoading };
};
