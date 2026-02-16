# Fitness Tracker Pro (Cyber Gym Edition)

An AI-powered fitness tracking web app built with React, Firebase, and Google Gemini. Track workouts, generate personalized routines, monitor progress with photos and analytics, and chat with an AI fitness coach.

## Tech Stack

- **React 19** + TypeScript + Vite
- **Firebase** — Authentication, Firestore, Storage
- **Google Gemini 2.5 Flash** — AI workout generation & coaching
- **Cloudinary** — Progress photo hosting
- **Tailwind CSS** — Styling (dark cyber theme)
- **Recharts** — Analytics charts
- **Lucide React** — Icons

## Features

- **Workout Logging** — Record exercises, sets, reps, weight, and RPE
- **AI Workout Generator** — Personalized routines based on training split, history, and volume preferences
- **AI Fitness Coach** — Chat with Gemini for nutrition, form, and training advice
- **Progress Photos** — Upload or capture photos with Cloudinary storage
- **Analytics Dashboard** — Weight progression charts, volume stats, intensity analysis, and AI insights
- **Workout History** — Browse, search, and repeat past workouts
- **Bilingual Support** — English and Hebrew with full RTL layout
- **Auth** — Email/password and Google OAuth sign-in

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Authentication and Firestore enabled
- Google Gemini API key
- Cloudinary account (for progress photos)

### Installation

```bash
git clone https://github.com/YossGitProj/fitness-tracker-pro-cyber-gym-edition.git
cd fitness-tracker-pro-cyber-gym-edition
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

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
│   ├── firebase.ts       # Firebase init
│   ├── firestoreService.ts # Firestore CRUD
│   ├── aiService.ts      # Gemini AI integration
│   └── storageService.ts # Image uploads
├── i18n/                 # Internationalization
│   ├── LanguageContext.tsx
│   └── translations.ts   # EN/HE translations
├── types.ts              # TypeScript type definitions
├── constants.tsx          # Exercise library & split configs
├── App.tsx               # Root component with routing
└── index.tsx             # Entry point
```

## Deployment

Configured for Vercel with SPA routing. Run `npm run build` and deploy the `dist` folder.

## License

MIT
