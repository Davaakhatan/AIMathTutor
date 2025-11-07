/**
 * Test endpoint to check if conversation_summaries table exists
 * Run this to verify migrations were successful
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const supabase = await getSupabaseAdmin();
    
    // Try to query the table
    const { data, error } = await supabase
      .from("conversation_summaries")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errorCode: error.code,
        hint: "Table might not exist. Did you run the SQL migrations?",
        migrationFile: "supabase/migrations/create_conversation_summaries_table.sql"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "conversation_summaries table exists!",
      count: data?.length || 0
    });
  } catch (error) {
    logger.error("Error testing conversation_summaries table", { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

