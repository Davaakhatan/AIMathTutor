import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

/**
 * API route to update XP data (server-side with service role)
 * This bypasses RLS issues that block client-side updates
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, xpData } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!xpData) {
      return NextResponse.json({ error: "xpData required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      logger.warn("Supabase server client not available");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    // CRITICAL: Ensure user has a profile entry before inserting XP data
    // xp_data has foreign key constraint: user_id REFERENCES profiles(id)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      logger.error("Error checking profile", { error: profileCheckError.message, userId });
    }

    if (!existingProfile) {
      logger.info("Creating profile for XP update", { userId });
      const { error: createProfileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role: "student",
        });

      if (createProfileError && createProfileError.code !== "23505") {
        logger.error("Failed to create profile for XP", { error: createProfileError.message, userId, code: createProfileError.code });
        return NextResponse.json({ error: "Failed to create user profile: " + createProfileError.message }, { status: 500 });
      }
      logger.info("Profile created for XP update", { userId });
    }

    // Filter out any fields that don't exist in the database schema
    const { recent_gains, ...dbFields } = xpData;

    const updateData: any = {
      ...dbFields,
      user_id: userId,
      student_profile_id: effectiveProfileId,
      updated_at: new Date().toISOString(),
    };

    // First, find existing record by fetching all and filtering
    // (.is() has inconsistent behavior with NULL values)
    const { data: existingRecords } = await supabase
      .from("xp_data")
      .select("id")
      .eq("user_id", userId);

    // Find the record that matches our profile filter
    const matchingRecord = existingRecords?.find((r: any) => {
      if (effectiveProfileId) {
        return r.student_profile_id === effectiveProfileId;
      } else {
        return r.student_profile_id === null;
      }
    });

    let updated = null;
    let updateError = null;

    if (matchingRecord) {
      // Update by ID for reliability
      const result = await supabase
        .from("xp_data")
        .update(updateData)
        .eq("id", matchingRecord.id)
        .select();
      updated = result.data;
      updateError = result.error;
    }

    logger.debug("Update result", {
      userId,
      updatedCount: updated?.length || 0,
      updateError: updateError?.message,
      effectiveProfileId
    });

    // If update succeeded, we're done
    if (updated && updated.length > 0) {
      logger.info("XP data updated via API", {
        userId,
        profileId: effectiveProfileId,
        totalXP: xpData.total_xp,
        level: xpData.level
      });
      return NextResponse.json({ success: true, updated: true });
    }

    // If no rows were updated, record doesn't exist - INSERT it
    if (!updated || updated.length === 0) {
      logger.debug("No existing XP record, inserting new via API", { userId, profileId: effectiveProfileId });

      const { data: insertedData, error: insertError } = await supabase
        .from("xp_data")
        .insert(updateData)
        .select();

      logger.debug("Insert result", {
        userId,
        insertedCount: insertedData?.length || 0,
        insertError: insertError?.message,
        insertErrorCode: insertError?.code
      });

      if (insertError) {
        // If duplicate key (race condition), the record was just created - fetch it and update
        if (insertError.code === "23505") {
          logger.debug("Duplicate key on insert, fetching and updating", { userId });
          // Re-fetch to find the record
          const { data: retryRecords } = await supabase
            .from("xp_data")
            .select("id, student_profile_id")
            .eq("user_id", userId);

          const retryRecord = retryRecords?.find((r: any) =>
            effectiveProfileId ? r.student_profile_id === effectiveProfileId : r.student_profile_id === null
          );

          if (retryRecord) {
            const { error: retryError } = await supabase
              .from("xp_data")
              .update(updateData)
              .eq("id", retryRecord.id);

            if (retryError) {
              logger.error("Retry update also failed", { error: retryError.message, userId });
              return NextResponse.json({ error: retryError.message }, { status: 500 });
            }
          }
          logger.info("XP data updated on retry via API", { userId, profileId: effectiveProfileId });
          return NextResponse.json({ success: true, updated: true });
        }

        logger.error("Failed to insert XP data via API", { error: insertError.message, userId });
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      logger.info("XP data inserted via API", {
        userId,
        profileId: effectiveProfileId,
        totalXP: xpData.total_xp,
        level: xpData.level
      });
      return NextResponse.json({ success: true, inserted: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in POST /api/xp/update", { error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
