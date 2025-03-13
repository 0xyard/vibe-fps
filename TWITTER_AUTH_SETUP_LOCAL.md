# Setting Up Twitter Authentication for Local Development

This document provides instructions on how to set up Twitter authentication for local development of the Vibe FPS game.

## 1. Update Twitter Developer App Settings

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Select your app
3. Go to "Settings" > "User authentication settings"
4. Make sure the following settings are configured:
   - App permissions: Read
   - Type of App: Web App
   - Callback URL: `https://efxquilvabdsopguulja.supabase.co/auth/v1/callback`
   - Website URL: `http://localhost:3000`
5. Save your changes

## 2. Update Supabase Authentication Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Authentication" > "URL Configuration"
4. Add `http://localhost:3000` to the "Site URL" (if it's not already there)
5. Add the following URLs to the "Redirect URLs" list:
   - `http://localhost:3000`
   - `http://localhost:3000/auth-callback.html`
6. Save your changes

## 3. Verify Twitter Provider is Enabled

1. In your Supabase dashboard, go to "Authentication" > "Providers"
2. Make sure Twitter is toggled ON
3. Verify your Twitter API Key and API Secret Key are entered correctly
4. Save your changes

## 4. Understanding JWT Authentication

Supabase uses JWT (JSON Web Tokens) for authentication. Here's how it works:

1. When a user logs in with Twitter, Supabase generates a JWT token
2. This token contains user information and is signed with your project's JWT secret
3. The token is stored in the browser's localStorage
4. The token is sent with each request to Supabase to authenticate the user
5. Tokens expire after a certain period, but Supabase handles token refresh automatically

The auth flow in this project handles JWT tokens in these files:
- `auth-callback.html`: Exchanges the OAuth code for a JWT session
- `twitter-auth.js`: Manages the JWT session and user state
- `game.js`: Handles auth redirects and token exchange

## 5. Testing the Authentication Flow

1. Start your local development server (e.g., `python -m http.server 3000` or similar)
2. Open `http://localhost:3000` in your browser
3. Click the "Login with Twitter" button
4. You should be redirected to Twitter for authentication
5. After authenticating, you should be redirected to the auth-callback.html page
6. The callback page will exchange the code for a JWT session
7. You'll be redirected back to the game with an active session
8. Check the browser console for any error messages

## 6. Debugging Authentication Issues

If you encounter issues:

1. **404 Error after Twitter redirect**: Make sure your callback URL is exactly `https://efxquilvabdsopguulja.supabase.co/auth/v1/callback` in your Twitter Developer App settings.

2. **CORS Issues**: Make sure your domain (`http://localhost:3000`) is added to the allowed domains in Supabase.

3. **Callback Not Working**: Verify that `auth-callback.html` exists in your project root and contains the correct code to handle the OAuth callback.

4. **JWT Token Issues**: 
   - Open your browser's developer tools
   - Go to the Application tab > Storage > Local Storage
   - Look for entries with keys like `sb-<project-id>-auth-token`
   - If these are missing, the JWT token wasn't properly stored

5. **Debug Mode**: Press the 'D' key on the auth-callback.html page to show debug information about the authentication process.

6. **Console Errors**: Check your browser's developer console for specific error messages that can help identify the issue.

7. **Network Tab**: In your browser's developer tools, check the Network tab for failed requests and their response details.

## 7. Production Deployment

When deploying to production:

1. Add your production domain to both Twitter Developer App settings and Supabase URL Configuration.
2. The code is designed to use the current origin, so it will automatically work in production without code changes. 