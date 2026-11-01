import Link from "next/link";
import { fetchTags } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

export const revalidate = 60;

export default async function TagsPage() {
  const res = await fetchTags(100, 0);
  const tags = res.data?.tags || [];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Hash className="w-4 h-4" />
          <span>tag_index // taxonomy</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Browse by Tag
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Index of developer tags, technologies, frameworks, and architecture patterns.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        {tags.map((tag) => (
          <Link key={tag.id} href={`/tag/${tag.slug}`}>
            <Badge
              variant="outline"
              className="bg-zinc-900/80 border-zinc-750 hover:border-emerald-500/80 text-zinc-300 hover:text-emerald-300 font-mono text-sm py-1.5 px-3 transition-colors cursor-pointer"
            >
              #{tag.name}
              {tag.usage_count > 0 && (
                <span className="ml-2 text-xs text-zinc-500">
                  {tag.usage_count}
                </span>
              )}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
