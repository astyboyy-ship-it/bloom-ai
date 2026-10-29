"use client";

import { Github, Linkedin, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { BloomLogo } from "./logo";
import { useSiteCopy } from "./site-copy";

export type SocialLinks = {
  x?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
};

/** Edit these to point at Bloom AI's profiles. Leave a value empty to hide that icon. */
export const defaultSocialLinks: SocialLinks = {
  x: "https://x.com/bloomai",
  linkedin: "https://www.linkedin.com/company/bloomai",
  github: "https://github.com/bloomai",
  youtube: "https://www.youtube.com/@bloomai",
};

const platforms: { key: keyof SocialLinks; label: string; icon: LucideIcon }[] = [
  { key: "x", label: "X (Twitter)", icon: Twitter },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "github", label: "GitHub", icon: Github },
  { key: "youtube", label: "YouTube", icon: Youtube },
];

export function Footer({ socials = defaultSocialLinks }: { socials?: SocialLinks }) {
  const links = platforms.filter((p) => socials[p.key]);
  const { s } = useSiteCopy();

  return (
    <footer className="relative overflow-hidden bg-ink px-4 pb-10 pt-20">
      {/* Oversized wordmark */}
      <p
        aria-hidden
        className="pointer-events-none select-none text-center font-serif text-[26vw] italic leading-[0.8] tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_rgb(245_169_176/0.12)] lg:text-[18rem]"
      >
        Bloom
      </p>

      <div className="relative mx-auto -mt-6 flex max-w-6xl flex-col items-center justify-between gap-8 border-t border-white/[0.06] pt-10 md:flex-row">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <BloomLogo />
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Bloom AI · <span className="font-jp">眠る間に、開花する</span>
          </p>
        </div>

        <div className="glass inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs text-white/60">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-dusk/70" />
            <span className="relative inline-flex size-2 rounded-full bg-dusk" />
          </span>
          {s.footer.operational}
        </div>

        <ul className="flex items-center gap-1">
          {links.map((p) => (
            <li key={p.key}>
              <a
                href={socials[p.key]}
                target="_blank"
                rel="noreferrer"
                aria-label={p.label}
                className="flex size-10 items-center justify-center rounded-xl text-white/40 transition-all hover:-translate-y-0.5 hover:bg-white/5 hover:text-rose"
              >
                <p.icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
