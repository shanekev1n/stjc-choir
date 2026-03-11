# ✝ STJC – Song Tracker

**Saint Teresa's Junior Choir · Song Tracker**

A mobile-friendly web app for planning, tracking and sharing songs for every Sunday Mass — built for Saint Teresa's Junior Choir.

🌐 **Live App:** [shanekev1n.github.io/stjc-choir](https://shanekev1n.github.io/stjc-choir)

![STJC Repo Card](stjc-repo-card.png)

---

## 📖 About

STJC Song Tracker helps choir leaders and members stay organized before and during Sunday Mass. Create a Mass entry, fill in songs for each part, track beat settings and musical keys, and share the full list to WhatsApp in one tap — all from any phone browser, no install needed.

---

## ✨ Features

### 🗓 Mass Management
- Create a Mass for any Sunday with date, occasion, and notes
- 12 Mass parts auto-created per Mass (Glory hidden automatically during Lent)
- Edit Mass info, date and occasion at any time
- Delete Mass with confirmation dialog
- **⎘ Copy Mass** — duplicate an entire Mass with all songs and settings to a new date

### 🎵 Song Tracking
- Enter song name, beat folder, page, slot, tempo and scale per part
- **✨ Smart Autofill** — type a song name and the app detects if it was used in a previous Mass, offering to paste all settings automatically
- **Transposed Key calculator** — enter a scale like `C+2` and instantly see the key (`D`)
- Song notes field for rehearsal reminders (e.g. "Start slow, cue at verse 2")

### ✅ Practice Checklist
- Choir masters and senior members can check off each song as practiced
- Practice state saved to the database in real time

### 🔍 Search
- Search songs across all Masses
- Results grouped by song name with a **history timeline** showing every Mass it was used in, most recent first

### 📊 Stats Dashboard
- Total Masses, Total Songs Filled
- Most Used Songs (top 5)
- Least Used Songs (bottom 5)

### 📲 WhatsApp Share
- One tap generates a clean formatted message with the Mass date and all song names
- Opens WhatsApp directly, ready to send to the group

### 👤 Role-Based Access

| Role | View | Create / Edit / Delete |
|---|---|---|
| Choir Master | ✅ | ✅ |
| Senior Member | ✅ | ✅ |
| Member | ✅ | ❌ |

### 🔐 Profile & Settings
- Change username and password from within the app
- Session persisted across page refreshes

---

## 🎼 Mass Parts

Each Sunday Mass automatically includes rows for:

| # | Part | Note |
|---|---|---|
| 1 | Entrance | |
| 2 | Lord Have Mercy | |
| 3 | Glory | Hidden during Lent |
| 4 | Psalm | |
| 5 | Acclamation | |
| 6 | Offertory | |
| 7 | Holy | |
| 8 | Proclamation | |
| 9 | Peace / Lamb of God | |
| 10 | Communion 1 | |
| 11 | Communion 2 | |
| 12 | Recessional | |

---

## 🎹 Transposed Key Formula

Uses the chromatic scale: `C · C# · D · D# · E · F · F# · G · G# · A · A# · B`

| Scale Input | Transposed Key |
|---|---|
| C | C |
| C+1 | C# |
| C+2 | D |
| C+4 | E |
| C-1 | B |
| C-2 | A# |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript (no frameworks) |
| Database | [Supabase](https://supabase.com) (PostgreSQL + REST API) |
| Hosting | [GitHub Pages](https://pages.github.com) |
| Fonts | Google Fonts — Cinzel, Crimson Pro |

---

## 🗄 Database Schema

### `mass_services`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Auto-formatted date label |
| date | date | Mass date |
| occasion | text | Ordinary Sunday, Lent, Advent, etc. |
| notes | text | Optional notes |
| created_by | uuid | Reference to users |

### `mass_songs`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| mass_id | uuid | Reference to mass_services (CASCADE DELETE) |
| part | text | Mass part name |
| song | text | Song name |
| beat_folder | text | e.g. Ballad, Pop & Rock |
| page | text | P1–P6 |
| slot | integer | 1–10 |
| tempo | integer | BPM |
| scale | text | e.g. C, C+1, D-2 |
| notes | text | Rehearsal notes |
| practiced | boolean | Practice checklist state |

### `users`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| username | text | Login username (unique) |
| password_hash | text | Plain text password (simple auth) |
| display_name | text | Full display name |
| role | text | choir_master / senior_member / member |

---

## 📁 File Structure

```
stjc-choir/
├── index.html          ← Main app shell + all screens
├── css/
│   └── style.css       ← All styles
└── js/
    ├── config.js       ← Supabase config, constants, shared helpers
    ├── auth.js         ← Login, logout, session, screen routing
    ├── masses.js       ← Mass list, create, detail, delete, copy, share
    ├── songs.js        ← Song edit modal, autofill, chip renderers
    ├── search.js       ← Search + bottom nav + stats tab switching
    ├── profile.js      ← Change username, change password
    └── stats.js        ← Stats dashboard
```

---

## 🚀 Deployment

This app is hosted on **GitHub Pages** and connects to a **Supabase** backend.

To deploy your own instance:

1. Fork this repository
2. Create a free project at [supabase.com](https://supabase.com)
3. Run the following SQL in the Supabase SQL Editor:

```sql
-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

-- Mass Services
CREATE TABLE mass_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  date date,
  occasion text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Mass Songs
CREATE TABLE mass_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mass_id uuid REFERENCES mass_services(id) ON DELETE CASCADE,
  part text,
  song text DEFAULT '',
  beat_folder text DEFAULT '',
  page text DEFAULT '',
  slot integer,
  tempo integer,
  scale text DEFAULT '',
  notes text DEFAULT '',
  practiced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

4. Enable RLS on all tables with "Allow all" policies (for simplicity)
5. Update `SUPABASE_URL` and `SUPABASE_KEY` in `js/config.js`
6. Enable GitHub Pages — Settings → Pages → Deploy from branch: `main`

---

## ✝ Saint Teresa's Junior Choir

*"Sing to the Lord a new song." — Psalm 96:1*
