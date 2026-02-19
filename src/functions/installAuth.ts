import http from "@/components/http"

const installAuth = (accessToken: string) => {
    http.interceptors.request.use(
        function (config) {
            config.headers["Authorization"] = "Bearer " + accessToken;
            return config;
        },
        function (error) {
            return Promise.reject(error);
        }
    );

    createSilentRefreshInterceptor();
}

function createSilentRefreshInterceptor() {
    const interceptor = http.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status !== 401) {
                return Promise.reject(error);
            }

            http.interceptors.response.eject(interceptor);

            let refreshToken = localStorage.getItem('refresh_token');
                    
            if (!refreshToken) {
                refreshToken = sessionStorage.getItem('refresh_token');
            }

            if (!refreshToken) {
                return Promise.reject(error);
            }

            return http.post('/auth/refresh', {
                refresh_token: refreshToken,
            })
            .then((refreshResponse) => {
                const newAccessToken = refreshResponse.data.access_token;
                const newRefreshToken = refreshResponse.data.refresh_token;

                // Update tokens in storage
                const isLocalStorage = localStorage.getItem('refresh_token') !== null;
                    
                if (isLocalStorage) {
                    localStorage.setItem('access_token', newAccessToken);
                    localStorage.setItem('refresh_token', newRefreshToken);
                } else {
                    sessionStorage.setItem('access_token', newAccessToken);
                    sessionStorage.setItem('refresh_token', newRefreshToken);
                }

                error.response.config.headers['Authorization'] = 'Bearer ' + newAccessToken;

                // Retry the original request
                return http(error.response.config);
            })
            .catch((refreshError) => {
                console.error('Failed to refresh token:', refreshError);
                // Clear tokens from storage
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('refresh_token');
                // Optionally, redirect to login page
                window.location.href = '/sign-in';
                return Promise.reject(refreshError);
            })
            .finally(createSilentRefreshInterceptor);
        }
    );
}

export default installAuth;