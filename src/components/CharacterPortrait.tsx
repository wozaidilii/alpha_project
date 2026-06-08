"use client";

import Image from "next/image";
import { CHARACTER_PORTRAITS, type CharacterConfig } from "~/types/character";

type Variant = "full" | "card" | "avatar";

const variantClass: Record<Variant, string> = {
  full: "object-contain object-bottom",
  card: "object-cover object-top",
  avatar: "object-cover object-top",
};

const variantSizes: Record<Variant, string> = {
  full: "420px",
  card: "(max-width: 640px) 100vw, 260px",
  avatar: "96px",
};

export function getCharacterPortrait(config?: CharacterConfig | null) {
  const portraitId = config?.portraitId ?? 0;
  return CHARACTER_PORTRAITS[portraitId] ?? CHARACTER_PORTRAITS[0];
}

export function CharacterPortrait({
  config,
  variant = "full",
  className = "",
  priority = false,
}: {
  config?: CharacterConfig | null;
  variant?: Variant;
  className?: string;
  priority?: boolean;
}) {
  const portrait = getCharacterPortrait(config);

  return (
    <Image
      src={portrait.image}
      alt={portrait.name}
      fill
      priority={priority}
      sizes={variantSizes[variant]}
      className={`${variantClass[variant]} ${className}`}
    />
  );
}
