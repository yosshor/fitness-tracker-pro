import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

export function initCapacitor() {
  if (!isNative) return;

  // Defer StatusBar/Keyboard plugin init so it doesn't block the main thread
  // or fire on a dead Activity. Wait until the WebView is fully interactive.
  const initPlugins = async () => {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0c0f1a' });
    } catch {
      // StatusBar may not be available or Activity is dead — ignore
    }

    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      });
    } catch {
      // Keyboard plugin not available — ignore
    }
  };

  // Wait for the DOM to be ready + a tick, so Capacitor's bridge is fully alive
  if (document.readyState === 'complete') {
    setTimeout(initPlugins, 100);
  } else {
    window.addEventListener('load', () => setTimeout(initPlugins, 100), { once: true });
  }

  // Back button can be registered immediately — it's event-driven, not imperative
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });

  // Handle OAuth deep link callback (com.cybergym.fitnesstracker://login-callback#access_token=...)
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.includes('login-callback')) return;

    // Close the Custom Tab
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.close();
    } catch { /* ignore */ }

    // Extract tokens from the URL fragment
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const params = new URLSearchParams(url.substring(hashIndex + 1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { supabase } = await import('./supabase');
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  });
}
