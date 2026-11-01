import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zebao.nihongomate',
  appName: '随身日语伴侣',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
