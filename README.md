# ✝ STJC – Song Tracker

**Saint Teresa's Junior Choir · Song Tracker**  
A web app for managing and tracking songs used in Sunday Mass.

🌐 **Live App:** [shanekev1n.github.io/stjc-choir](https://shanekev1n.github.io/stjc-choir)

---

## 📖 About

STJC Song Tracker is a lightweight, mobile-friendly web app built for **Saint Teresa's Junior Choir**. It allows choir leaders to plan and record the songs used in each Sunday Mass, including beat folder, page, slot, tempo, and musical key — all accessible by choir members in real time.

---

## ✨ Features

- 🗓 **Sunday Mass management** — create a Mass entry for each Sunday with date, occasion, and notes
- 🎵 **12 Mass parts** automatically created per Mass (Entrance, Lord Have Mercy, Glory, Psalm, Acclamation, Offertory, Holy, Proclamation, Peace / Lamb of God, Communion 1, Communion 2, Recessional)
- 🎹 **Transposed Key calculator** — enter a scale like `C+2` and get the transposed key instantly
- 👥 **Role-based access** — Choir Masters and Senior Members can edit; Members can only view
- ☁️ **Cloud database** — all data synced in real time via Supabase (no local storage)
- 📱 **Mobile-friendly** — works on any browser, no install needed

---

## 👤 User Roles

| Role | Can View | Can Create / Edit / Delete |
|---|---|---|
| Choir Master | ✅ | ✅ |
| Senior Member | ✅ | ✅ |
| Member | ✅ | ❌ |

---

## 🎼 Mass Parts

Each Sunday Mass automatically includes rows for:

1. Entrance
2. Lord Have Mercy
3. Glory *(hidden for Lent)*
4. Psalm
5. Acclamation
6. Offertory
7. Holy
8. Proclamation
9. Peace / Lamb of God
10. Communion 1
11. Communion 2
12. Recessional

---

## 🎹 Transposed Key Formula

Uses the chromatic scale: `C · C# · D · D# · E · F · F# · G · G# · A · A# · B`

| Scale Input | Transposed Key |
|---|---|
| C | C |
| C+1 | C# |
| C+2 | D |
| C+4 | E |
| C+7 | G |
| C-1 | B |
| C-2 | A# |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Hosting | [GitHub Pages](https://pages.github.com) |
| Fonts | Google Fonts (Cinzel, Crimson Pro) |

---

## 🗄 Database Schema

### `mass_services`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Formatted date (DD/MM/YYYY) |
| date | date | Mass date |
| occasion | text | e.g. Ordinary Sunday, Lent |
| notes | text | Optional notes |
| created_by | uuid | Reference to user |

### `mass_songs`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| mass_id | uuid | Reference to mass_services |
| part | text | Part of the Mass |
| song | text | Song name |
| beat_folder | text | e.g. Ballad, Pop & Rock |
| page | text | P1–P6 |
| slot | integer | 1–10 |
| tempo | integer | BPM |
| scale | text | e.g. C, C+1, D-2 |

### `users`
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| username | text | Login username |
| password_hash | text | Password |
| display_name | text | Full display name |
| role | text | choir_master / senior_member / member |

---

## 🚀 Deployment

This app is hosted on **GitHub Pages** and connects to a **Supabase** backend.

To deploy your own instance:

1. Fork this repository
2. Create a free project at [supabase.com](https://supabase.com)
3. Run the SQL schema in the Supabase SQL Editor
4. Update `SUPABASE_URL` and `SUPABASE_KEY` in `index.html`
5. Enable GitHub Pages on your repo (Settings → Pages → Deploy from branch: main)

---

## ✝ Saint Teresa's Junior Choir

*"Sing to the Lord a new song." — Psalm 96:1*
