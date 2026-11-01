import Link from "next/link";
import { AuthorSummary } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users } from "lucide-react";

export function AuthorCard({ author }: { author: AuthorSummary }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors group hover:border-zinc-700">
      <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
        <Link href={`/author/${author.username}`} className="group-hover:opacity-90">
          {author.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.avatar_url}
              alt={author.display_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 group-hover:border-emerald-500 transition-colors"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center font-mono font-bold text-lg text-emerald-400 group-hover:border-emerald-500 transition-colors">
              {author.display_name?.[0] || author.username[0].toUpperCase()}
            </div>
          )}
        </Link>

        <div>
          <Link
            href={`/author/${author.username}`}
            className="font-bold text-zinc-100 hover:text-emerald-400 transition-colors block text-base"
          >
            {author.display_name}
          </Link>
          <span className="text-xs font-mono text-zinc-500">@{author.username}</span>
        </div>

        {author.headline && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-sans">
            {author.headline}
          </p>
        )}

        <div className="pt-2 border-t border-zinc-800/80 w-full flex items-center justify-around text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>{author.article_count} Articles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span>{author.follower_count} Followers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

