import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { LearningPath, LearningPathStep } from "@/services/learningPathGenerator";

/**
 * GET /api/learning-paths
 * Fetch learning path for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Fetching learning path via API", { userId, effectiveProfileId });

    // Query learning path - prioritize active, then completed, then archived
    let query = supabase
      .from("learning_paths")
      .select("*")
      .eq("user_id", userId)
      .order("status", { ascending: true }) // active < completed < archived (alphabetically)
      .order("created_at", { ascending: false })
      .limit(1);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching learning path", {
        error: error.message,
        userId,
        effectiveProfileId,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, path: null });
    }

    const pathData = data[0] as any;
    
    // Convert database format to LearningPath format
    const learningPath: LearningPath = {
      id: pathData.id,
      goal: pathData.goal,
      targetConcepts: pathData.target_concepts || [],
      steps: (pathData.steps || []) as LearningPathStep[],
      currentStep: pathData.current_step || 0,
      createdAt: new Date(pathData.created_at).getTime(),
      lastUpdated: new Date(pathData.updated_at).getTime(),
      progress: pathData.progress || 0,
      // Handle missing columns gracefully
      status: (pathData.status as "active" | "completed" | "archived") || "active",
      completedAt: pathData.completed_at ? new Date(pathData.completed_at).getTime() : undefined,
    };

    logger.debug("Learning path fetched via API", {
      pathId: learningPath.id,
      goal: learningPath.goal,
      stepsCount: learningPath.steps.length,
      progress: learningPath.progress,
    });

    return NextResponse.json({ success: true, path: learningPath });
  } catch (error) {
    logger.error("Exception fetching learning path via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning-paths
 * Create or update learning path
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, profileId, path } = body;

    if (!userId || !path) {
      return NextResponse.json(
        { success: false, error: "userId and path required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Saving learning path via API", {
      userId,
      effectiveProfileId,
      pathId: path.id,
      goal: path.goal,
    });

    // Convert LearningPath format to database format
    const pathData: any = {
      user_id: userId,
      student_profile_id: effectiveProfileId,
      goal: path.goal,
      target_concepts: path.targetConcepts || [],
      steps: path.steps || [],
      current_step: path.currentStep || 0,
      progress: path.progress || 0,
      status: path.status || "active",
      updated_at: new Date().toISOString(),
    };

    // Add completed_at if path is completed
    if (path.status === "completed" && path.completedAt) {
      pathData.completed_at = new Date(path.completedAt).toISOString();
    }

    // Check if path already exists (by ID if provided, or by user/profile)
    let result;
    if (path.id) {
      // Update existing path by ID
      const { data, error } = await (supabase as any)
        .from("learning_paths")
        .update(pathData)
        .eq("id", path.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating learning path", {
          error: error.message,
          userId,
          effectiveProfileId,
        });
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Check if there's an active path for this user/profile
      let checkQuery = supabase
        .from("learning_paths")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);

      if (effectiveProfileId) {
        checkQuery = checkQuery.eq("student_profile_id", effectiveProfileId);
      } else {
        checkQuery = checkQuery.is("student_profile_id", null);
      }

      const { data: existingActive } = await checkQuery;

      // If there's an active path, archive it before creating new one
      if (existingActive && existingActive.length > 0) {
        const existingActivePath = existingActive[0] as any;
        await (supabase as any)
          .from("learning_paths")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("id", existingActivePath.id);
        logger.debug("Archived existing active path", { archivedId: existingActivePath.id });
      }

      // Insert new path - let database generate UUID
      const { data, error } = await (supabase as any)
        .from("learning_paths")
        .insert(pathData)
        .select()
        .single();

      if (error) {
        logger.error("Error creating learning path", {
          error: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          userId,
          effectiveProfileId,
          pathData: JSON.stringify(pathData).substring(0, 200), // Log first 200 chars
        });
        return NextResponse.json(
          { success: false, error: error.message || "Failed to create learning path" },
          { status: 500 }
        );
      }

      result = data;
    }

    // Convert back to LearningPath format
    const learningPath: LearningPath = {
      id: result.id,
      goal: result.goal,
      targetConcepts: result.target_concepts || [],
      steps: (result.steps || []) as LearningPathStep[],
      currentStep: result.current_step || 0,
      createdAt: new Date(result.created_at).getTime(),
      lastUpdated: new Date(result.updated_at).getTime(),
      progress: result.progress || 0,
      status: (result.status as "active" | "completed" | "archived") || "active",
      completedAt: result.completed_at ? new Date(result.completed_at).getTime() : undefined,
    };

    logger.debug("Learning path saved via API", {
      pathId: learningPath.id,
      goal: learningPath.goal,
    });

    return NextResponse.json({ success: true, path: learningPath });
  } catch (error: any) {
    logger.error("Exception saving learning path via API", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
    return NextResponse.json(
      { success: false, error: error?.message || String(error) || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning-paths
 * Delete learning path
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;

    logger.debug("Deleting learning path via API", { userId, effectiveProfileId });

    let query = (supabase as any)
      .from("learning_paths")
      .delete()
      .eq("user_id", userId);

    if (effectiveProfileId) {
      query = query.eq("student_profile_id", effectiveProfileId);
    } else {
      query = query.is("student_profile_id", null);
    }

    const { error } = await query;

    if (error) {
      logger.error("Error deleting learning path", {
        error: error.message,
        userId,
        effectiveProfileId,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    logger.debug("Learning path deleted via API", { userId, effectiveProfileId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Exception deleting learning path via API", { error });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

