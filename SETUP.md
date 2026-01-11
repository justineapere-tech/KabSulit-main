# Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

### Create a Supabase Project
1. Go to https://supabase.com and create a free account
2. Create a new project
3. Wait for the project to finish provisioning

### Get Your Supabase Credentials
1. Go to Project Settings > API
2. Copy your Project URL and anon/public key

### Create Environment File
Create a `.env` file in the root directory:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Set Up Database
1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase-setup.sql`
3. Run the SQL script
4. This will create:
   - `profiles` table
   - `items` table
   - Row Level Security policies
   - Storage bucket for images

### Configure Campus Email
1. Open `utils/validation.js`
2. Update `CAMPUS_EMAIL_DOMAIN` to match your campus email domain:
   ```javascript
   export const CAMPUS_EMAIL_DOMAIN = '@yourcampus.edu'; // Change this!
   ```

## 3. Run the App

```bash
npm start
```

Then:
- Press `a` to open on Android
- Press `i` to open on iOS
- Press `w` to open in web browser

## 4. Test the App

1. Register with a campus email address
2. Check your email for verification (if email verification is enabled)
3. Login and start posting items!

## Troubleshooting

### "Supabase URL not found" error
- Make sure your `.env` file exists and has the correct variable names
- Restart the Expo server after creating/modifying `.env`

### Image upload not working
- Check that the storage bucket was created correctly
- Verify storage policies in Supabase dashboard > Storage

### Can't see items in feed
- Make sure RLS policies are set up correctly
- Check that items have `status = 'available'`
