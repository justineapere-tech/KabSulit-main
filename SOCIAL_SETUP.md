# Social Media Features Setup Guide

## What's New
Your KabSulit marketplace feed has been transformed into a full-featured social media platform with:
- 📸 Instagram/Facebook-style full-width posts
- ❤️ Like/reaction system with counts
- 💬 Comments and reviews with star ratings
- 📱 Real-time updates across all devices

## Files Changed/Created

### Modified Files:
1. **FeedScreen.js** - Complete redesign to social media layout
2. **App.js** - Added CommentsScreen navigation

### New Files:
1. **CommentsScreen.js** - Full comments and reviews interface
2. **social-features-setup.sql** - Database tables for reactions and comments (created earlier)
3. **SOCIAL_FEATURES.md** - Feature documentation

## Installation Steps

### Step 1: Run Database Setup (IMPORTANT!)
If you haven't already, execute the `social-features-setup.sql` file in your Supabase SQL Editor:

1. Go to Supabase Dashboard → Your Project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `social-features-setup.sql`
5. Click "Run"

This creates:
- `reactions` table - stores likes/hearts on items
- `comments` table - stores reviews/comments with ratings
- Appropriate indexes and RLS policies

### Step 2: Verify File Structure
Your project should now have:
```
screens/
  ├── FeedScreen.js (MODIFIED)
  ├── CommentsScreen.js (NEW)
  ├── ItemDetailScreen.js
  ├── ProfileScreen.js
  ├── PostItemScreen.js
  ├── LoginScreen.js
  ├── RegisterScreen.js
  ├── MessagesScreen.js
  ├── ChatScreen.js
  └── MyItemsScreen.js
App.js (MODIFIED)
SOCIAL_FEATURES.md (NEW - documentation)
```

### Step 3: Test the Features

#### Test 1: View Feed
1. Navigate to the Feed tab
2. You should see full-width social posts instead of grid
3. Each post shows:
   - Seller avatar and name with timestamp
   - Full-width item image
   - Heart and comment count buttons below image
   - Title, description, and price

#### Test 2: Like Posts
1. Click the heart (❤️) or heart outline (🤍) button
2. The heart should fill in red immediately
3. The count should increment
4. Refresh the page - your like should persist

#### Test 3: Add Comments
1. Click the comment count button (💬)
2. You're taken to the CommentsScreen
3. Scroll to bottom and write a comment
4. Optionally select a 1-5 star rating
5. Click "Post"
6. Your comment appears immediately

#### Test 4: Real-time Updates
1. Open your app on two devices/browsers
2. Like a post on one device
3. On the other device, refresh the feed - the like count should update
4. Same with comments

## Features Explained

### Feed Layout (Social Media Style)
- **Before:** 2-column grid of small item cards
- **Now:** Full-width posts like Instagram/Facebook with rich content

### Heart Reaction System
- Click the heart to like an item
- Shows total likes count
- Filled red heart (❤️) = you liked it
- Empty heart (🤍) = you haven't liked it
- Works with real-time sync across devices

### Comments & Reviews
- Write detailed comments/reviews on items
- Optional star ratings (1-5 stars)
- See all reviews from other users
- Delete your own comments anytime
- Real-time comment updates

## Database Schema

### reactions Table
```
id: UUID (primary key)
item_id: UUID (foreign key to items)
user_id: UUID (foreign key to auth.users)
created_at: timestamp
UNIQUE constraint: one reaction per user per item
```

### comments Table
```
id: UUID (primary key)
item_id: UUID (foreign key to items)
user_id: UUID (foreign key to auth.users)
content: text (required)
rating: integer 1-5 (optional)
created_at: timestamp
updated_at: timestamp
```

## Troubleshooting

### Issue: Heart button doesn't work
**Solution:** Ensure you're logged in. The app will show "Please login to like items" alert if you're not.

### Issue: Comments don't appear
**Solution:** 
1. Make sure `social-features-setup.sql` was executed in Supabase
2. Check that RLS policies are enabled
3. Refresh the page (pull down on feed)

### Issue: Likes/Comments not syncing across devices
**Solution:** Pull down to refresh on both devices. Real-time subscriptions listen for new data but manual refresh ensures latest counts.

### Issue: Can't delete my comment
**Solution:** Only visible and deletable on your own comments. You can only delete comments you posted.

## API Endpoints (No changes needed)

All Supabase API calls are handled automatically:
- GET `reactions` - fetch counts per item
- POST `reactions` - add like
- DELETE `reactions` - remove like
- GET `comments` - fetch comments for item
- POST `comments` - add comment with optional rating
- DELETE `comments` - remove own comment (RLS enforced)

## Performance Tips

1. **Images:** Optimize item images before uploading (under 2MB)
2. **Comments:** Long comment threads load efficiently with real-time updates
3. **Reactions:** Heart button updates immediately (optimistic UI)

## Next Ideas for Enhancement

1. **Popular Items:** Sort by reaction count
2. **Trending:** Show items with most comments/reactions
3. **User Profiles:** Show user's total reactions given/received
4. **Comment Notifications:** Alert users when someone comments on their item
5. **Edit Comments:** Allow users to edit comments they posted
6. **Multiple Reactions:** Beyond just hearts (thumbs up, laughing, etc.)

## Support

If you encounter issues:
1. Check browser console for errors (F12 → Console)
2. Check Supabase dashboard for table existence
3. Verify RLS policies are correct in Supabase
4. Test with fresh login/logout cycle
