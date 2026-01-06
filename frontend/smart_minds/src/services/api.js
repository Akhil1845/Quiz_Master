import config from '../config';

// Backend API base URL
const API_BASE_URL = config.API_BASE_URL;

const api = {
  // Regular email/password login
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  // Register new user
  register: async (username, email, password) => {
    const endpoint = `${API_BASE_URL}/auth/register`;
    
    const requestBody = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password
    };
    
    console.log('Sending registration request to:', endpoint);
    console.log('Request body:', requestBody);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await handleResponse(response);
      console.log('Registration successful:', responseData);
      return responseData;
      
    } catch (error) {
      console.error('Registration error:', error);
      // If the error is from the server, use its message
      if (error.data && error.data.message) {
        throw new Error(error.data.message);
      }
      // Otherwise, use a generic error message
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  },

  // Google OAuth login/signup
  googleAuth: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  },

  // Set username for Google signup
  setUsername: async (email, username) => {
    const response = await fetch(`${API_BASE_URL}/auth/set-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        email, 
        username 
      }),
    });
    
    try {
      const result = await handleResponse(response);
      return result;
    } catch (error) {
      console.error('Set username error:', error);
      throw error;
    }
  },
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const responseText = await response.text();
  let data;
  
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    data = { message: responseText };
  }
  
  if (!response.ok) {
    // If the response is a 400 or 409, it likely contains a validation error message
    if ((response.status === 400 || response.status === 409) && data.message) {
      throw new Error(data.message);
    }
    
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    error.response = response;
    throw error;
  }
  
  return data;
};

export default api;
