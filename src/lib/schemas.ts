import { z } from "zod";

// ---------------------------------------------------------------------------
// Request validation schema
// ---------------------------------------------------------------------------

/**
 * Schema for the incoming POST /api/analyze request body.
 * Expects a code snippet and its programming language.
 */
export const AnalyzeRequestSchema = z.object({
  code: z
    .string()
    .min(1, "Code must not be empty")
    .max(50_000, "Code must not exceed 50,000 characters"),
  language: z
    .string()
    .min(1, "Language must not be empty")
    .max(50, "Language must not exceed 50 characters"),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ---------------------------------------------------------------------------
// LLM response validation schema
// ---------------------------------------------------------------------------

/**
 * Strict Zod schema for the expected LLM output.
 * Ensures the model returns exactly three string keys.
 */
export const AnalyzeResultSchema = z.object({
  documentation: z
    .string()
    .min(1, "Documentation must not be empty")
    .describe(
      "Clear, concise documentation explaining what the code does, its parameters, return values, and any side effects"
    ),
  refactored_code: z
    .string()
    .min(1, "Refactored code must not be empty")
    .describe(
      "An improved, production-quality version of the code following best practices and design patterns"
    ),
  unit_tests: z
    .string()
    .min(1, "Unit tests must not be empty")
    .describe(
      "Meaningful unit tests that cover edge cases, happy paths, and error scenarios"
    ),
});

/** Inferred TypeScript type from the LLM response Zod schema */
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;