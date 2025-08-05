import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <div className="top-nav flex">
      <img src="/images/logo.png" alt="Haleon Logo" className="logoImage" data-themekey="#" />
      <h2>Sustainability Data Portal</h2>
      <ul className="flex">
        <li><a href="#"><i className="ri-home-5-line"></i> Home </a></li>
        <li><a href="#"> <i className="ri-information-line"></i> About</a></li>
        <li><a href="#"><i className="ri-mail-line"></i> Contact</a></li>
        {isAuthenticated && user && (
          <li style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="ri-user-line"></i>
              {user.name || user.email}
              <i className="ri-arrow-down-s-line"></i>
            </button>
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                minWidth: '200px',
                zIndex: 1000
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #eee',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {user.name}
                  </div>
                  <div>{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#dc3545',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <i className="ri-logout-box-r-line"></i>
                  Sign Out
                </button>
              </div>
            )}
          </li>
        )}
      </ul>
    </div>
  );
};

export default Header; 