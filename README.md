# Fitness Tracker Pro (Cyber Gym Edition)

An AI-powered fitness tracking web app built with React, Supabase, and Google Gemini. Track workouts, generate personalized routines, monitor progress with photos and analytics, and chat with an AI fitness coach.

## Tech Stack

- **React 19** + TypeScript + Vite
- **Supabase** — Authentication, PostgreSQL database, Storage
- **Google Gemini 2.5 Flash** — AI workout generation & coaching
- **Cloudinary** — Progress photo hosting
- **Tailwind CSS** — Styling (dark cyber theme)
- **Recharts** — Analytics charts
- **Lucide React** — Icons
- **Capacitor 8** — Native Android app

## Features

- **Workout Logging** — Record exercises, sets, reps, weight, and RPE
- **AI Workout Generator** — Personalized routines based on training split, history, and volume preferences
- **AI Fitness Coach** — Chat with Gemini for nutrition, form, and training advice
- **Progress Photos** — Upload or capture photos with Cloudinary storage
- **Analytics Dashboard** — Weight progression charts, volume stats, intensity analysis, and AI insights
- **Workout History** — Browse, search, and repeat past workouts
- **Bilingual Support** — English and Hebrew with full RTL layout
- **Auth** — Email/password and Google OAuth sign-in
- **Android App** — Native Android build via Capacitor with status bar, keyboard, and back button handling

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Google Gemini API key
- Cloudinary account (for progress photos)

### Installation

```bash
git clone https://github.com/yosshor/fitness-tracker-pro.git
cd fitness-tracker-pro
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase — get from Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI
VITE_GEMINI_API_KEY=your_gemini_api_key

# Cloudinary — get from Cloudinary Dashboard → Settings → Upload Presets
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the migration in **SQL Editor** (Dashboard → SQL Editor → New Query):

   Copy and paste the contents of [`supabase/migration.sql`](supabase/migration.sql) and click **Run**. This creates all tables, indexes, RLS policies, and the storage bucket.

3. Enable authentication providers in **Authentication → Providers**:
   - **Email** — enabled by default
   - **Google** — add your Google OAuth client ID and secret

4. Set the **Site URL** in **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or your production URL
   - Redirect URLs: add both your dev and production URLs

#### Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (display name, split preference, volume setting) |
| `workouts` | Logged workout sessions with exercises stored as JSONB |
| `photos` | Progress photo metadata and storage paths |
| `exercise_history` | Per-exercise tracking for analytics (best weight, reps, volume) |
| `user_settings` | Per-user settings (Gemini API key, language) |

All tables have Row Level Security enabled — users can only access their own data.

#### Storage

A public `photos` bucket is created for progress photos. Users can upload/delete in their own folder (`{userId}/...`), and all photos are publicly readable for display.

### Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

### Android

Requires [Android Studio](https://developer.android.com/studio) with Android SDK installed.

```bash
# Full build + sync + open in Android Studio
npm run android

# Sync web assets to Android project
npm run cap:sync

# Open Android project in Android Studio
npm run cap:open

# Live reload on connected device/emulator
npm run android:live
```

The Android app uses Capacitor to wrap the web app in a native WebView with:
- Dark status bar and navigation bar matching the app theme
- Hardware back button support (navigates back or exits)
- Keyboard-aware layout (content shifts when keyboard appears)
- Safe area insets for notched/punch-hole displays

## Project Structure

```
├── components/           # Page and UI components
│   ├── Dashboard.tsx     # Home overview with stats
│   ├── WorkoutLogger.tsx # Log workout sessions
│   ├── WorkoutGenerator.tsx # AI routine generator
│   ├── ProgressPhotos.tsx   # Photo gallery
│   ├── Analytics.tsx     # Charts and insights
│   ├── WorkoutHistory.tsx   # Past workouts
│   ├── FitnessChat.tsx   # AI coach chatbot
│   ├── Settings.tsx      # User preferences
│   ├── AuthScreen.tsx    # Login / signup
│   ├── UI.tsx            # Shared UI components
│   └── ErrorBoundary.tsx # Error handling
├── contexts/             # React context providers
│   ├── AuthContext.tsx    # Authentication state
│   ├── AppContext.tsx     # Global app state
│   └── NotificationContext.tsx
├── services/             # API and business logic
│   ├── supabase.ts       # Supabase client init + OAuth hash handling
│   ├── supabaseService.ts # Database CRUD operations
│   ├── aiService.ts      # Gemini AI integration
│   ├── storageService.ts # Image uploads (Cloudinary + Supabase Storage)
│   └── capacitor.ts      # Native mobile platform init (status bar, keyboard, back button)
├── supabase/
│   └── migration.sql     # Database schema, RLS policies, storage setup
├── i18n/                 # Internationalization
│   ├── LanguageContext.tsx
│   └── translations.ts   # EN/HE translations
├── types.ts              # TypeScript type definitions
├── constants.tsx          # Exercise library & split configs
├── android/              # Capacitor Android native project
├── capacitor.config.ts   # Capacitor configuration
├── App.tsx               # Root component with routing
└── index.tsx             # Entry point
```

## Deployment

### Web
Configured for Vercel with SPA routing. Run `npm run build` and deploy the `dist` folder.

Make sure to set the environment variables in your hosting provider and update the Supabase **Site URL** and **Redirect URLs** to your production domain.

### Android
Build the APK/AAB from Android Studio: **Build → Build Bundle(s) / APK(s)**. The app ID is `com.cybergym.fitnesstracker`.

## License

MIT
