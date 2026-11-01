"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchPlatformSettings, updatePlatformSetting, PlatformSettingItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Lock, AlertTriangle, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const { accessToken, user } = useAuth();

  const [settings, setSettings] = useState<PlatformSettingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "super_admin";

  const loadSettings = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchPlatformSettings(accessToken);
    setIsLoading(false);
    if (res.success && res.data?.settings) {
      setSettings(res.data.settings);
    }
  }, [accessToken]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (key: string) => {
    if (!accessToken) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    const res = await updatePlatformSetting(accessToken, key, editingVal);
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMsg(`Setting "${key}" updated successfully.`);
      setEditingKey(null);
      loadSettings();
    } else {
      setErrorMsg(res.error?.message || "Failed to update setting");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
          <Settings className="w-4 h-4" />
          <span>system_configuration // platform_toggles</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Platform Settings
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Manage system configurations, global feature flags, and reader registration policies.
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="p-4 rounded-xl border border-amber-800/80 bg-amber-950/20 text-amber-300 text-xs font-mono flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Read-only mode active: Only a <strong>super_admin</strong> has authority to modify critical platform configurations.
          </span>
        </div>
      )}

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

      {/* Settings Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Key</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Value</th>
                <th className="py-3 px-4 font-semibold">Last Modified</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 font-mono">
                    Loading platform configuration...
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-500 font-mono">
                    No settings found.
                  </td>
                </tr>
              ) : (
                settings.map((s) => (
                  <tr key={s.key} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-zinc-200">
                      {s.key}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-sans max-w-xs">
                      {s.description || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {editingKey === s.key ? (
                        <Input
                          value={editingVal}
                          onChange={(e) => setEditingVal(e.target.value)}
                          className="h-8 font-mono text-xs bg-zinc-950 border-zinc-700"
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs border-zinc-800 text-emerald-400 bg-emerald-950/20"
                        >
                          {s.value}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">
                      {new Date(s.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isSuperAdmin && (
                        editingKey === s.key ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleSave(s.key)}
                              disabled={isSubmitting}
                              className="h-7 text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingKey(null)}
                              className="h-7 text-xs font-mono text-zinc-400"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingKey(s.key);
                              setEditingVal(s.value);
                            }}
                            className="h-7 text-xs font-mono text-zinc-400 hover:text-zinc-100"
                          >
                            Edit
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

