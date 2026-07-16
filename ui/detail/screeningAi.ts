"use client";

import { useState } from "react";
import type { AiAnswerContext } from "@/core/screening/ai";
import type { AiModel } from "@/core/ai/models";
import { useAiModel } from "@/ui/useAiModel";

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
