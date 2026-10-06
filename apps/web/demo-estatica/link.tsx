// Substitui next/link na demonstração estática: navega dentro da própria página.
import type { AnchorHTMLAttributes } from "react";

export function navegar(href: string) {
  window.dispatchEvent(new CustomEvent("navegar", { detail: href }));
}

export default function Link({ href, onClick, ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
        navegar(href);
      }}
      {...resto}
    />
  );
}
