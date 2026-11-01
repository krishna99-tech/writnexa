"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAdminUsers,
  updateAdminUserStatus,
  updateAdminUserRole,
  AdminUserSummary,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  Ban,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function AdminUsersPage() {
  const { accessToken, user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal / Confirm state for sensitive actions
  const [actionTarget, setActionTarget] = useState<AdminUserSummary | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "reactivate" | "role" | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminUsers(accessToken, {
      q: searchQuery,
      role: selectedRole,
      status: selectedStatus,
      page,
      per_page: 15,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setUsers(res.data.users || []);
      setTotalRecords(res.meta?.total_records || 0);
      setTotalPages(res.meta?.total_pages || 1);
    }
  }, [accessToken, searchQuery, selectedRole, selectedStatus, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleConfirmAction = async () => {
    if (!accessToken || !actionTarget || !actionType) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    if (actionType === "suspend") {
      const res = await updateAdminUserStatus(accessToken, actionTarget.id, "suspended");
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg(`User ${actionTarget.email} has been suspended.`);
        setActionTarget(null);
        setActionType(null);
        loadUsers();
      } else {
        setErrorMsg(res.error?.message || "Failed to suspend account");
      }
    } else if (actionType === "reactivate") {
      const res = await updateAdminUserStatus(accessToken, actionTarget.id, "active");
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg(`User ${actionTarget.email} has been reactivated.`);
        setActionTarget(null);
        setActionType(null);
        loadUsers();
      } else {
        setErrorMsg(res.error?.message || "Failed to reactivate account");
      }
    } else if (actionType === "role") {
      const res = await updateAdminUserRole(accessToken, actionTarget.id, newRole);
      setIsSubmitting(false);
      if (res.success) {
        setSuccessMsg(`User ${actionTarget.email} role updated to ${newRole}.`);
        setActionTarget(null);
        setActionType(null);
        loadUsers();
      } else {
        setErrorMsg(res.error?.message || "Failed to update role");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Users className="w-4 h-4" />
          <span>user_directory // rbac_management</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          User Management
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Manage reader and author accounts, verify profiles, adjust authorization roles, and suspend violating actors.
        </p>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search email, username, or display name..."
            className="pl-9 h-10 bg-zinc-950 border-zinc-800 font-mono text-xs w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none focus:border-zinc-700"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="author">Author</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none focus:border-zinc-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Articles</th>
                <th className="py-3 px-4 font-semibold">Followers</th>
                <th className="py-3 px-4 font-semibold">Joined</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                    {/* User Identity */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-zinc-200">
                          {u.display_name || u.username || "—"}
                        </div>
                        <div className="text-zinc-500 text-[11px]">
                          {u.email}
                        </div>
                        {u.username && (
                          <div className="text-emerald-400 text-[11px]">
                            @{u.username}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={u.role === "super_admin" ? "default" : "secondary"}
                        className="text-[10px] font-mono capitalize"
                      >
                        {u.role}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono capitalize ${
                          u.status === "active"
                            ? "border-emerald-800 text-emerald-400 bg-emerald-950/20"
                            : u.status === "suspended"
                            ? "border-rose-800 text-rose-400 bg-rose-950/20"
                            : "border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {u.status}
                      </Badge>
                    </td>

                    {/* Articles */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      {u.article_count}
                    </td>

                    {/* Followers */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      {u.follower_count}
                    </td>

                    {/* Joined */}
                    <td className="py-3.5 px-4 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Change Role Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActionTarget(u);
                            setActionType("role");
                            setNewRole(u.role);
                          }}
                          className="h-7 text-xs font-mono text-zinc-400 hover:text-zinc-100"
                        >
                          Role
                        </Button>

                        {/* Suspend / Reactivate */}
                        {u.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionTarget(u);
                              setActionType("reactivate");
                            }}
                            className="h-7 text-xs font-mono text-emerald-400 border-emerald-900 bg-emerald-950/30 hover:bg-emerald-950/60"
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionTarget(u);
                              setActionType("suspend");
                            }}
                            className="h-7 text-xs font-mono text-rose-400 border-rose-900 bg-rose-950/30 hover:bg-rose-950/60"
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-800 text-xs font-mono text-zinc-400">
            <span>
              Total records: <strong className="text-zinc-200">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs font-mono border-zinc-800"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs font-mono border-zinc-800"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Sensitive Operations */}
      {actionTarget && actionType && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Confirm Sensitive Operation
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Target: {actionTarget.email}
                </p>
              </div>
            </div>

            {actionType === "suspend" && (
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Suspending this user will immediately revoke all active sessions, block further authentication, and hide their public contributions. An administrative audit log will be recorded.
              </p>
            )}

            {actionType === "reactivate" && (
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Reactivating this account will restore access and allow the user to sign in and interact normally.
              </p>
            )}

            {actionType === "role" && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Select new authorization role for this user. Escalation to <strong>admin</strong> or <strong>super_admin</strong> requires Super Admin credentials.
                </p>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200"
                >
                  <option value="user">User (Reader / Participant)</option>
                  <option value="author">Author (Publication Creator)</option>
                  <option value="moderator">Moderator (Queue Manager)</option>
                  <option value="admin">Admin (Staff Operator)</option>
                  <option value="super_admin">Super Admin (Root Authority)</option>
                </select>
                {currentUser?.role !== "super_admin" && (newRole === "admin" || newRole === "super_admin") && (
                  <p className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Super Admin authority is required for this role.</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionTarget(null);
                  setActionType(null);
                }}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold"
              >
                {isSubmitting ? "Executing..." : "Confirm & Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

