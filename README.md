# ✝ STJC — Song Tracker

**Saint Teresa's Junior Choir · Song Tracker**

A web app for planning Sunday Mass songs, tracking attendance, and managing a shared lyrics library — built for Saint Teresa's Junior Choir.

🔗 **Live:** https://shanekev1n.github.io/stjc-choir
📦 **Repo:** github.com/shanekev1n/stjc-choir

---

## About

STJC Song Tracker helps the choir master and members stay organized before and during Sunday Mass — create a Mass, fill in songs for each part, track beat/tempo/key settings, mark attendance, browse a shared lyrics library, and share the full setlist to WhatsApp in one tap. No install needed, works from any phone browser, and can be added to the home screen as a PWA.

---

## Tech Stack

- **Frontend:** Plain HTML / CSS / JavaScript — no framework, no build step
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL via the PostgREST REST API)
- **Hosting:** GitHub Pages
- **Design:** "Sacred Cipher" — Bebas Neue (headings) + Outfit (body), Electric Lime accent
- **PWA:** Installable to home screen on iOS/Android via `manifest.json`

No `npm install`, no compiler — edit the files directly and push.

---

## File Structure

```
stjc-choir/
├── index.html          All screens & modals (toggled via JS)
├── manifest.json        PWA config
├── css/
│   └── style.css         Single stylesheet, Sacred Cipher design tokens
└── js/
    ├── config.js          Supabase config, constants, sb() API wrapper — loads FIRST
    ├── auth.js             Login, logout, session, screen navigation
    ├── masses.js            Mass list/detail, create/edit/delete, song table, parts
    ├── songs.js               Song edit modal, autofill, chip rendering
    ├── search.js               Bottom nav switching, song search
    ├── library.js               Lyrics library — browse, search, tag, add, copy/share
    ├── stats.js                  Stats dashboard
    ├── admin.js                   Member management
    ├── attendance.js               Attendance tracker
    └── profile.js                  Change username/password
```

---

## Features

### 🗓 Mass Management
- Create a Mass for any Sunday with date, occasion, and notes
- Occasions: Ordinary Sunday, Lenten Sunday, Easter Sunday, Advent Sunday, Christmas, Holy Week, Feast, Wedding Mass, Custom
- Auto-generated song rows per Mass — occasion-aware (e.g. Wedding Mass adds Nuptial Song, Lenten Sunday hides Glory)
- Add a **custom-named part** anywhere in the song table, with a Before/After position picker
- Remove any part, default or custom
- Edit Mass info, duplicate an entire Mass to a new date, delete with confirmation
- Filter the Mass list by occasion

### 🎵 Song Tracking
- Song name, beat folder, page, slot, tempo, and scale per part
- **Smart Autofill** — typing a song name checks past Masses and offers to paste back its previous settings
- **Transposition calculator** — supports major/minor keys and sharps/flats (`G+2` → `A`, `Em-5` → `Bm`)
- Practice checklist with a "check all" toggle
- Song notes field for rehearsal reminders

### 📖 Song Lyrics Library
- Browse and search the full lyrics library
- Tag songs to one or more Mass parts (admin only)
- Add new songs directly from the app (admin only)
- Copy or share lyrics via the native share sheet (WhatsApp/Telegram/etc on mobile)
- Song Search detects when lyrics exist for a result and links straight to them

### 🔍 Search
- Search songs across all Masses, with a Mass-part filter
- Results grouped by song name with a history timeline (date, occasion, settings used)

### ✅ Attendance (admin & choir master)
- Per-Mass attendance: Present / Late / Absent, tap to cycle
- Live sync to Supabase

### 📊 Stats Dashboard
- Total Masses, Songs Filled — visible to everyone
- Most Used Songs **per Mass part** — visible to everyone
- Attendance % and **Late Count** leaderboard — **admin only**

### 👤 Admin Panel
- Create accounts, change roles, reset passwords, delete accounts

### 📲 Share
- Copy Song List or lyrics to clipboard, or open the native share sheet on iOS

---

## Roles & Permissions

| Role | Edit songs | Mark attendance | View attendance/late stats | Admin panel | Add/tag lyrics |
|---|---|---|---|---|---|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **choir_master** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **senior_member** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **member** | ❌ | ❌ | ❌ | ❌ | ❌ |

Members can view: Masses, Song Library, Song Search, and the "Most Used Songs by Part" stat.

---

## Database (Supabase)

```
users            — login + role
mass_services    — one row per Sunday Mass
mass_songs       — songs per Mass, ordered by sort_order
attendance       — one row per (mass, member), status: present/late/absent
song_lyrics      — lyrics library, tagged with Mass part(s) via categories[]
```

`sort_order` on `mass_songs` is the single source of truth for song ordering within a Mass — never derived from part names.

---

## Deploying Changes

```bash
git add .
git commit -m "describe your change"
git push origin main --force
```

GitHub Pages auto-deploys in 1–2 minutes. Hard refresh (`Ctrl+Shift+R`) if changes don't appear immediately.

---

## Version History

### v1.4.0 — Current
- **Late Count** stat — leaderboard of total late marks per member
- Attendance % and Late Count stats restricted to **admin only**
- Mobile bottom-nav clearance fix (safe-area-inset support for iPhone home indicator)
- Mass list footer centered, dimmed, pinned to bottom

### v1.3.0 — Song Lyrics Library
- New **Library** tab — browse, search, and read full song lyrics
- Multi-select Mass-part tagging per song (admin only)
- **Add Song Lyrics** directly from the app (admin only)
- Copy / native Share (iOS share sheet) per song
- Song Search now detects if lyrics exist for a result and links to them

### v1.2.0 — Custom Parts & Polish
- **Sacred Cipher** visual redesign — Electric Lime + Bebas Neue/Outfit
- Add a custom-named Mass part with a Before/After position picker
- `sort_order` column added to `mass_songs` — single source of truth for ordering
- Occasions expanded: Wedding Mass (+Nuptial Song), Custom occasion, renamed Lenten/Easter/Advent Sunday
- Transposition fixed to support minor keys and flats (`Em-5` → `Bm`, `Bb+1` → `B`)
- Mass list filter by occasion
- Stats: Most Used Songs **per Mass part** (replacing overall top/bottom list)

### v1.1.0 — Attendance
- Attendance tracker (Present / Late / Absent) per Mass
- Attendance % in Stats with colour-coded bars
- Practiced "check all" toggle
- Search by Mass part filter
- Swipe-down-to-close on all modals

### v1.0.0 — Initial Release
- Login, role-based permissions
- Create/edit/delete Mass with auto-generated song rows
- Song edit modal with autofill from history, transposition, beat folder/page/slot
- Duplicate Mass, Copy Song List (share sheet on iOS)
- Song Search with history timeline
- Admin panel — create/edit/delete members
- PWA support (Add to Home Screen)

---

## Known Mobile Quirks (handled)

- `navigator.clipboard` fails silently on iOS Safari → falls back to native Share sheet, then `execCommand('copy')`
- Pull-to-refresh disabled only while a modal is open, never blocking normal scroll
- All destructive actions use a custom in-app confirm dialog, never `window.confirm()`

---

*Built for Saint Teresa's Junior Choir.* ✝️
