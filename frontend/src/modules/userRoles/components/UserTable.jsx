import { Edit3, UserRound } from 'lucide-react';
import StatusBadge from '../../students/components/StatusBadge';

export default function UserTable({ users, rolesById, canEdit, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr className="bg-[#e7e7e9] text-left text-slate-900">
            <th className="px-5 py-3 rounded-l-lg">User</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 rounded-r-lg text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid} className="bg-white shadow-[0_0_0_1px_rgba(226,232,240,0.9)] rounded-lg">
              <td className="px-5 py-4 rounded-l-lg">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-[#30343c] text-emerald-300 flex items-center justify-center">
                    <UserRound size={20} />
                  </span>
                  <span>
                    <span className="block font-bold text-slate-900">{user.name}</span>
                    <span className="block text-xs text-slate-500">{user.email}</span>
                  </span>
                </div>
              </td>
              <td className="px-5 py-4">{rolesById[user.roleId]?.name || user.roleId}</td>
              <td className="px-5 py-4"><StatusBadge value={user.status || 'Active'} /></td>
              <td className="px-5 py-4 rounded-r-lg">
                <div className="flex justify-end">
                  <button
                    onClick={() => onEdit(user)}
                    disabled={!canEdit}
                    className="h-9 w-9 rounded-full border border-slate-200 flex items-center justify-center"
                    title="Edit user"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!users.length && (
            <tr>
              <td colSpan="4" className="bg-white text-center text-sm text-slate-500 px-5 py-10 shadow-[0_0_0_1px_rgba(226,232,240,0.9)] rounded-lg">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
