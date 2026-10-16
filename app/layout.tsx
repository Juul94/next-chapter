import { Inconsolata, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import Nav from "./Nav";

export const metadata = { title: "Nyt job" };

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-poppins" });
const inconsolata = Inconsolata({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inconsolata" });

// Sætter temaet før siden tegnes (gemt valg, ellers systemets), så den ikke blinker lyst
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={`${roboto.variable} ${poppins.variable} ${inconsolata.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans text-ink antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-12">{children}</main>
      </body>
    </html>
  );
}
