import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edforce.app',
  appName: 'Edforce',
  webDir: 'dist',
  server: (() => {
    // Default dev settings
    const devServer: any = {
      // For development: set to your computer's local IP if needed
      // Update this IP if your computer's network IP changes
      androidScheme: 'http',
      cleartext: true, // Allow HTTP connections (needed for local development)
    };

    // If building for production and an explicit server URL is provided,
    // configure Capacitor to load the remote URL (so the WebView origin
    // matches your deployed frontend domain and avoids CORS issues).
    const isProd = process.env.NODE_ENV === 'production' || process.env.CAPACITOR_PROD === 'true';
    const prodUrl = process.env.VITE_APP_SERVER_URL || process.env.CAPACITOR_SERVER_URL || process.env.SERVER_URL;
    if (isProd && prodUrl) {
      return {
        url: prodUrl,
        cleartext: false,
      };
    }

    return devServer;
  })(),
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
