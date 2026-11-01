"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { recordAnalyticsEvent } from "@/lib/api";

interface AnalyticsTrackerProps {
  eventType?: string;
  articleId?: string;
  authorId?: string;
}

export function AnalyticsTracker({
  eventType = "page_view",
  articleId,
  authorId,
}: AnalyticsTrackerProps) {
  const pathname = usePathname();
  const { accessToken } = useAuth();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    recordAnalyticsEvent({
      event_type: eventType,
      path: pathname,
      article_id: articleId,
      author_id: authorId,
      token: accessToken || undefined,
    });
  }, [pathname, eventType, articleId, authorId, accessToken]);

  return null;
}

