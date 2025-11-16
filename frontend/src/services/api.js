import axios, { AxiosHeaders } from 'axios';
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
    timeout: 10000
});
apiClient.interceptors.request.use((config) => {
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set('Content-Type', 'application/json');
    config.headers = headers;
    return config;
});
export const fetchPersona = async (token) => {
    const response = await apiClient.get('/persona', {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data ?? null;
};
export const fetchMessages = async (personaId, token) => {
    const response = await apiClient.get(`/persona/${personaId}/chat`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 25 }
    });
    return response.data.messages;
};
export const chatWithPersona = async (personaId, text, token) => {
    const response = await apiClient.post(`/persona/${personaId}/chat`, { text, clientMessageId: crypto.randomUUID() }, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;
};
