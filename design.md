# IdeaVault - Mobile App Interface Design

## App Concept

IdeaVault is a personal idea workspace combined with an AI startup mentor. Users store business ideas and develop them through Socratic coaching conversations. The app should feel like a thoughtful, private notebook with an intelligent mentor always available.

---

## Screen List

| Screen | Purpose |
|--------|---------|
| **Home (My Vault)** | Main screen showing all user's ideas as cards |
| **New Idea** | Form screen to create a new idea |
| **Idea Detail** | Full view of an idea with all fields, edit capability |
| **AI Coach Chat** | Conversation screen with AI startup mentor |
| **Community Feed** | Browse public ideas from other users |
| **Idea Discussion** | View a public idea with community comments |
| **Development History** | Timeline of idea edits and AI conversations |
| **Profile / Settings** | User profile, app settings, login/logout |

---

## Color Choices

The brand should feel **intellectual, trustworthy, and warm** — like a premium notebook or a mentor's office.

| Token | Light | Dark | Rationale |
|-------|-------|------|-----------|
| `primary` | `#6C5CE7` (Deep Violet) | `#A29BFE` (Soft Lavender) | Creativity, wisdom, depth of thought |
| `background` | `#FAFAFA` | `#121214` | Clean paper-like feel / deep dark |
| `surface` | `#FFFFFF` | `#1C1C1E` | Card surfaces, elevated areas |
| `foreground` | `#1A1A2E` | `#F0F0F5` | Primary text |
| `muted` | `#8E8E93` | `#8E8E93` | Secondary text, hints |
| `border` | `#E5E5EA` | `#2C2C2E` | Subtle dividers |
| `success` | `#34C759` | `#30D158` | Positive feedback |
| `warning` | `#FF9500` | `#FFD60A` | Caution states |
| `error` | `#FF3B30` | `#FF453A` | Error states |
| `accent` (AI Coach) | `#FF6B35` (Warm Orange) | `#FF8C5A` | AI coach accent, warmth |

---

## Primary Content and Functionality per Screen

### 1. Home (My Vault) — Tab: "Vault"
- **Header**: App title "IdeaVault" with user avatar
- **Search bar**: Filter ideas by title/keyword
- **Idea cards list** (FlatList, vertical scroll):
  - Each card shows: title, short description preview (2 lines), privacy badge (lock/globe icon), date, AI coach status indicator
  - Swipe actions: delete
- **FAB (Floating Action Button)**: "+" to create new idea
- **Empty state**: Illustration with "Your vault is empty. Tap + to capture your first idea."

### 2. New Idea Screen
- **Scrollable form** with the following optional fields:
  - Title (required, text input)
  - Description (multiline text)
  - Problem (multiline text)
  - Target Users (multiline text)
  - Solution (multiline text)
  - Notes (multiline text)
- **Privacy toggle**: Private (default) / Public
- **Save button** at the bottom
- Fields are loosely structured — users can fill in any combination

### 3. Idea Detail Screen
- **Scrollable view** showing all idea fields
- **Edit button** (pencil icon in header) to toggle edit mode
- **Privacy badge** with toggle capability
- **Action buttons**:
  - "Talk to AI Coach" — opens AI Coach Chat
  - "View History" — opens Development History
- **Section headers** for each field (Problem, Target Users, Solution, Notes)
- Empty fields show placeholder text encouraging the user to fill them in

### 4. AI Coach Chat Screen
- **Chat interface** (FlatList, inverted for bottom-first)
- **Message bubbles**: 
  - User messages: right-aligned, primary color background
  - AI messages: left-aligned, surface background with accent border
- **Text input bar** at bottom with send button
- **AI typing indicator** (three dots animation)
- **Context header**: Shows which idea is being discussed (tappable to view idea)
- AI reads the full idea context before first message and provides a thoughtful opening question

### 5. Community Feed — Tab: "Community"
- **Header**: "Community" title
- **Public ideas list** (FlatList):
  - Cards showing: title, description preview, author name, comment count, date
- **Pull-to-refresh** for new content
- Tapping a card opens Idea Discussion screen

### 6. Idea Discussion Screen
- **Idea content** at top (read-only, showing all fields)
- **Comments section** below:
  - Each comment: author name, text, timestamp
  - Reply input at bottom
- **Add comment** text input with send button

### 7. Development History Screen
- **Timeline view** (FlatList):
  - Edit entries: "Idea updated" with changed fields summary, timestamp
  - AI conversation entries: "AI coaching session" with brief summary, timestamp
- **Chronological order** (newest first)
- Tapping an entry shows the diff or conversation

### 8. Profile / Settings — Tab: "Profile"
- **User info section**: Avatar, name, email
- **Login/Logout button**
- **Stats**: Total ideas, public ideas, AI coaching sessions
- **Settings**: Dark mode toggle, about section
- **App version** at bottom

---

## Key User Flows

### Flow 1: Capture a New Idea
1. User taps "+" FAB on Home screen
2. New Idea form opens
3. User types title and any other fields they want
4. User sets privacy (Private by default)
5. User taps "Save"
6. Returns to Home with new idea card at top

### Flow 2: Develop Idea with AI Coach
1. User taps an idea card on Home screen
2. Idea Detail screen opens
3. User taps "Talk to AI Coach"
4. AI Coach Chat opens
5. AI reads the idea and sends an opening message (a thoughtful question about the idea)
6. User responds, AI continues Socratic dialogue
7. Conversation is saved to idea's history
8. User can return to Idea Detail and edit based on insights

### Flow 3: Share Idea with Community
1. User opens Idea Detail
2. User toggles privacy from Private to Public
3. Idea appears in Community Feed
4. Other users can view and comment
5. Original user sees comments on the Discussion screen

### Flow 4: Review Idea Evolution
1. User opens Idea Detail
2. User taps "View History"
3. Development History screen shows timeline
4. User sees all edits and AI coaching sessions chronologically
5. User can tap entries to see details

---

## Navigation Structure

**Tab Bar (3 tabs)**:
1. **Vault** (house icon) → Home (My Vault)
2. **Community** (people icon) → Community Feed
3. **Profile** (person icon) → Profile / Settings

**Stack Navigation** (within tabs):
- Vault → New Idea (modal push)
- Vault → Idea Detail → AI Coach Chat
- Vault → Idea Detail → Development History
- Community → Idea Discussion

---

## Interaction Patterns

- **Cards**: Opacity feedback on press (0.7)
- **Primary buttons**: Scale 0.97 + haptic light
- **FAB**: Scale 0.95 + haptic medium
- **Send message**: Haptic light
- **Toggle privacy**: Haptic medium
- **Save idea**: Haptic success notification
- **Delete idea**: Haptic error notification with confirmation alert
