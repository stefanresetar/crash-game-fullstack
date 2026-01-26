// frontend/src/api.ts
const API_URL = 'http://localhost:8443/api'; 

export const loginUser = async (username: string, password: string) => {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Response error.');
        }

        return data; 
    } catch (error) {
        throw error;
    }
};