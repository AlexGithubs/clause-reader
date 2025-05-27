# Setting Up Supabase for ClauseReader

This guide will walk you through the process of setting up Supabase for the ClauseReader application.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Create a new project with a name like "clause-reader"
3. Choose a strong database password and save it somewhere secure
4. Select the region closest to your users
5. Click "Create new project"

## 2. Set Up the Database

Once your project is created, you'll need to set up the database schema:

1. Go to the SQL Editor in your Supabase dashboard
2. Create a new query
3. Paste the contents of `lib/supabase-schema.sql` into the editor
4. Run the query to create all the necessary tables, indexes, and policies

## 3. Configure Storage

Set up a storage bucket for PDF files:

1. Go to the Storage section in your Supabase dashboard
2. Create a new bucket called "pdfs"
3. Under bucket settings:
   - Set the Access Control policy to "Private" (files can only be accessed by authenticated users)
   - Enable "Use default paths" to organize files by user ID

## 4. Set Up Authentication

1. Go to the Authentication section in your Supabase dashboard
2. Under "Providers", ensure that Email is enabled
3. Configure email templates for confirmation, magic links, etc.
4. (Optional) Set up additional providers like Google, GitHub, etc. if needed

## 5. Configure Environment Variables

Add the following variables to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in the Supabase dashboard under Project Settings > API.

## 6. Run the Application

Now that everything is set up, you can run the application:

```bash
npm run dev
```

## Additional Configuration

### Setting Up Row-Level Security (RLS)

The SQL schema already includes RLS policies that ensure users can only access their own data. Make sure these policies are enabled.

### User Management

You can manage users from the Supabase Authentication dashboard.

### Backups

Supabase automatically backs up your database. You can configure additional backup settings in the dashboard.

### Monitoring

Use the Supabase dashboard to monitor database usage, storage usage, and API requests.

## Troubleshooting

- If you encounter CORS issues, ensure your website URL is added to the allowed origins in the Supabase dashboard under Project Settings > API > CORS.
- For authentication issues, check the Authentication logs in the Supabase dashboard.
- For storage issues, verify that the storage bucket permissions are set correctly. 