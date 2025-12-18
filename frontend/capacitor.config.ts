import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edforce.app',
  appName: 'Edforce',
  webDir: 'dist',
  server: {
    // Comment out for production/testing native plugins
    // url: 'http://192.168.0.121:5173',
    androidScheme: 'http',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
