import { NextRequest, NextResponse } from "next/server";
import { problemParser } from "@/services/problemParser";
import { ParseProblemRequest, ParseProblemResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ParseProblemRequest = await request.json();

    if (!body.type || !body.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type and data",
        } as ParseProblemResponse,
        { status: 400 }
      );
    }

    let parsedProblem;

    if (body.type === "text") {
      parsedProblem = await problemParser.parseText(body.data);
    } else if (body.type === "image") {
      // Remove data URL prefix if present
      const base64Data = body.data.replace(/^data:image\/\w+;base64,/, "");
      parsedProblem = await problemParser.parseImage(base64Data);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid type. Must be 'text' or 'image'",
        } as ParseProblemResponse,
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      problem: parsedProblem,
    } as ParseProblemResponse);
  } catch (error) {
    console.error("Error parsing problem:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse problem",
      } as ParseProblemResponse,
      { status: 500 }
    );
  }
}

