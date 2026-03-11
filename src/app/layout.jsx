import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Vein Spiral | 스마트한 법률사건 관리",
  description: "효율적인 법률사건 관리와 채권회수의 시작, Vein Spiral",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <UserProvider>
              <div className="min-h-screen flex flex-col vs-shell">
                <Navbar />
                <main className="flex-1 pt-2">{children}</main>
              </div>
              <Toaster position="top-right" theme="system" richColors />
            </UserProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
