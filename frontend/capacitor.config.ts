import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edforce.app',
  appName: 'Edforce',
  webDir: 'dist',
  server: {
    // For development: set to your computer's local IP
    // Update this IP if your computer's network IP changes
    androidScheme: 'http',
    cleartext: true, // Allow HTTP connections (needed for local development)
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
