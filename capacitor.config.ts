import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cybergym.fitnesstracker',
  appName: 'Fitness Tracker Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Allow mixed content so local assets + remote APIs work without issues
    allowMixedContent: true,
    // Start WebView with a background color matching the app to avoid white flash
    backgroundColor: '#0c0f1a',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0c0f1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Minimize splash screen blocking time
      launchAutoHide: true,
      launchShowDuration: 0,
    },
  },
};

export default config;
