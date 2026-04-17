import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Globe,
  Palette,
  Shield,
  LogOut,
  ChevronRight,
  Edit2,
  Check,
} from 'lucide-react';
import ComingSoonModal from '../../components/ComingSoonModal';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../api/endpoints';

const formatRp = (amount: number) => 'Rp ' + amount.toLocaleString('id-ID');

interface Stats {
  totalTransactions: number;
  totalSaved: number;
  points: number;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalTransactions: 0, totalSaved: 0, points: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, statsRes, pointsRes] = await Promise.allSettled([
        api.getMe(),
        api.getMyStats(),
        api.getPoints(),
      ]);

      if (meRes.status === 'fulfilled') {
        const u = meRes.value.data || meRes.value;
        setUser(u);
        setNameValue(u.name);
      }
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data || statsRes.value;
        setStats((prev) => ({
          ...prev,
          totalTransactions: s.totalTransactions || 0,
          totalSaved: s.totalSaved || 0,
        }));
      }
      if (pointsRes.status === 'fulfilled') {
        const p = pointsRes.value.data || pointsRes.value;
        setStats((prev) => ({ ...prev, points: p.balance || 0 }));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    try {
      const res = await api.updateMe({ name: nameValue.trim() });
      const updated = res.data || res;
      setUser(updated);
      setEditingName(false);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const settingsItems = [
    { icon: Bell, label: 'Notifikasi' },
    { icon: Globe, label: 'Bahasa' },
    { icon: Palette, label: 'Tema' },
    { icon: Shield, label: 'Keamanan' },
  ];

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', paddingTop: 100 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid #e5e7eb',
            borderTopColor: '#0047bf',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Avatar + Name */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#0047bf',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: '#ffffff',
            fontSize: 26,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>

        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              autoFocus
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                backgroundColor: '#f0f2f5',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'center',
                color: '#1a1a2e',
                maxWidth: 200,
              }}
            />
            <button
              onClick={handleSaveName}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#0047bf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={16} color="#ffffff" />
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || 'User'}</h2>
            <button
              onClick={() => setEditingName(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Edit2 size={14} color="#6b7280" />
            </button>
          </div>
        )}

        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          {user?.phoneNumber || ''}
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: '14px 8px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
            {stats.points.toLocaleString('id-ID')}
          </p>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>PantoPoints</p>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: '14px 8px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: 20, fontWeight: 700, color: '#0047bf' }}>
            {stats.totalTransactions}
          </p>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Total Transaksi</p>
        </div>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 14,
            padding: '14px 8px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
            {formatRp(stats.totalSaved)}
          </p>
          <p style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Total Hemat</p>
        </div>
      </div>

      {/* Panto+ Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Panto+</p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Free Plan</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '8px 20px',
            backgroundColor: '#e8effc',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            color: '#0047bf',
          }}
        >
          Upgrade
        </button>
      </div>

      {/* Settings */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          marginBottom: 20,
        }}
      >
        {settingsItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => setShowModal(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                borderBottom: i < settingsItems.length - 1 ? '1px solid #f0f2f5' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Icon size={18} color="#6b7280" />
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1a1a2e' }}>
                  {item.label}
                </span>
              </div>
              <ChevronRight size={16} color="#d1d5db" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <LogOut size={18} />
        Keluar
      </button>

      <ComingSoonModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
