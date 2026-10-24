"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  Edit2,
  Lock,
  Unlock,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type Access = "active" | "locked" | "expired" | "pending";
type Pass = "lifetime" | "monthly" | "custom";
interface UserData {
  _id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  accessStatus: Access;
  passType: Pass | null;
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
const statuses: Access[] = ["active", "pending", "expired", "locked"];
const statusChoices: Record<Access, string> = {
  active: "Active - can use Sushi",
  pending: "Pending - waiting for payment",
  expired: "Expired - pass has ended",
  locked: "Locked - access blocked",
};
const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

function expiry(user: UserData) {
  if (!user.expiresAt)
    return user.passType === "lifetime" ? "No expiry" : "No expiry set";
  const date = new Date(user.expiresAt);
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return days <= 0 ? "Expired" : `${date.toLocaleDateString()} (${days}d left)`;
}

export default function AdminDashboardPage() {
  const [view, setView] = useState<"users" | "settings">("users");
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    locked: 0,
    expired: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");
  const requestId = useRef(0);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inviteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [modalStatus, setModalStatus] = useState<Access>("active");
  const [modalPassType, setModalPassType] = useState<Pass>("lifetime");
  const [modalDurationDays, setModalDurationDays] = useState(30);
  const [modalCustomDate, setModalCustomDate] = useState("");
  const [customExpiryMode, setCustomExpiryMode] = useState<"days" | "date">(
    "days",
  );
  const [modalNotes, setModalNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discordInvite, setDiscordInvite] = useState(
    "https://discord.gg/your-invite",
  );
  const [savingInvite, setSavingInvite] = useState(false);
  const [inviteSaved, setInviteSaved] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    const q = searchRef.current;
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/admin/users?${params}`);
      if (currentRequest !== requestId.current) return;
      if (response.status === 401 || response.status === 403) {
        setAuthorized(false);
        window.location.href = new URL(
          "/api/auth/discord?source=admin",
          window.location.origin,
        ).href;
        return;
      }
      if (!response.ok) throw Error("request failed");
      const data = await response.json();
      if (currentRequest !== requestId.current) return;
      if (!Array.isArray(data.users) || !data.stats)
        throw Error("invalid response");
      setUsers(data.users);
      setStats(data.stats);
      setAuthorized(true);
      setAppliedSearch(q);
    } catch {
      if (currentRequest === requestId.current)
        setError("Could not load users. Try refreshing.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUsers]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/config")
      .then(async (response) => {
        if (!response.ok) throw Error("request failed");
        const data = await response.json();
        if (!cancelled && data.discordInviteUrl)
          setDiscordInvite(data.discordInviteUrl);
      })
      .catch(() => {
        if (!cancelled)
          setInviteError(
            "Could not load the invite link. Refresh before editing.",
          );
      });
    return () => {
      cancelled = true;
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (editingUser && element && !element.open) element.showModal();
    if (!editingUser && element?.open) element.close();
  }, [editingUser]);

  const openEdit = (user: UserData) => {
    setEditingUser(user);
    setModalStatus(user.accessStatus);
    setModalPassType(user.passType || "lifetime");
    setModalNotes(user.notes || "");
    setModalDurationDays(30);
    setCustomExpiryMode(user.expiresAt ? "date" : "days");
    setModalError(null);
    setModalCustomDate(
      user.expiresAt
        ? new Date(user.expiresAt).toISOString().split("T")[0]
        : "",
    );
  };
  const mutateUser = async (user: UserData, method: "PATCH" | "DELETE") => {
    if (
      method === "DELETE" &&
      !confirm(`Are you sure you want to delete user ${user.discordId}?`)
    )
      return;
    setBusyUser(user.discordId);
    setError(null);
    try {
      const newStatus = user.accessStatus === "active" ? "locked" : "active";
      const response = await fetch(`/api/admin/users/${user.discordId}`, {
        method,
        ...(method === "PATCH"
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessStatus: newStatus,
                passType:
                  user.passType || (newStatus === "active" ? "lifetime" : null),
              }),
            }
          : {}),
      });
      if (!response.ok) throw Error("request failed");
      await fetchUsers();
    } catch {
      setError(
        method === "DELETE"
          ? "Could not delete this user. Please try again."
          : "Could not change access. Please try again.",
      );
    } finally {
      setBusyUser(null);
    }
  };
  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    setModalError(null);
    if (
      modalPassType === "custom" &&
      customExpiryMode === "days" &&
      (!Number.isInteger(modalDurationDays) || modalDurationDays < 1)
    ) {
      setModalError("Enter a duration of at least one whole day.");
      return;
    }
    if (
      modalPassType === "custom" &&
      customExpiryMode === "date" &&
      (!modalCustomDate ||
        !Number.isFinite(new Date(modalCustomDate).getTime()))
    ) {
      setModalError("Enter a valid expiry date.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      accessStatus: modalStatus,
      passType: modalPassType,
      notes: modalNotes,
    };
    if (modalPassType === "monthly") payload.durationDays = 30;
    if (modalPassType === "custom") {
      if (customExpiryMode === "date")
        payload.customExpiresAt = new Date(modalCustomDate).toISOString();
      else payload.durationDays = modalDurationDays || 7;
    }
    try {
      const response = await fetch(
        `/api/admin/users/${editingUser.discordId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw Error("request failed");
      setEditingUser(null);
      await fetchUsers();
    } catch {
      setModalError(
        "Could not save this pass. Your edits are still here. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingInvite(true);
    setInviteSaved(false);
    setInviteError(null);
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordInviteUrl: discordInvite }),
      });
      if (!response.ok) throw Error("request failed");
      setInviteSaved(true);
      if (inviteTimer.current) clearTimeout(inviteTimer.current);
      inviteTimer.current = setTimeout(() => setInviteSaved(false), 2000);
    } catch {
      setInviteError("Could not save the invite link. Please try again.");
    } finally {
      setSavingInvite(false);
    }
  };
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy the Discord ID. Select it and copy manually.");
    }
  };
  const identity = (user: UserData) => (
    <div className="user-identity">
      <div className="avatar">
        <span>{user.discordUsername.charAt(0).toUpperCase()}</span>
        {user.discordAvatar && (
          <img
            src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`}
            alt=""
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </div>
      <div className="identity-text">
        <strong title={user.discordUsername}>{user.discordUsername}</strong>
        <button
          type="button"
          className="copy-id"
          onClick={() => copyId(user.discordId)}
          aria-label={`Copy Discord ID for ${user.discordUsername}`}
        >
          <span>{user.discordId}</span>
          {copiedId === user.discordId ? (
            <Check size={12} />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
    </div>
  );
  const actions = (user: UserData) => (
    <div className="row-actions">
      <button
        className="quiet"
        type="button"
        disabled={!!busyUser}
        onClick={() => openEdit(user)}
        aria-label={`Edit pass for ${user.discordUsername}`}
      >
        <Edit2 size={14} />
        <span>Edit</span>
      </button>
      <button
        className="quiet"
        type="button"
        disabled={!!busyUser}
        onClick={() => mutateUser(user, "PATCH")}
        aria-label={`${user.accessStatus === "active" ? "Lock" : "Unlock"} ${user.discordUsername}`}
      >
        {user.accessStatus === "active" ? (
          <Lock size={14} />
        ) : (
          <Unlock size={14} />
        )}
        <span>
          {busyUser === user.discordId
            ? "Working..."
            : user.accessStatus === "active"
              ? "Lock"
              : "Unlock"}
        </span>
      </button>
      <details
        className="overflow-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}
      >
        <summary aria-label={`More actions for ${user.discordUsername}`}>
          <MoreHorizontal size={18} />
        </summary>
        <div>
          <button
            type="button"
            className="danger-action"
            disabled={!!busyUser}
            onClick={(event) => {
              const details = event.currentTarget.closest("details");
              if (details) details.open = false;
              void mutateUser(user, "DELETE");
            }}
          >
            Delete user
          </button>
        </div>
      </details>
    </div>
  );

  return (
    <div className="admin-shell">
      <header className="topbar">
        <a className="admin-brand" href="/admin">
          <img src="/sushi_logo_without_bg.png" alt="" />
          <span>
            Sushi <span>Admin</span>
          </span>
        </a>
        <nav aria-label="Admin views">
          {(["users", "settings"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-current={view === item ? "page" : undefined}
              onClick={() => setView(item)}
            >
              {titleCase(item)}
            </button>
          ))}
        </nav>
        <a className="reauth-link" href="/api/auth/discord?source=admin">
          Re-auth
        </a>
      </header>
      <main className="admin-main">
        <div className="page-heading">
          <div>
            <h1>{view === "users" ? "Users" : "Settings"}</h1>
            <p>
              {view === "users"
                ? "Manage Discord access and Sushi passes."
                : "Support links for your extension users."}
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              void fetchUsers();
            }}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        {error && (
          <div role="alert" className="notice error-text">
            {error}
            <button
              type="button"
              className="quiet"
              onClick={() => {
                void fetchUsers();
              }}
            >
              Retry
            </button>
          </div>
        )}
        {view === "users" ? (
          <>
            <div
              className="status-filters"
              aria-label="Filter by access status"
            >
              <button
                type="button"
                aria-pressed={!statusFilter}
                onClick={() => setStatusFilter("")}
              >
                All users <span>{stats.total}</span>
              </button>
              {statuses.map((status) => (
                <button
                  type="button"
                  key={status}
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                >
                  {titleCase(status)} <span>{stats[status]}</span>
                </button>
              ))}
            </div>
            <div className="user-toolbar">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void fetchUsers();
                }}
                role="search"
              >
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search users"
                    placeholder="Username, Discord ID, or notes"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      searchRef.current = event.target.value;
                    }}
                  />
                </div>
                <button type="submit" className="secondary" disabled={loading}>
                  Search
                </button>
              </form>
              <p className="result-count" role="status">
                {loading
                  ? "Loading users..."
                  : `${users.length} users shown${appliedSearch ? ` for "${appliedSearch}"` : ""}`}
                <span>Counts above are global. Up to 100 results.</span>
              </p>
            </div>
            {!authorized ? (
              <div className="empty-state" role="status">
                <h2>
                  {loading ? "Loading your users" : "User list unavailable"}
                </h2>
                <p>
                  {loading
                    ? "Checking admin access and fetching passes."
                    : "Use Retry to reconnect. Your access settings have not changed."}
                </p>
              </div>
            ) : (
              <>
                <div className="desktop-users" aria-busy={loading}>
                  <table>
                    <thead>
                      <tr>
                        <th>User / Discord ID</th>
                        <th>Status</th>
                        <th>Pass</th>
                        <th>Expiration</th>
                        <th>Notes</th>
                        <th className="actions-heading">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.discordId}>
                          <td>{identity(user)}</td>
                          <td>
                            <span
                              className={`user-status ${user.accessStatus}`}
                            >
                              {titleCase(user.accessStatus)}
                            </span>
                          </td>
                          <td>
                            {user.passType ? (
                              titleCase(user.passType)
                            ) : (
                              <span className="muted">No pass</span>
                            )}
                          </td>
                          <td className="expiry-cell">{expiry(user)}</td>
                          <td>
                            <span className="user-notes" title={user.notes}>
                              {user.notes || (
                                <span className="muted">No notes</span>
                              )}
                            </span>
                          </td>
                          <td>{actions(user)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mobile-users" aria-busy={loading}>
                  {users.map((user) => (
                    <article className="mobile-user" key={user.discordId}>
                      <div className="mobile-user-heading">
                        {identity(user)}
                        <span className={`user-status ${user.accessStatus}`}>
                          {titleCase(user.accessStatus)}
                        </span>
                      </div>
                      <dl className="mobile-pass">
                        <div>
                          <dt>Pass</dt>
                          <dd>
                            {user.passType
                              ? titleCase(user.passType)
                              : "No pass"}
                          </dd>
                        </div>
                        <div>
                          <dt>Expiration</dt>
                          <dd>{expiry(user)}</dd>
                        </div>
                      </dl>
                      {actions(user)}
                    </article>
                  ))}
                </div>
                {!users.length && (
                  <div className="empty-state">
                    <h2>
                      {appliedSearch || statusFilter
                        ? "No matching users"
                        : "No registered users yet"}
                    </h2>
                    <p>
                      {appliedSearch || statusFilter
                        ? "Try another search or select All users."
                        : "Users appear here after signing in with Discord."}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <section className="admin-settings">
            <div>
              <h2>Discord support</h2>
              <p>
                Users open this server link from the extension to send payment
                proof or get help.
              </p>
            </div>
            <form onSubmit={saveInvite}>
              <label htmlFor="discord-invite">
                Discord support invite link
              </label>
              <input
                id="discord-invite"
                type="url"
                required
                value={discordInvite}
                onChange={(event) => {
                  setDiscordInvite(event.target.value);
                  setInviteSaved(false);
                }}
              />
              <p className="hint">
                Paste your Discord server invite, for example
                https://discord.gg/your-server. Use a link that does not expire.
              </p>
              {inviteError && (
                <p role="alert" className="error-text">
                  {inviteError}
                </p>
              )}
              <div className="settings-save">
                <span role="status">
                  {inviteSaved ? "Invite link saved" : ""}
                </span>
                <button
                  type="submit"
                  className="primary"
                  disabled={savingInvite}
                >
                  {savingInvite ? "Saving..." : "Save invite link"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
      <dialog
        ref={dialog}
        className="pass-dialog"
        tabIndex={-1}
        aria-labelledby="pass-title"
        aria-describedby="pass-description"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "button:enabled, input:enabled, select:enabled, textarea:enabled, a[href]",
            ),
          ].filter((control) => control.getClientRects().length);
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) {
            event.preventDefault();
            event.currentTarget.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onCancel={(event) => {
          if (saving) event.preventDefault();
          else setEditingUser(null);
        }}
        onClose={() => setEditingUser(null)}
      >
        {editingUser && (
          <>
            <div className="dialog-heading">
              <h2 id="pass-title">Edit access pass</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Close pass editor"
                disabled={saving}
                onClick={() => setEditingUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p id="pass-description">
              {editingUser.discordUsername}
              <span className="mono">{editingUser.discordId}</span>
            </p>
            <form onSubmit={saveUser}>
              <fieldset disabled={saving}>
                <div className="form-field">
                  <label htmlFor="pass-status">Can this user use Sushi?</label>
                  <select
                    id="pass-status"
                    value={modalStatus}
                    onChange={(event) =>
                      setModalStatus(event.target.value as Access)
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {statusChoices[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="pass-type">
                    How long should access last?
                  </label>
                  <select
                    id="pass-type"
                    value={modalPassType}
                    onChange={(event) =>
                      setModalPassType(event.target.value as Pass)
                    }
                  >
                    <option value="lifetime">Lifetime - no expiry</option>
                    <option value="monthly">
                      Monthly - 30 days from saving
                    </option>
                    <option value="custom">
                      Custom - choose days or an end date
                    </option>
                  </select>
                </div>
                {modalPassType === "monthly" && (
                  <p className="hint">
                    Saving sets the expiry to 30 days from today, including when
                    renewing an existing pass.
                  </p>
                )}
                {modalPassType === "custom" && (
                  <div className="custom-expiry">
                    <fieldset className="expiry-choice">
                      <legend>Set the end of this pass</legend>
                      <label>
                        <input
                          type="radio"
                          name="custom-expiry"
                          value="days"
                          checked={customExpiryMode === "days"}
                          onChange={() => setCustomExpiryMode("days")}
                        />
                        Number of days
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="custom-expiry"
                          value="date"
                          checked={customExpiryMode === "date"}
                          onChange={() => setCustomExpiryMode("date")}
                        />
                        Specific date
                      </label>
                    </fieldset>
                    {customExpiryMode === "days" ? (
                      <div className="form-field">
                        <label htmlFor="pass-days">Days from saving</label>
                        <input
                          id="pass-days"
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={modalDurationDays}
                          onChange={(event) =>
                            setModalDurationDays(Number(event.target.value))
                          }
                          aria-describedby="duration-help"
                        />
                        <p className="hint" id="duration-help">
                          For example, 7 gives access for one week from when you
                          save.
                        </p>
                      </div>
                    ) : (
                      <div className="form-field">
                        <label htmlFor="pass-date">Access ends on</label>
                        <input
                          id="pass-date"
                          type="date"
                          required
                          value={modalCustomDate}
                          onChange={(event) =>
                            setModalCustomDate(event.target.value)
                          }
                          aria-describedby="date-help"
                        />
                        <p className="hint" id="date-help">
                          The pass expires at the start of this date (00:00
                          UTC).
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor="pass-notes">Private notes (optional)</label>
                  <textarea
                    id="pass-notes"
                    rows={3}
                    value={modalNotes}
                    onChange={(event) => setModalNotes(event.target.value)}
                    placeholder="e.g. GCash payment verified, receipt reference"
                    aria-describedby="notes-help"
                  />
                  <p className="hint" id="notes-help">
                    For the operator. These notes are not shown in the
                    extension.
                  </p>
                </div>
                <p className="pass-summary" role="status">
                  {modalStatus === "active"
                    ? "Sushi is available while this pass is unexpired."
                    : modalStatus === "pending"
                      ? "Access stays off until you change Pending to Active."
                      : modalStatus === "locked"
                        ? "Access will be blocked until you activate it again."
                        : "Access will stay expired."}
                  {modalPassType === "lifetime"
                    ? " This pass has no expiry."
                    : ""}
                </p>
              </fieldset>
              {modalError && (
                <p role="alert" className="notice error-text">
                  {modalError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? "Saving..." : "Save pass"}
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
      <span className="sr-only" role="status">
        {copiedId ? "Discord ID copied" : ""}
      </span>
    </div>
  );
}
