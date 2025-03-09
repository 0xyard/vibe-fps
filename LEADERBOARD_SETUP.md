# Surviber FPS Leaderboard Setup

This document provides instructions on how to set up the leaderboard system for Surviber FPS using Supabase as the backend and Vercel for hosting.

## Prerequisites

- A [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account (for hosting)
- Basic knowledge of SQL and web deployment

## Setting Up Supabase

1. **Create a new Supabase project**:
   - Go to [Supabase](https://supabase.com) and sign in or create an account
   - Create a new project and give it a name (e.g., "surviber-fps")
   - Choose a strong database password and save it securely
   - Select a region closest to your target audience

2. **Set up the database schema**:
   - Navigate to the SQL Editor in your Supabase dashboard
   - Create a new query and paste the contents of the `supabase_schema.sql` file
   - Run the query to create the leaderboard table and set up Row Level Security

3. **Get your API credentials**:
   - Go to Project Settings > API
   - Copy the "URL" (this is your `SUPABASE_URL`)
   - Copy the "anon" key (this is your `SUPABASE_ANON_KEY`)

4. **Update your code with the API credentials**:
   - Open `leaderboard.js` and replace:
     ```javascript
     const SUPABASE_URL = 'YOUR_SUPABASE_URL';
     const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
     ```
     with your actual Supabase URL and anon key.
   
   - Open `leaderboard.html` and do the same replacement.

## Security Considerations

The leaderboard system is designed with the following security measures:

1. **Row Level Security (RLS)**:
   - Public users can only read the leaderboard data and insert new scores
   - Updates and deletions are not allowed for public users
   - Input validation is enforced at the database level

2. **Input Validation**:
   - Player names are limited to 30 characters
   - Scores must be non-negative integers
   - Wave numbers must be at least 1
   - Client-side validation is also implemented for defense in depth

3. **Data Sanitization**:
   - Player names are trimmed and limited to 30 characters
   - Score and wave values are converted to integers

## Deploying to Vercel

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)

2. **Import your project to Vercel**:
   - Go to [Vercel](https://vercel.com) and sign in or create an account
   - Click "New Project" and import your Git repository
   - Configure the project:
     - Build Command: Leave empty (static site)
     - Output Directory: Leave empty
     - Install Command: Leave empty

3. **Add environment variables** (optional, if you want to keep API keys out of your code):
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables
   - Update your code to use these environment variables

4. **Deploy**:
   - Click "Deploy" and wait for the deployment to complete
   - Your game with the leaderboard system will be available at the provided Vercel URL

## Testing the Leaderboard

1. Play the game and reach the game over screen
2. Click "Submit Score" and enter your name
3. Verify that your score appears on the leaderboard page

## Troubleshooting

- **CORS Issues**: If you encounter CORS errors, make sure your Supabase project allows requests from your Vercel domain
- **Database Errors**: Check the browser console for specific error messages
- **Missing Scores**: Verify that the score submission function is being called correctly

## Customization

- Modify the CSS in `leaderboard.html` to match your game's visual style
- Add additional columns to the leaderboard table if you want to track more stats
- Implement filtering or sorting options on the leaderboard page

## Maintenance

- Monitor your Supabase usage to ensure you stay within the free tier limits
- Periodically check for security updates to the Supabase JavaScript client
- Consider implementing rate limiting if the leaderboard becomes popular 