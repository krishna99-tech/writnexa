import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "QUORIX — Developer Publishing & Technical Knowledge Ecosystem",
  description:
    "A production-grade technical publishing ecosystem for software engineers, systems architects, and open-source contributors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        <AuthProvider>
          {/* Sleek Developer Header with Session Context */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Reusable Global Community Footer */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
