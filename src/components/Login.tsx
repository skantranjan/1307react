import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { isAuthenticated, isLoading, login, error } = useAuth();
  const location = useLocation();

  // If already authenticated, redirect to the intended destination or dashboard
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#333', 
            marginBottom: '10px',
            fontSize: '28px'
          }}>
            Welcome to Sustainability Portal
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '16px',
            margin: '0'
          }}>
            Sign in with your Microsoft account
          </p>
        </div>

        <button
          onClick={login}
          style={{
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            marginBottom: '20px',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#106ebe';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#0078d4';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="currentColor">
            <path d="M10 0h10v10H10zM0 10h10v10H0z"/>
          </svg>
          Sign in with Microsoft
        </button>

                 <div style={{
           fontSize: '14px',
           color: '#666',
           lineHeight: '1.5'
         }}>
           <p>By signing in, you agree to our terms of service and privacy policy.</p>
         </div>
         
         {error && (
           <div style={{
             marginTop: '20px',
             padding: '12px',
             backgroundColor: '#f8d7da',
             color: '#721c24',
             borderRadius: '4px',
             fontSize: '14px',
             textAlign: 'left'
           }}>
             <strong>Error:</strong> {error}
           </div>
         )}
       </div>
     </div>
   );
 };

export default Login; 