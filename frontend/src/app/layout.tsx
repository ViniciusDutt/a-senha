import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Sunbeam } from "@/components/ui/sunbeam";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "A Senha: jogo multiplayer de palavras";

const description =
  "A Senha é um jogo multiplayer em tempo real para quatro pessoas, divididas em duas duplas. Crie uma sala, convide seus amigos e jogue.";

const url = "https://a-senha.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),

  title,
  description,

  applicationName: "A Senha",

  appleWebApp: {
    title: "A Senha",
    statusBarStyle: "default",
    capable: true
  },

  keywords: [
    "A Senha",
    "jogo multiplayer",
    "jogo online",
    "jogo em tempo real",
    "jogo para amigos",
    "jogo de palavras",
    "jogo de adivinhação",
    "jogo em dupla",
    "jogo para quatro pessoas",
    "jogo online para 4 jogadores",
    "Socket.IO",
    "WebSockets",
    "Next.js",
    "NestJS",
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: url,
  },

  openGraph: {
    title,
    description,
    siteName: "A Senha",
    locale: "pt_BR",
    type: "website",
    url,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A Senha — jogo multiplayer de palavras",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },

  category: "games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-black bg-linear-to-t from-background to-background/30 overflow-hidden">
        <div className="-z-10 w-screen h-dvh overflow-hidden absolute">
          <Sunbeam />
        </div>
        {children}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
