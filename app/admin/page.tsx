'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Clock,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

interface UserData {
  _id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  accessStatus: 'active' | 'locked' | 'expired' | 'pending';
  passType: 'lifetime' | 'monthly' | 'custom' | null;
  activatedAt?: string | null;
  expiresAt?: string | null;
  notes: string;
  updatedAt: string;
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  locked: number;
  expired: number;
  pending: number;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, locked: 0, expired: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for Edit modal
  const [modalStatus, setModalStatus] = useState<'active' | 'locked' | 'expired' | 'pending'>('active');
  const [modalPassType, setModalPassType] = useState<'lifetime' | 'monthly' | 'custom'>('lifetime');
  const [modalDurationDays, setModalDurationDays] = useState<number>(30);
  const [modalCustomDate, setModalCustomDate] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Discord Invite dynamic setting
  const [discordInvite, setDiscordInvite] = useState<string>('https://discord.gg/your-invite');
  const [savingInvite, setSavingInvite] = useState<boolean>(false);
  const [inviteSavedFeedback, setInviteSavedFeedback] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);

      const [usersRes, configRes] = await Promise.all([
        fetch(`/api/admin/users?${params.toString()}`),
        fetch('/api/admin/config'),
      ]);

      if (usersRes.status === 401 || usersRes.status === 403) {
        setAuthorized(false);
        window.location.href = '/api/auth/discord?source=admin';
        return;
      }

      const data = await usersRes.json();
      if (data.users) {
        setUsers(data.users);
        setStats(data.stats);
        setAuthorized(true);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.discordInviteUrl) {
          setDiscordInvite(configData.discordInviteUrl);
        }
      }
    } catch (err) {
      console.error('Failed fetching users:', err);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscordInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvite(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordInviteUrl: discordInvite }),
      });
      if (res.ok) {
        setInviteSavedFeedback(true);
        setTimeout(() => setInviteSavedFeedback(false), 2000);
      }
    } catch (err) {
      console.error('Failed saving discord invite:', err);
    } finally {
      setSavingInvite(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleQuickToggleLock = async (user: UserData) => {
    const newStatus = user.accessStatus === 'active' ? 'locked' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${user.discordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessStatus: newStatus,
          passType: user.passType || (newStatus === 'active' ? 'lifetime' : null),
        }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed toggle lock:', err);
    }
  };

  const handleDeleteUser = async (discordId: string) => {
    if (!confirm(`Are you sure you want to delete user ${discordId}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${discordId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed delete user:', err);
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setModalStatus(user.accessStatus);
    setModalPassType(user.passType || 'lifetime');
    setModalNotes(user.notes || '');
    if (user.expiresAt) {
      const d = new Date(user.expiresAt);
      setModalCustomDate(d.toISOString().split('T')[0]);
    } else {
      setModalCustomDate('');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        accessStatus: modalStatus,
        passType: modalPassType,
        notes: modalNotes,
      };

      if (modalPassType === 'monthly') {
        payload.durationDays = modalDurationDays || 30;
      } else if (modalPassType === 'custom') {
        if (modalCustomDate) {
          payload.customExpiresAt = new Date(modalCustomDate).toISOString();
        } else {
          payload.durationDays = modalDurationDays || 7;
        }
      }

      const res = await fetch(`/api/admin/users/${editingUser.discordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed saving user:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (expiresAt?: string | null, passType?: string | null) => {
    if (!expiresAt) {
      return passType === 'lifetime' ? 'Lifetime (No Expiry)' : 'None';
    }
    const d = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Expired';
    }
    return `${d.toLocaleDateString()} (${diffDays}d left)`;
  };

  if (!authorized) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a1a1aa',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5' }}>Verifying Admin Security Clearance...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '32px 24px',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '1px solid #27272a',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              }}>
                <img
                  src="/sushi_logo_without_bg.png"
                  alt="Sushi Logo"
                  style={{ width: '30px', height: '30px', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                  Sushi Auto-Buyer Admin
                </h1>
                <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
                  Manage Discord users, GCash passes & access locks
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => fetchUsers()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#e4e4e7',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <a
              href="/api/auth/discord?source=admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#6366f1',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <ShieldCheck size={16} />
              <span>Re-Auth Admin</span>
            </a>
          </div>
        </div>

        {/* Dynamic Discord Invite Configuration Bar */}
        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(88, 101, 242, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5865F2',
            }}>
              💬
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fafafa' }}>
                Dynamic Discord Server Invite
              </div>
              <div style={{ fontSize: '11.5px', color: '#71717a' }}>
                Extension popups link to this invite for tickets & support automatically
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveDiscordInvite} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '460px' }}>
            <input
              type="text"
              placeholder="https://discord.gg/your-invite"
              value={discordInvite}
              onChange={(e) => setDiscordInvite(e.target.value)}
              style={{
                flex: 1,
                background: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '10px',
                padding: '8px 12px',
                color: '#f4f4f5',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={savingInvite}
              style={{
                background: inviteSavedFeedback ? '#10b981' : '#5865F2',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {inviteSavedFeedback ? <Check size={14} /> : null}
              <span>{savingInvite ? 'Saving...' : inviteSavedFeedback ? 'Saved!' : 'Save Link'}</span>
            </button>
          </form>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
              <span>Total Discord Users</span>
              <Users size={16} color="#6366f1" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fafafa' }}>{stats.total}</div>
          </div>

          <div style={{
            background: '#18181b',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
              <span>Active Passes</span>
              <CheckCircle size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{stats.active}</div>
          </div>

          <div style={{
            background: '#18181b',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
              <span>Pending Passes</span>
              <Clock size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{stats.pending}</div>
          </div>

          <div style={{
            background: '#18181b',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
              <span>Locked Accounts</span>
              <Lock size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444' }}>{stats.locked}</div>
          </div>

          <div style={{
            background: '#18181b',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', fontSize: '13px', marginBottom: '8px' }}>
              <span>Expired</span>
              <AlertTriangle size={16} color="#f43f5e" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f43f5e' }}>{stats.expired}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: '', label: 'All Users' },
              { id: 'active', label: 'Active' },
              { id: 'pending', label: 'Pending' },
              { id: 'expired', label: 'Expired' },
              { id: 'locked', label: 'Locked' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === tab.id ? '#6366f1' : '#27272a',
                  color: statusFilter === tab.id ? '#ffffff' : '#a1a1aa',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', maxWidth: '380px' }}>
            <div style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', color: '#71717a' }} />
              <input
                type="text"
                placeholder="Search username, Discord ID, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#27272a',
                  border: '1px solid #3f3f46',
                  borderRadius: '12px',
                  padding: '9px 12px 9px 36px',
                  color: '#f4f4f5',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#3f3f46',
                color: '#f4f4f5',
                border: 'none',
                padding: '0 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* User Table */}
        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#27272a', borderBottom: '1px solid #3f3f46', color: '#a1a1aa' }}>
                <th style={{ padding: '14px 20px' }}>User</th>
                <th style={{ padding: '14px 20px' }}>Discord ID</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Pass Type</th>
                <th style={{ padding: '14px 20px' }}>Expiration</th>
                <th style={{ padding: '14px 20px' }}>Notes</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#71717a' }}>
                    {loading ? 'Loading users...' : 'No users found matching query.'}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const avatarUrl = user.discordAvatar
                    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`
                    : `https://cdn.discordapp.com/embed/avatars/0.png`;

                  return (
                    <tr key={user.discordId} style={{ borderBottom: '1px solid #27272a', transition: 'background 0.15s' }}>
                      {/* User Column */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={avatarUrl}
                            alt={user.discordUsername}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #3f3f46' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#fafafa' }}>{user.discordUsername}</span>
                              {user.discordId === '982491279369830460' && (
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                                  color: '#fff',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                }}>
                                  Admin Owner
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>
                              Joined {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Discord ID */}
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => copyToClipboard(user.discordId, user.discordId)}
                          style={{
                            background: '#27272a',
                            border: '1px solid #3f3f46',
                            color: '#cbd5e1',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                          title="Click to copy Discord ID"
                        >
                          <span>{user.discordId}</span>
                          {copiedId === user.discordId ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        </button>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background:
                            user.accessStatus === 'active'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : user.accessStatus === 'locked'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : user.accessStatus === 'expired'
                              ? 'rgba(244, 63, 94, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            user.accessStatus === 'active'
                              ? '#10b981'
                              : user.accessStatus === 'locked'
                              ? '#ef4444'
                              : user.accessStatus === 'expired'
                              ? '#f43f5e'
                              : '#f59e0b',
                          border:
                            user.accessStatus === 'active'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : user.accessStatus === 'locked'
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : user.accessStatus === 'expired'
                              ? '1px solid rgba(244, 63, 94, 0.3)'
                              : '1px solid rgba(245, 158, 11, 0.3)',
                        }}>
                          {user.accessStatus}
                        </span>
                      </td>

                      {/* Pass Type */}
                      <td style={{ padding: '14px 20px', color: '#cbd5e1' }}>
                        {user.passType ? (
                          <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{user.passType}</span>
                        ) : (
                          <span style={{ color: '#71717a' }}>None</span>
                        )}
                      </td>

                      {/* Expiration */}
                      <td style={{ padding: '14px 20px', color: '#cbd5e1', fontSize: '12.5px' }}>
                        {formatExpiry(user.expiresAt, user.passType)}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '14px 20px', color: '#a1a1aa', maxWidth: '200px' }}>
                        <span style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12.5px',
                        }}>
                          {user.notes || '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleQuickToggleLock(user)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #3f3f46',
                              background: user.accessStatus === 'active' ? '#27272a' : 'rgba(16, 185, 129, 0.2)',
                              color: user.accessStatus === 'active' ? '#ef4444' : '#10b981',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                            title={user.accessStatus === 'active' ? 'Lock User' : 'Unlock User'}
                          >
                            {user.accessStatus === 'active' ? <Lock size={13} /> : <Unlock size={13} />}
                            <span>{user.accessStatus === 'active' ? 'Lock' : 'Unlock'}</span>
                          </button>

                          <button
                            onClick={() => openEditModal(user)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #3f3f46',
                              background: '#27272a',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                            title="Edit Pass / Expiry / Notes"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user.discordId)}
                            style={{
                              padding: '6px',
                              borderRadius: '8px',
                              border: '1px solid #3f3f46',
                              background: '#27272a',
                              color: '#71717a',
                              cursor: 'pointer',
                            }}
                            title="Delete User"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Pass Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px', color: '#fafafa' }}>
              Edit Pass & Access
            </h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '0 0 20px' }}>
              Configure subscription pass for <strong>{editingUser.discordUsername}</strong> ({editingUser.discordId})
            </p>

            <form onSubmit={handleSaveUser}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Access Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                >
                  <option value="active">Active (Full Extension Access)</option>
                  <option value="pending">Pending (Waiting for GCash Payment)</option>
                  <option value="locked">Locked (Revoked Access)</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Pass Type
                </label>
                <select
                  value={modalPassType}
                  onChange={(e) => setModalPassType(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                  }}
                >
                  <option value="lifetime">Lifetime Pass (Permanent / Token-gated)</option>
                  <option value="monthly">Monthly Pass (+30 Days from now)</option>
                  <option value="custom">Custom Duration (Specific Days or Date)</option>
                </select>
              </div>

              {modalPassType === 'custom' && (
                <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={modalDurationDays}
                      onChange={(e) => setModalDurationDays(parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        background: '#27272a',
                        border: '1px solid #3f3f46',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        color: '#f4f4f5',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#a1a1aa', marginBottom: '4px' }}>
                      OR Specific Expiry Date
                    </label>
                    <input
                      type="date"
                      value={modalCustomDate}
                      onChange={(e) => setModalCustomDate(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#27272a',
                        border: '1px solid #3f3f46',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        color: '#f4f4f5',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Operator Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Paid ₱100 via GCash ref #82918 on Aug 31"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    background: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#cbd5e1',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
