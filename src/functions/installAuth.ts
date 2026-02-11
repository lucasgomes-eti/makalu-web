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

    http.interceptors.response.use(
        function (response) {
            return response;
        },
        async function (error) {
            const originalRequest = error.config;

            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    // Get refresh token from storage
                    let refreshToken = localStorage.getItem('refresh_token');
                    
                    if (!refreshToken) {
                        refreshToken = sessionStorage.getItem('refresh_token');
                    }

                    if (!refreshToken) {
                        return Promise.reject(error);
                    }

                    // Call refresh endpoint
                    const refreshResponse = await http.post('/auth/refresh', {
                        refresh_token: refreshToken,
                    });

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

                    // Update the authorization header
                    originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;

                    // Retry the original request
                    return http(originalRequest);
                } catch (refreshError) {
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
}

export default installAuth;