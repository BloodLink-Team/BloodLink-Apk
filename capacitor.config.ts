import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.bloodlink.bd',
  appName: 'BloodLink',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
  },
};

export default config;
