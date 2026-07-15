"use client";

import { useState } from "react";
import { DEFAULT_AI_MODEL, isAiModel, type AiModel } from "@/core/ai/models";

function storageKeyFor(action: string): string {
  return `cbuilder:ai-model:${action}`;
}

function readStored(action: string): AiModel {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;
  const stored = window.localStorage.getItem(storageKeyFor(action));
  return isAiModel(stored) ? stored : DEFAULT_AI_MODEL;
}

/**
 * Model choice per AI action, persisted in localStorage (client-only, no
 * server/DB — this is a personal preference, not application data). Both
 * callers (wizard step 4, drawer Preguntas section) only ever mount after a user
 * interaction (never part of the initial SSR pass), so reading localStorage
 * in the lazy `useState` initializer is safe — no hydration mismatch.
 */
export function useAiModel(action: string): [AiModel, (model: AiModel) => void] {
  const [model, setModel] = useState<AiModel>(() => readStored(action));

  function update(next: AiModel) {
    setModel(next);
    if (typeof window !== "undefined") window.localStorage.setItem(storageKeyFor(action), next);
  }

  return [model, update];
}
