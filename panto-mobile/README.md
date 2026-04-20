# Panto Mobile

React Native Expo port of `panto-web`. Mirrors UI, theme, navigation, and API integration with the `panto-api` backend.

## Stack

- Expo SDK 51 (React Native 0.74)
- TypeScript
- React Navigation (native stack + bottom tabs)
- Zustand + AsyncStorage for auth
- Axios for API with bearer-token interceptor
- expo-camera for QR scanning
- react-native-qrcode-svg for QR generation

## Prerequisites

- Node.js 18+
- `panto-api` running locally on port 3000 (`cd ../panto-api && npm run start:dev`)
- One of:
  - Expo Go on a physical device (same Wi-Fi as your dev machine)
  - iOS Simulator (Xcode)
  - Android Emulator (Android Studio)

## Install & run

```bash
cd panto-mobile
npm install
npx expo start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR with Expo Go.

## API base URL

`src/api/config.ts` resolves the API host dynamically:

1. If `expo.extra.apiBaseUrl` is set in `app.json`, use it.
2. Otherwise, use the Metro host IP from Expo (so physical devices can reach the dev machine) + port `3000`.
3. Fallback: `http://10.0.2.2:3000` on Android, `http://localhost:3000` otherwise.

To override, add to `app.json`:

```json
{
  "expo": {
    "extra": { "apiBaseUrl": "http://192.168.1.50:3000" }
  }
}
```

## Project layout

```
src/
├── api/              # axios client + endpoints (mirrors panto-web/src/api)
├── components/       # WalletIcon, Loader, ComingSoonModal
├── navigation/       # Root stack + bottom tab navigator
├── screens/          # Login, Home, Wallets, Pay, History, Profile, Scan
├── store/            # Zustand auth store with AsyncStorage
├── theme/            # Color tokens, radius, shadow, formatRp
├── types/            # Wallet, Transaction, SmartPayResult, User
└── utils/            # QR payload parsing
```

## Screens

| Screen | Behavior |
|--------|----------|
| Login | Phone + PIN (login/register toggle), +62 prefix |
| Home | Balance card, points pill, menu grid (locked + NEW badges), promo, recent tx |
| Wallets | Total balance, GoPay / DANA bind cards, other wallets with sync + routing toggle, link modal |
| Pay | 3-step wizard: amount + merchant → SmartPay split (customize) → success summary |
| History | Stats row, date / wallet chips, month-grouped list with expandable split breakdown |
| Profile | Avatar + editable name, stats, Panto+ card, settings, logout |
| Scan | Tabs — camera scan / User QR (60s auto-refresh) / receive transfer placeholder |

## Auth

Tokens and the hydrated user profile are persisted in AsyncStorage (`panto_token`, `panto_user`). On cold start, `App.tsx` hydrates before rendering the navigator so a logged-in user skips the login screen. A 401 from the API triggers `logout()`, which flips the stack back to `Login`.
