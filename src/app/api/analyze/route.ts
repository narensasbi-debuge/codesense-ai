import { NextResponse } from "next/server";
import { analyzeCode } from "@/lib/llm";
import {
  AnalyzeRequestSchema,
  AnalyzeResultSchema,
} from "@/lib/schemas";

/**
 * POST /api/analyze
 *
 * Accepts a JSON body: { code: string, language: string }
 * Returns a validated JSON response with documentation, refactored_code, and unit_tests.
 */
export async function POST(request: Request) {
  // --- Parse request body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  // --- Validate request body with Zod ---
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return NextResponse.json(
      { error: `Invalid request: ${issues}` },
      { status: 400 },
    );
  }

  const { code, language } = parsed.data;

  // --- Call the LLM ---
  let result: Awaited<ReturnType<typeof analyzeCode>>;
  try {
    result = await analyzeCode(code, language);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[/api/analyze] LLM call failed:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }

  // --- Double-validate the LLM response before returning to client ---
  const validated = AnalyzeResultSchema.safeParse(result);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error("[/api/analyze] Response validation failed:", issues);
    return NextResponse.json(
      { error: "The analysis service returned an invalid response. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(validated.data, { status: 200 });
}