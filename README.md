# KabSulit - Campus Marketplace

A beginner-friendly React Native app built with Expo for a campus-exclusive marketplace.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Supabase:
   - Create a Supabase project at https://supabase.com
   - Copy your project URL and anon key
   - Create a `.env` file in the root directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Set up Supabase Database:
   - Run the SQL scripts in `supabase-setup.sql` in your Supabase SQL editor

4. Start the app:
```bash
npm start
```

## Features

- ✅ Campus email-only registration
- ✅ Login & Authentication
- ✅ Marketplace feed
- ✅ Post items with images
- ✅ Item detail view
- ✅ User profile

## Tech Stack

- React Native (Expo)
- Supabase (Auth, Database, Storage)
- React Navigation
