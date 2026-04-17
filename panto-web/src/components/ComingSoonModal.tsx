interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '32px 24px',
          textAlign: 'center',
          maxWidth: 320,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
          Segera Hadir!
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>
          Fitur ini sedang dalam pengembangan
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#0047bf',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
