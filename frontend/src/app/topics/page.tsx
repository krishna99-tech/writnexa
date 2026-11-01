import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Terminal, ArrowRight, Cpu, Database, Layout, Server, Shield } from "lucide-react";

export const revalidate = 60;

const iconMap: Record<string, any> = {
  terminal: Terminal,
  cpu: Cpu,
  database: Database,
  layout: Layout,
  server: Server,
  shield: Shield,
};

export default async function TopicsPage() {
  const res = await fetchCategories();
  const categories = res.data?.categories || [];

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Layers className="w-4 h-4" />
          <span>taxonomy_index // topic_directory</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Core Engineering Topics
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Browse technical publishing categorized by specialization and architecture domains.
        </p>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const IconComponent = (cat.icon_name && iconMap[cat.icon_name]) || Layers;

          return (
            <Link key={cat.id} href={`/topic/${cat.slug}`} className="group block">
              <Card className="h-full border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-emerald-500/50 transition-all duration-200">
                <CardHeader className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                    <span>{cat.name}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </CardTitle>

                  {cat.description && (
                    <CardDescription className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-3">
                      {cat.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

