import Link from "next/link";
import { ArticleSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Clock, Eye, Heart, MessageSquare, Sparkles } from "lucide-react";

export function ArticleCard({ article }: { article: ArticleSummary }) {
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all duration-200 flex flex-col justify-between group hover:border-zinc-700">
      <CardHeader className="space-y-3 pb-3">
        {/* Author Metadata & Category */}
        <div className="flex items-center justify-between text-xs font-mono">
          <Link
            href={`/author/${article.author.username}`}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {article.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.author.avatar_url}
                alt={article.author.display_name}
                className="w-5 h-5 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                {article.author.display_name?.[0] || article.author.username[0].toUpperCase()}
              </div>
            )}
            <span>@{article.author.username}</span>
          </Link>

          <div className="flex items-center gap-2">
            {article.featured && (
              <Badge variant="default" className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Featured</span>
              </Badge>
            )}
            {article.category && (
              <Link href={`/topic/${article.category.slug}`}>
                <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  {article.category.name}
                </Badge>
              </Link>
            )}
          </div>
        </div>

        {/* Title */}
        <CardTitle className="text-lg font-bold tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors">
          <Link href={`/article/${article.slug}`}>{article.title}</Link>
        </CardTitle>

        {/* Subtitle / Excerpt */}
        {article.subtitle && (
          <CardDescription className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {article.subtitle}
          </CardDescription>
        )}
      </CardHeader>

      <CardFooter className="pt-2 border-t border-zinc-800/50 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-3">
          <span>{publishedDate}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{article.reading_time_minutes} min read</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{article.views_count}</span>
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>{article.likes_count}</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{article.comments_count}</span>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
