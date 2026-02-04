import { useState, useEffect } from "react";
import { getAuthHeaders } from "../../context/AuthContext";
import { Plus, Pencil, Trash2, X, Loader2, Shield, User } from "lucide-react";

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", role: "user", password: "" });
  const [saving, setSaving] = useState(false);
  
  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", { headers: getAuthHeaders() });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  
  useEffect(() => { fetchUsers(); }, []);
  
  const openCreate = () => {
    setEditUser(null);
    setForm({ email: "", firstName: "", lastName: "", role: "user", password: "" });
    setShowModal(true);
  };
  
  const openEdit = (u: UserData) => {
    setEditUser(u);
    setForm({ email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, password: "" });
    setShowModal(true);
  };
  
  const handleSave = async () => {
    setSaving(true);
    const url = editUser ? `/api/admin/users/${editUser.id}` : "/api/admin/users";
    const method = editUser ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowModal(false);
    fetchUsers();
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    fetchUsers();
  };
  
  if (loading) return <div className="p-8 text-text-secondary">Loading users...</div>;
  
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Users</h1>
          <p className="text-text-secondary text-sm">Manage admin accounts and permissions</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-void font-medium rounded transition">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>
      
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-elevated/50">
            <tr className="text-left text-xs font-mono text-text-muted uppercase">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-elevated/30 transition">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div>
                      <div className="font-medium">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-text-muted font-mono">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${u.role === "admin" ? "bg-accent/20 text-accent" : "bg-blue-500/20 text-blue-400"}`}>
                    {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? "bg-success/20 text-success" : "bg-text-muted/20 text-text-muted"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-text-secondary">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => openEdit(u)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-elevated rounded transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 text-text-muted hover:text-critical hover:bg-critical/10 rounded transition ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editUser ? "Edit User" : "Add User"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">First Name</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full px-3 py-2 bg-elevated border border-border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Last Name</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full px-3 py-2 bg-elevated border border-border rounded text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-elevated border border-border rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 bg-elevated border border-border rounded text-sm">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">{editUser ? "New Password (leave blank to keep)" : "Password"}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 bg-elevated border border-border rounded text-sm" />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-border hover:bg-elevated rounded transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-accent hover:bg-accent/90 text-void font-medium rounded transition flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
