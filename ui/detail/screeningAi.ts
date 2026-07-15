"use client";

import { useState } from "react";
import type { AiModel } from "@/core/ai/models";
import { useAiModel } from "@/ui/useAiModel";

/** Application context sent along with a screening question to the AI pipeline. */
export interface AiAnswerContext {
  company?: string;
  role?: string;
  focus?: string;
  jobContext?: string;
  model: AiModel;
}

/** Row fields that ground a suggestion (all optional — context never blocks). */
export interface ScreeningAiRow {
  company?: string;
  role?: string;
  focus?: string;
  jobUrl?: string;
  jobContext?: string;
}

export interface ScreeningAiContext {
  jobUrl: string;
  setJobUrl: (value: string) => void;
  jobContext: string;
  setJobContext: (value: string) => void;
  model: AiModel;
  setModel: (model: AiModel) => void;
  /** The request payload, assembled from the row + current edits. */
  aiContext: AiAnswerContext;
}

/**
 * Shared state behind every screening suggest form: jobUrl/jobContext start
 * from the row's current values (edits save back onto the row the moment
 * they're used to generate, not on every keystroke) and the model choice is
 * remembered per action (`useAiModel`).
 */
export function useScreeningAiContext(row: ScreeningAiRow): ScreeningAiContext {
  const [jobUrl, setJobUrl] = useState(row.jobUrl ?? "");
  const [jobContext, setJobContext] = useState(row.jobContext ?? "");
  const [model, setModel] = useAiModel("screening-answer");
  return {
    jobUrl,
    setJobUrl,
    jobContext,
    setJobContext,
    model,
    setModel,
    aiContext: { company: row.company, role: row.role, focus: row.focus, jobContext, model },
  };
}

/** Ask the AI pipeline for a draft answer, grounded in the profile context pack. */
export async function requestAiAnswer(
  question: string,
  context: AiAnswerContext,
): Promise<string> {
  const response = await fetch("/api/ai/screening-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...context }),
  });
  const payload = (await response.json()) as { answer?: string; error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `AI generation failed (HTTP ${response.status}).`);
  }
  return payload.answer ?? "";
}
