# Supabase Setup Instructions for Buster Market

## Prerequisites

- A Supabase account (free & paid tier available)
- Environment variables access in your project

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `buster-market-comments`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project initialization (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public key** (under "Project API keys")

## Step 3: Set Environment Variables

1. Create or update your `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the values with your actual Supabase project URL and anon key.

## Step 4: Run Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase-setup.sql` from your project root
3. Copy the entire SQL content
4. Paste it into the Supabase SQL Editor
5. Click **Run** to execute the migration

This will create:

- `users` table for storing user profiles
- `comments` table for storing comments and replies
- `comment_likes` table for tracking likes
- Proper indexes for performance
- Row Level Security (RLS) policies
- Real-time subscriptions
- Automatic like count triggers

## Step 5: Test the Setup

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to any market page
3. Connect your wallet
4. Try posting a comment
5. Try liking a comment
6. Try replying to a comment

## Step 6: Verify in Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. Check that data is being created in:
   - `users` table (when you first comment)
   - `comments` table (when you post comments)
   - `comment_likes` table (when you like comments)

## Features Enabled

✅ **Persistent Storage**: Comments are now stored in PostgreSQL
✅ **Real-time Updates**: Comments update live (optional WebSocket integration)
✅ **Threaded Replies**: Support for nested comment threads
✅ **Like System**: Users can like/unlike comments with real-time counts
✅ **User Profiles**: Automatic user creation with Farcaster data
✅ **Performance**: Indexed queries for fast loading
✅ **Security**: Row Level Security for data protection

## Optional: Enable Real-time Updates

If you want live comment updates without page refresh, you can add real-time subscriptions to your CommentSystem component. The database is already configured for this.

## Troubleshooting

### "Failed to fetch comments"

- Check that your environment variables are correct
- Verify the Supabase project URL and anon key
- Check browser console for specific error messages

### "Failed to create comment"

- Ensure RLS policies are properly set up
- Check that the `users` table has the correct structure
- Verify wallet connection is working

### Comments not showing

- Check the SQL migration ran successfully
- Verify data is being created in Supabase Table Editor
- Check browser network tab for API call errors

## Production Considerations

1. **Environment Variables**: Set the same environment variables in your production deployment (Vercel, etc.)
2. **Database Backups**: Enable automatic backups in Supabase dashboard
3. **Rate Limiting**: Consider adding rate limiting to prevent spam
4. **Moderation**: Add admin tools for comment moderation
5. **Monitoring**: Set up Supabase monitoring and alerts

## Migration from In-Memory Storage

The old in-memory comment system has been completely replaced. No data migration is needed since it was temporary storage.

## Next Steps

1. **Real-time Subscriptions**: Add live updates using Supabase real-time
2. **Comment Moderation**: Build admin tools for managing comments
3. **Rich Text**: Add support for rich text comments (bold, italic, links)
4. **Mentions**: Add @username mention functionality
5. **Reactions**: Expand beyond likes (emoji reactions)
6. **Search**: Add comment search functionality
