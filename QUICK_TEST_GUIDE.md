# KabSulit - Quick Test Guide

## Before You Test
- Make sure you have a valid Supabase connection
- Create a test account and log in
- Have multiple test accounts ready for profile viewing

---

## Test Case 1: Logout ✅

**Steps:**
1. Tap Settings tab (⚙️)
2. Tap "Logout" button
3. Confirm deletion in alert

**Expected Result:**
- Logout button shows alert asking to confirm
- After confirming, you're immediately taken to Login screen
- Session is cleared from Supabase

**Common Issues:**
- If you don't see logout button: Make sure you're logged in
- If alert doesn't appear: Check console for errors
- If stuck on Settings: Check network connection

---

## Test Case 2: View Other User's Profile ✅

**Steps:**
1. Go to Feed tab (🛍)
2. Find a post by another user (not your own)
3. Tap their username in the post header

**Expected Result:**
- Profile screen loads with the other user's name
- Shows "Items Listed" count for that user
- NO "Edit Profile" button
- NO "Settings & Security" link
- Back button returns to feed

**Common Issues:**
- If you see login screen: Profile data isn't loading - check Supabase
- If buttons show for other users: isOwnProfile state isn't set correctly
- If profile doesn't load: Check if profiles table has the user data

---

## Test Case 3: Delete Your Own Post ✅

**Steps:**
1. Go to Feed tab (🛍)
2. Find a post YOU created
3. Look for "⋯" (three dots) menu on the post header
4. Tap the three dots
5. Confirm deletion in alert

**Expected Result:**
- Delete button only appears on YOUR posts
- Other users' posts don't have delete button
- Tapping delete shows confirmation alert
- After confirming, post disappears from feed
- Feed refreshes to show updated list

**Common Issues:**
- If delete button doesn't appear: currentUser isn't set - check getCurrentUser()
- If post doesn't delete: Check RLS policies in Supabase
- If error message: Read the error carefully - it tells you what's wrong

---

## Test Case 4: Category Filtering ✅

**Steps:**
1. Go to Feed tab (🛍)
2. Look at category buttons at top (All, Books, Notes, etc.)
3. Tap different categories

**Expected Result:**
- Buttons are compact and readable (not oversized)
- Active category is highlighted in GOLD (#F39200)
- Inactive categories are in light gray
- Feed updates to show only items in selected category
- "All" shows all items regardless of category

**Common Issues:**
- If buttons are huge: Styling didn't apply - rebuild app
- If colors are wrong: Theme colors aren't loading
- If filtering doesn't work: filterItems() function issue

---

## Test Case 5: Comments ✅

**Steps:**
1. Go to Feed tab (🛍)
2. Find any post
3. Tap "💬 Comment" button
4. Add a comment
5. Tap "Post" button

**Expected Result:**
- Comments screen opens immediately (no buffering)
- Can see post title at top
- Can type comment and add rating (stars)
- Comment appears in list after posting
- Can delete own comments

**Common Issues:**
- If screen won't open: CommentsScreen not properly registered in App.js
- If buffering/infinite loading: Check Supabase queries
- If can't add comments: currentUser isn't set

---

## Test Case 6: Color Scheme ✅

**Visual Check:**
- Look for gold (#F39200) accents throughout
- Section titles should be gold
- Active category button should be gold
- Prices should be in gold
- Stat numbers should be gold
- Arrows on menu items should be gold

**Expected Result:**
- CvSU brand colors are consistent
- Gold brings attention to important information
- UI feels cohesive and professional
- No jarring color combinations

---

## Test Case 7: Navigation Flow ✅

**Steps:**
1. Login → Feed → Settings → Logout
2. Login → Feed → Profile (click username)
3. Go to Profile → Post New Item
4. Go to Feed → Comment on a post
5. Go to Messages → Check messages

**Expected Result:**
- All navigation transitions work smoothly
- Back button works as expected
- No stuck screens or infinite loops
- Tab bar always visible for main screens

---

## Console Output Guide

**Normal Logs You'll See:**
```
Error loading comments: (specific error)  ← Debugging info
New comment received: {payload}            ← Real-time updates
Logout error: ...                          ← Auth issues
```

**Error Logs To Watch For:**
```
Cannot read property 'id' of null          ← Missing currentUser
Network Error                              ← Supabase connection issue
PGRST116                                   ← Record not found (normal)
```

---

## Quick Debugging Tips

### If logout doesn't work:
1. Check App.js auth listener is set up
2. Check Supabase auth is working (`supabase.auth.getUser()`)
3. Look at console for network errors
4. Verify session isn't getting stuck

### If you can't see other profiles:
1. Make sure profile data exists in Supabase
2. Check that userId is being passed to ProfileScreen
3. Verify profile query works in Supabase console
4. Check `isOwnProfile` state is set correctly

### If delete doesn't work:
1. Verify `currentUser.id` matches post `user_id`
2. Check RLS policies allow deletes
3. Verify delete query syntax is correct
4. Check Supabase tables for data

### If categories don't work:
1. Check category names match CATEGORIES array
2. Verify items have category field set
3. Check filterItems() logic
4. Verify state updates are working

---

## Performance Notes

**Fast Operations (< 1 second):**
- Logout
- Delete posts
- Category filtering
- Navigation

**Might Take 2-3 seconds:**
- Loading feed (first time)
- Loading profiles
- Adding comments
- Opening comments screen

**Should be Instant:**
- Button presses
- UI updates
- State changes

---

## Mobile Testing Notes

**iOS:**
- Test on iPhone 12+ and iPhone SE
- Check notch doesn't cover buttons
- Verify bottom tab bar is accessible
- Test with notches/safe areas

**Android:**
- Test on various screen sizes
- Check status bar color
- Verify gesture navigation works
- Test with/without navigation bar

---

## Common Test Data Setup

**Test Account 1 (Seller):**
- Email: seller@test.com
- Password: Test123!
- Posts 3 items

**Test Account 2 (Buyer):**
- Email: buyer@test.com  
- Password: Test123!
- Views seller's profile

**Test Account 3 (Commenter):**
- Email: commenter@test.com
- Password: Test123!
- Comments on items

---

## Regression Testing

After making any changes, test these critical paths:

1. **Auth Flow**: Register → Login → Logout → Login again
2. **Profile Flow**: View own profile → Edit → View other profile
3. **Post Flow**: Create post → View in feed → Delete post
4. **Comment Flow**: Open post → Add comment → Delete comment
5. **Navigation**: Tab through all screens using bottom bar
6. **Filtering**: Search + category filter combinations
7. **Network**: Turn off wifi and test error handling

---

## Sign-Off Checklist

Before considering the app "fixed":

- [ ] Can logout successfully
- [ ] Can view other user profiles  
- [ ] Can delete own posts
- [ ] Category filtering works
- [ ] UI looks good with CvSU colors
- [ ] No console errors
- [ ] All buttons are responsive
- [ ] Loading states appear
- [ ] Error messages are clear
- [ ] Navigation is smooth

**Once all checked: App is production-ready!** ✅
