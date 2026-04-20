import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Wallets: undefined;
  PayTab: undefined;
  History: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Otp: { otpToken: string; phoneNumber: string };
  Tabs: NavigatorScreenParams<TabParamList>;
  Pay: { merchantName?: string; merchantCategory?: string; amount?: number } | undefined;
  Scan: undefined;
};
