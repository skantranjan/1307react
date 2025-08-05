# SSO Implementation Setup Guide

## Overview
This React application now includes Azure AD SSO (Single Sign-On) authentication that integrates with your Fastify API backend.

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# API Backend URL (Fastify server)
REACT_APP_API_URL=http://localhost:3000

# Development Settings
REACT_APP_ENV=development
REACT_APP_DEBUG=true
```

## Components Added

### 1. Authentication Context (`src/contexts/AuthContext.tsx`)
- Manages authentication state across the application
- Provides login/logout functions
- Handles session checking with the backend

### 2. Protected Route Component (`src/components/ProtectedRoute.tsx`)
- Wraps routes that require authentication
- Redirects unauthenticated users to login
- Supports role-based access control

### 3. Login Component (`src/components/Login.tsx`)
- SSO login page with Microsoft button
- Handles redirects after authentication
- Clean, modern UI design

### 4. Updated Header Component (`src/components/Header.tsx`)
- Shows user information when authenticated
- Includes logout functionality
- Dropdown menu for user actions

## Updated Files

### 1. App.tsx
- Wrapped with AuthProvider
- All routes now protected with ProtectedRoute
- Added login route

### 2. API Utils (`src/utils/api.ts`)
- Updated to use session-based authentication
- Removed hardcoded Bearer token
- Added credentials inclusion for cookies

## How It Works

1. **User visits protected route** → Redirected to `/login`
2. **User clicks "Sign in with Microsoft"** → Redirected to Azure AD
3. **User authenticates with Microsoft** → Redirected back to backend callback
4. **Backend creates session** → User redirected to original destination
5. **All API calls include session cookies** → Authenticated requests

## Testing the Implementation

1. Start your Fastify backend server
2. Start the React development server: `npm start`
3. Visit any protected route (e.g., `/cm-dashboard`)
4. You should be redirected to the login page
5. Click "Sign in with Microsoft" to test SSO

## Security Features

- **Session-based authentication** (no tokens in frontend)
- **Automatic redirects** for unauthenticated users
- **Role-based access control** support
- **Secure cookie handling** with credentials inclusion
- **Clean logout** with session termination

## Backend Integration

The frontend expects these backend endpoints:
- `GET /auth/login` - Initiate SSO
- `GET /auth/callback` - Handle Azure AD callback
- `GET /auth/logout` - Logout user
- `GET /auth/user` - Get current user info
- `GET /auth/status` - Check authentication status

## Troubleshooting

1. **CORS Issues**: Ensure backend allows credentials
2. **Session Issues**: Check cookie settings in backend
3. **Redirect Issues**: Verify Azure AD redirect URIs
4. **API Errors**: Check network tab for authentication failures

## Next Steps

1. Test the complete authentication flow
2. Customize the login page styling if needed
3. Add role-based route protection
4. Implement user profile features
5. Add error handling for authentication failures 