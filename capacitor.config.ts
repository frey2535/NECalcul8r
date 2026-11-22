import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // The iOS bundle identifier is set in ios/App/App.xcodeproj.
  appId: 'com.currentflow.necalcul8r',
  appName: 'NECalcul8r',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1e40af',
      showSpinner: false
    }
  }
};

export default config;
