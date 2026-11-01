import Link from "next/link";
import { fetchAuthors } from "@/lib/api";
import { AuthorCard } from "@/components/author-card";
import { Users } from "lucide-react";

export const revalidate = 60;

export default async function AuthorsDirectoryPage() {
  const res = await fetchAuthors(1, 24);
  const authors = res.data?.authors || [];

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Users className="w-4 h-4" />
          <span>author_index // public_directory</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Discover Technical Authors
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Software engineers, systems architects, and open-source contributors sharing expertise on QUORIX.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((author) => (
          <AuthorCard key={author.user_id} author={author} />
        ))}
      </div>
    </div>
  );
}

