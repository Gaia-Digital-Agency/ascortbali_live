import type { UserAccount } from "./types";
import { fmtDate } from "./constants";

export function UsersTab({
  users, onToggleVerified, onView,
}: {
  users: UserAccount[];
  onToggleVerified: (id: string, current: boolean) => void;
  onView: (id: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-brand-line bg-brand-surface/55 p-7 shadow-luxe">
      <div className="text-xs tracking-[0.22em] text-brand-muted">REGISTERED USERS ({users.length})</div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-line text-left text-xs tracking-[0.18em] text-brand-muted">
              <th className="pb-3 pr-4 font-normal">FULL NAME</th>
              <th className="pb-3 pr-4 font-normal">VERIFIED</th>
              <th className="pb-3 pr-4 font-normal">REGISTERED</th>
              <th className="pb-3 font-normal">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-xs text-brand-muted">No users yet.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-brand-line/40 last:border-0">
                <td className="py-3 pr-4 text-xs">{u.full_name || "—"}</td>
                <td className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => onToggleVerified(u.id, u.verified)}
                    title={u.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                    aria-label={u.verified ? "Verified — click to unverify" : "Not verified — click to verify"}
                    className={`h-5 w-5 rounded-full border-2 transition ${u.verified ? "bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.55)]" : "bg-transparent border-brand-muted/60 hover:border-brand-muted"}`}
                  />
                </td>
                <td className="py-3 pr-4 text-xs text-brand-muted">{fmtDate(u.created_at)}</td>
                <td className="py-3">
                  <button onClick={() => onView(u.id)} className="btn btn-outline px-3 py-1.5 text-xs">VIEW</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
