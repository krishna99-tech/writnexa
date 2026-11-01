"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { API_BASE_URL, ApiResponse } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "author" | "moderator" | "admin" | "super_admin";
  status: "pending_verification" | "active" | "suspended" | "deactivated";
  email_verified: boolean;
}

export interface AuthProfile {
  username: string;
  display_name: string;
  avatar_url?: string | null;
  headline?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (
    token: string,
    user: AuthUser,
    profile: AuthProfile
  ) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchCurrentUser: (token?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSession = useCallback(
    (token: string, u: AuthUser, p: AuthProfile) => {
      setAccessToken(token);
      setUser(u);
      setProfile(p);
      try {
        localStorage.setItem("quorix_access_token", token);
      } catch {}
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setAccessToken(null);
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem("quorix_access_token");
    } catch {}
  }, []);

  const fetchCurrentUser = useCallback(
    async (tokenToUse?: string): Promise<boolean> => {
      const token = tokenToUse || accessToken;
      if (!token) return false;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data: ApiResponse<{ user: AuthUser; profile: AuthProfile }> =
          await res.json();

        if (res.ok && data.success && data.data) {
          setUser(data.data.user);
          setProfile(data.data.profile);
          return true;
        } else {
          return false;
        }
      } catch {
        return false;
      }
    },
    [accessToken]
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      const data: ApiResponse<{ access_token: string }> = await res.json();
      if (res.ok && data.success && data.data?.access_token) {
        const newToken = data.data.access_token;
        setAccessToken(newToken);
        try {
          localStorage.setItem("quorix_access_token", newToken);
        } catch {}
        return await fetchCurrentUser(newToken);
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchCurrentUser]);

  // Initial session restoration on app mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);
      const savedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("quorix_access_token")
          : null;

      if (savedToken) {
        setAccessToken(savedToken);
        const valid = await fetchCurrentUser(savedToken);
        if (!valid && mounted) {
          // If token expired, attempt silent cookie refresh
          await refreshSession();
        }
      } else {
        // Attempt silent refresh via HTTP-only cookie
        await refreshSession();
      }

      if (mounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        accessToken,
        isLoading,
        setSession,
        logout,
        refreshSession,
        fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
