import type { Metadata } from "next";
import Link from "next/link";
import { fetchAuthors } from "@/lib/api";
import { AuthorCard } from "@/components/author-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, PenSquare, ArrowRight } from "lucide-react";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Discover Technical Authors & Systems Architects | WRITNEXA",
  description:
    "Software engineers, systems architects, and open-source contributors sharing deep architectural expertise on WRITNEXA.",
};

export default async function AuthorsDirectoryPage() {
  const res = await fetchAuthors(1, 24);
  const rawAuthors = res.data?.authors || [];

  // Filter out system administration and non-publishing internal staff accounts
  const authors = rawAuthors
    .filter(
      (a) =>
        a.username !== "admin" &&
        a.username !== "super_admin" &&
        a.display_name !== "System Administrator" &&
        !a.display_name.toLowerCase().includes("administrator")
    )
    .sort((a, b) => (b.article_count || 0) - (a.article_count || 0));

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Users className="w-4 h-4" />
            <span>author_index // public_directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
            Discover Technical Authors
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-sans max-w-2xl leading-relaxed">
            Software engineers, systems architects, and open-source contributors sharing peer-reviewed engineering deep dives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-xs border-zinc-800 text-zinc-400 h-8 px-3">
            {authors.length} Verified Authors
          </Badge>
          <Link href="/become-author">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs h-8">
              <PenSquare className="w-3.5 h-3.5" />
              <span>Join as Author</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Authors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((author) => (
          <AuthorCard key={author.user_id} author={author} />
        ))}
      </div>
    </div>
  );
}

