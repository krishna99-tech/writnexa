export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
  meta?: {
    page?: number;
    per_page?: number;
    total_records?: number;
    total_pages?: number;
  };
}

export interface HealthCheckData {
  status: "healthy" | "degraded";
  version: string;
  uptime_seconds: number;
  timestamp: string;
  services: {
    database: {
      status: string;
      error?: string;
      latency?: string;
    };
    redis: {
      status: string;
      error?: string;
      latency?: string;
    };
  };
}

export async function fetchHealth(): Promise<ApiResponse<HealthCheckData>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "CONNECTION_FAILED",
        message:
          error?.message || "Failed to reach QUORIX backend API at " + API_BASE_URL,
      },
    };
  }
}

