import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.currentflow.necalcul8r',
  appName: 'NECalcul8r',
  webDir: 'dist',
  server: {
    url: 'https://necalcul8r.currentflowconsulting.org',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1e40af',
      showSpinner: false
    }
  }
};

export default config;
