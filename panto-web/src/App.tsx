import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/Login/LoginPage';
import HomePage from './pages/Home/HomePage';
import WalletsPage from './pages/Wallets/WalletsPage';
import PayPage from './pages/Pay/PayPage';
import HistoryPage from './pages/History/HistoryPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ScanQRPage from './pages/Scan/ScanQRPage';
import DanaCallbackPage from './pages/Dana/DanaCallbackPage';
import GopayCallbackPage from './pages/Gopay/GopayCallbackPage';

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="scan" element={<ScanQRPage />} />
          <Route path="dana/callback" element={<DanaCallbackPage />} />
          <Route path="gopay/callback" element={<GopayCallbackPage />} />
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="wallets" element={<WalletsPage />} />
            <Route path="pay" element={<PayPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
