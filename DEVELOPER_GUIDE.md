# KabSulit Development Quick Reference

## File Structure Overview
```
KabSulit/
├── App.js                          # Main navigation (UPDATED)
├── config/
│   ├── supabase.js                 # Supabase client
│   └── theme.js                    # CvSU color palette (NEW)
├── screens/
│   ├── LoginScreen.js              # Login with CvSU theme (UPDATED)
│   ├── RegisterScreen.js           # Registration (needs update)
│   ├── FeedScreen.js               # Search + categories (UPDATED)
│   ├── PostItemScreen.js           # Post with categories (UPDATED)
│   ├── ProfileScreen.js            # Enhanced profile (UPDATED)
│   ├── SettingsScreen.js           # Settings + logout (NEW)
│   ├── MessagesScreen.js           # Message list (UPDATED)
│   ├── ChatScreen.js               # Chat (needs update)
│   ├── CommentsScreen.js           # Comments (needs update)
│   ├── ItemDetailScreen.js         # Item detail (needs update)
│   └── MyItemsScreen.js            # My items (needs update)
└── utils/
    └── validation.js               # Input validation
```

---

## Using the Theme System

### Import Theme in Any Screen
```javascript
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIZES } from '../config/theme';
```

### Example StyleSheet with Theme
```javascript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
});
```

### Color Constants
```javascript
// Main colors
COLORS.primary       // #003D7A (CvSU Blue)
COLORS.secondary     // #F39200 (Gold/Orange)
COLORS.accent        // #00B4D8 (Cyan)

// Functional
COLORS.success       // #10B981
COLORS.error         // #EF4444
COLORS.danger        // #DC2626

// Neutral
COLORS.white         // #FFFFFF
COLORS.gray100-900   // Various grays

// Text
COLORS.text          // #1F2937 (dark)
COLORS.textSecondary // #6B7280 (medium)
COLORS.textLight     // #9CA3AF (light)
```

---

## Common Tasks

### Adding a New Feature
1. Create screen in `screens/` folder
2. Import theme: `import { COLORS, SPACING, ... } from '../config/theme';`
3. Add to navigation in `App.js`:
   ```javascript
   <Stack.Screen name="FeatureName" component={FeatureNameScreen} />
   ```
4. Add tab icon if needed (bottom navigator)

### Updating Existing Screens
1. Import theme constants
2. Replace hardcoded colors with `COLORS.*`
3. Replace hardcoded spacing with `SPACING.*`
4. Test on device

### Working with Search/Filter
- FeedScreen has combined filtering
- Search works on: title, description, seller name
- Categories filter independently
- Both can be combined for advanced filtering

### Working with Categories
- Categories defined in FeedScreen: `Books`, `Notes`, `Electronics`, etc.
- PostItemScreen has modal selector
- Items display category badge
- Update CATEGORIES array to add more categories

---

## Database Integration

### Required Tables
- `items` - marketplace listings (with `category` column)
- `profiles` - user profiles
- `messages` - direct messages
- `reactions` - likes/reactions
- `comments` - item reviews/comments

### Adding Category to Items
If your items table doesn't have a category column:
```sql
ALTER TABLE items ADD COLUMN category VARCHAR(50);
```

---

## Authentication Flow

### Login Flow
```
LoginScreen → email + password → Supabase Auth → Sets Session → MainTabs
```

### Logout Flow
```
SettingsScreen (Logout Button) → Clears Session → LoginScreen
```

### Session Persistence
- Managed by Supabase automatically
- onAuthStateChange listener in App.js
- Checks session on app load

---

## Testing Checklist

### UI/UX Testing
- [ ] All screens display correctly
- [ ] Colors match CvSU palette
- [ ] Text is readable
- [ ] Buttons are easily tappable
- [ ] Spacing is consistent

### Feature Testing
- [ ] Search filters items in real-time
- [ ] Categories filter correctly
- [ ] Combined search + category works
- [ ] Logout from settings works
- [ ] Profile shows user info
- [ ] Messages display conversations
- [ ] Can post item with category
- [ ] Images upload correctly

### Performance Testing
- [ ] Feed loads quickly
- [ ] Search doesn't lag
- [ ] Navigation is smooth
- [ ] No memory leaks

### Edge Cases
- [ ] Empty search results
- [ ] No messages state
- [ ] Offline handling
- [ ] Error states

---

## Common Issues & Solutions

### Issue: Colors not applying
**Solution**: Restart Expo, clear cache
```bash
expo start -c
```

### Issue: Theme not found
**Solution**: Check import path is correct (relative to file location)
```javascript
// From screens folder
import { COLORS } from '../config/theme';
```

### Issue: Search not working
**Solution**: Ensure items have title, description, and profile data

### Issue: Categories not showing
**Solution**: Ensure items have `category` field in database

### Issue: Messages not loading
**Solution**: Check messages-setup.sql was run, verify user IDs

---

## Future Enhancement Ideas

### Short Term (Easy)
1. Add category icons/emojis
2. Add favorites/wishlist
3. Add item condition selector
4. Add location picker
5. Add rating display

### Medium Term (Moderate)
1. Push notifications
2. User ratings & reviews
3. Advanced search filters
4. Item comparison
5. Saved searches

### Long Term (Complex)
1. Campus-specific map view
2. QR code for items
3. Real-time chat notifications
4. Seller badges/verification
5. Analytics dashboard

---

## Development Tips

### Using Emojis for Quick Visuals
- Feed: 🛍 (shopping bag), 🔍 (search)
- Post: ➕ (add), 📷 (camera)
- Messages: 💬 (chat)
- Profile: 👤 (user), 📦 (package)
- Settings: ⚙️ (gear)

### Consistent Spacing Pattern
- Use SPACING constants for all margins/padding
- Never hardcode pixel values
- Use xs for small gaps, xl for large sections

### Color Usage Guidelines
- Primary (blue) for headers and main CTAs
- Secondary (gold) for subtitles and accents
- Accent (cyan) for special badges/highlights
- Error (red) for destructive actions only

---

## Debugging Commands

### Expo CLI
```bash
# Start development
expo start

# Start on iOS
expo start --ios

# Start on Android
expo start --android

# Clear cache and restart
expo start -c
```

### Check Logs
```bash
# View device logs (in Expo CLI)
# Press 'j' to jump to logs
# Press 'r' to reload
# Press 'e' to open in editor
```

---

## Resources

- [React Native Docs](https://reactnative.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)

---

## Version History

- **v1.0** - Initial marketplace app
- **v2.0** - CvSU redesign + complete feature overhaul
  - Added CvSU color palette
  - Implemented search & categories
  - Fixed missing features
  - Enhanced UI/UX
  - Added settings & logout
  - Full documentation

---

**Last Updated**: January 11, 2026
**Maintained By**: Development Team
