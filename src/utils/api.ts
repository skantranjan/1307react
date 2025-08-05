// API utility functions with session-based authentication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper function to create headers with session cookies
const createHeaders = (contentType?: string): HeadersInit => {
  const headers: HeadersInit = {};
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
};

// GET request helper
export const apiGet = async (endpoint: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: createHeaders(),
    credentials: 'include' // Include cookies for session authentication
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// POST request helper
export const apiPost = async (endpoint: string, data: any, contentType: string = 'application/json'): Promise<any> => {
  const body = contentType === 'application/json' ? JSON.stringify(data) : data;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: createHeaders(contentType),
    credentials: 'include', // Include cookies for session authentication
    body
  });
  
  if (!response.ok) {
    // Try to get the error message from the response
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = `${errorMessage} - ${errorData.message}`;
      }
    } catch (e) {
      // If we can't parse the response, use the status text
      errorMessage = `${errorMessage} - ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
};

// PUT request helper
export const apiPut = async (endpoint: string, data: any, contentType: string = 'application/json'): Promise<any> => {
  const body = contentType === 'application/json' ? JSON.stringify(data) : data;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: createHeaders(contentType),
    credentials: 'include', // Include cookies for session authentication
    body
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// PATCH request helper
export const apiPatch = async (endpoint: string, data: any): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: createHeaders('application/json'),
    credentials: 'include', // Include cookies for session authentication
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// DELETE request helper
export const apiDelete = async (endpoint: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: createHeaders(),
    credentials: 'include' // Include cookies for session authentication
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// For FormData requests (no Content-Type header needed)
export const apiPostFormData = async (endpoint: string, formData: FormData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include', // Include cookies for session authentication
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export const apiPutFormData = async (endpoint: string, formData: FormData): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    credentials: 'include', // Include cookies for session authentication
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}; 