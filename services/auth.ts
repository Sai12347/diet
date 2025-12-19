const API_URL = 'http://localhost:3001/api';
const SESSION_KEY = 'befit_session';
const FB_USERS_KEY = 'befit_fb_users'; // Fallback users storage

// Helper to check if backend is down and run fallback
const tryApi = async <T>(apiCall: () => Promise<T>, fallback: () => T): Promise<T> => {
  try {
    return await apiCall();
  } catch (error: any) {
    // Only fallback on network errors (failed to fetch)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      console.warn("Backend unreachable. Using local storage fallback.");
      return fallback();
    }
    throw error;
  }
};

export const register = async (name: string, email: string, password: string) => {
  return tryApi(
    async () => {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      localStorage.setItem(SESSION_KEY, email);
      return true;
    },
    () => {
      const users = JSON.parse(localStorage.getItem(FB_USERS_KEY) || '{}');
      if (users[email]) throw new Error("User already exists");
      users[email] = { name, email, password };
      localStorage.setItem(FB_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(SESSION_KEY, email);
      return true;
    }
  );
};

export const login = async (email: string, password: string) => {
  return tryApi(
    async () => {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Login failed');
      }

      localStorage.setItem(SESSION_KEY, email);
      return true;
    },
    () => {
      const users = JSON.parse(localStorage.getItem(FB_USERS_KEY) || '{}');
      const user = users[email];
      if (user && user.password === password) {
        localStorage.setItem(SESSION_KEY, email);
        return true;
      }
      throw new Error("Invalid credentials");
    }
  );
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSession = () => {
  return localStorage.getItem(SESSION_KEY);
};

export const getCurrentUserEmail = () => {
  return localStorage.getItem(SESSION_KEY);
};

export const getCurrentUserName = async () => {
    const email = getSession();
    if (!email) return '';
    
    return tryApi(
      async () => {
        const res = await fetch(`${API_URL}/user?email=${email}`);
        if(res.ok) {
            const data = await res.json();
            return data?.name || '';
        }
        return '';
      },
      () => {
        const users = JSON.parse(localStorage.getItem(FB_USERS_KEY) || '{}');
        return users[email]?.name || '';
      }
    );
};