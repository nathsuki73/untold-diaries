import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/submit", label: "Submit" },
];

const credits = [
  "Gio Andrew Briones",
  "Nathaniel Segovia",
  "Neil Patrick Pajadan",
  "Jannea May Rosal",
  "Freesia Mae Masakayan",
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-11 w-11" />
              <p className="font-serif text-xl text-ink">Untold Diaries</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Stay anonymous. No names, no judgements — just untold truths and
              the songs that go with them.
            </p>
          </div>

          <nav aria-label="Footer" className="sm:pt-1">
            <ul className="flex flex-wrap gap-x-6 gap-y-1">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-xs leading-5 text-muted sm:flex-row sm:items-start sm:justify-between">
          <p>© 2025 Untold Diaries. All rights reserved.</p>
          <p className="max-w-xl sm:text-right">
            Designed and developed by {credits.join(", ")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
