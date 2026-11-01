"use client";

import EditArticlePage from "@/app/studio/articles/[id]/edit/page";

export default function DashboardEditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <EditArticlePage params={params} />;
}

