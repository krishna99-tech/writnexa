import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "WRITNEXA — Developer Publishing & Technical Knowledge Ecosystem",
  description:
    "A production-grade technical publishing ecosystem for software engineers, systems architects, and open-source contributors.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/writnexa-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/writnexa-app-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('writnexa-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = stored === 'light' ? 'light' : (stored === 'system' ? (prefersDark ? 'dark' : 'light') : 'dark');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans transition-colors duration-150">
        <ThemeProvider>
          <AuthProvider>
            {/* Sleek Developer Header with Session Context */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1">{children}</main>

            {/* Reusable Global Community Footer */}
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
