# Twitter Authentication Setup for Vibe FPS

This document provides instructions on how to set up optional Twitter authentication for the Vibe FPS game using Supabase.

## Overview

The game allows players to optionally log in with their Twitter accounts. Players can also:
- Use a custom username by editing the pre-filled random name
- Keep the automatically generated random username
- Continue using their chosen name even if they later log in with Twitter

## Prerequisites

1. A Twitter Developer Account
2. A Supabase project (you're already using one for the leaderboard)

## Step 1: Enable Twitter Auth in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to "Authentication" in the left sidebar
4. Click on "Providers"
5. Find "Twitter" in the list of providers and click on it
6. Toggle the "Enable" switch to enable Twitter authentication
7. You'll need to provide an API Key and API Secret Key from Twitter (we'll get these in the next step)

## Step 2: Set Up Twitter Developer App

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. Go to the app settings
4. Under "Authentication settings", enable "3-legged OAuth"
5. Add your Supabase auth callback URL: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - You can find your project ref in the Supabase dashboard URL or in the API settings
6. Save your changes
7. Copy the API Key (Consumer Key) and API Secret Key (Consumer Secret)
8. Paste these values into the Supabase Twitter authentication provider setup

## Step 3: Configure Redirect URLs in Supabase

1. Go to your Supabase project
2. Navigate to "Authentication" > "URL Configuration"
3. Add your website URL to the "Site URL" field
4. Add the following URLs to the "Redirect URLs" list:
   - Your main website URL (e.g., `https://yourgame.com`)
   - Your auth callback page URL (e.g., `https://yourgame.com/auth-callback.html`)
5. Save your changes

## Step 4: Update Supabase Database

You'll need to update your database schema to include Twitter user information and link scores to user accounts:

1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Run the following SQL to add Twitter columns to your leaderboard table:

```sql
-- Add Twitter columns if they don't exist
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS twitter_id TEXT,
ADD COLUMN IF NOT EXISTS twitter_username TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create an index for faster queries by user_id
CREATE INDEX IF NOT EXISTS leaderboard_user_id_idx ON leaderboard(user_id);
```

## Step 5: Set Up Row Level Security (Optional but Recommended)

For better security, you can set up Row Level Security (RLS) to control access to your leaderboard data:

```sql
-- Enable RLS on the leaderboard table
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read all scores
CREATE POLICY "Anyone can read scores" 
ON leaderboard FOR SELECT 
USING (true);

-- Create a policy that allows authenticated users to insert their own scores
CREATE POLICY "Users can insert their own scores" 
ON leaderboard FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to update only their own scores
CREATE POLICY "Users can update their own scores" 
ON leaderboard FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Create a policy that allows anonymous users to insert scores (for non-Twitter users)
CREATE POLICY "Anonymous users can insert scores" 
ON leaderboard FOR INSERT 
TO anon
WITH CHECK (user_id IS NULL);
```

## Step 6: Test Your Integration

1. Deploy your updated game
2. Test all three username scenarios:
   - Edit the pre-filled random username to use a custom name
   - Keep the automatically generated random username
   - Log in with Twitter to use your Twitter display name (if no custom name is set)
3. Verify that scores are properly recorded in each case
4. Check that Twitter profile information appears correctly when logged in

## Troubleshooting

- **Popup Blocked**: Make sure to allow popups for your game domain
- **CORS Issues**: Ensure your Supabase project has the correct domains listed in the API settings
- **Authentication Errors**: Check the browser console for specific error messages
- **Username Priority**: If a player's custom username isn't being used, check the getPlayerName function in leaderboard.js and ensure the username priority logic is working correctly
- **404 Errors**: If you get a 404 error after Twitter authentication, make sure your callback URL is correctly set up in both Twitter and Supabase
- **Callback Issues**: Verify that your auth-callback.html page exists and contains the correct code to handle the OAuth callback

## Security Considerations

- Consider implementing additional security rules in Supabase to protect user data
- Regularly review and update your Twitter app permissions
- Use environment variables for sensitive keys in production

## Local Development

For instructions on setting up Twitter authentication for local development, see [TWITTER_AUTH_SETUP_LOCAL.md](TWITTER_AUTH_SETUP_LOCAL.md).

For more information, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Twitter OAuth Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0) 