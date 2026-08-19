import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watchpost",
  description: "Self-hosted uptime monitoring and public status pages.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="navbar bg-base-100 border-b border-base-300 px-4">
          <div className="flex-1">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              📡 Watchpost
            </Link>
          </div>
          <nav className="flex-none">
            <ul className="menu menu-horizontal gap-1 px-1">
              <li>
                <Link href="/">Status</Link>
              </li>
              <li>
                <Link href="/admin">Admin</Link>
              </li>
            </ul>
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
          {children}
        </main>
        <footer className="footer footer-center border-t border-base-300 p-4 text-sm text-base-content/60">
          <p>
            Watchpost — open-source uptime monitoring.{" "}
            <a
              className="link"
              href="https://github.com/frankTurtle/watchpost"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
