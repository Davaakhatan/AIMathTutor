/**
 * API route for daily problems
 * Handles saving and fetching daily problems to/from database (server-side only)
 */

import { NextRequest, NextResponse } from "next/server";
import { saveDailyProblem, getDailyProblem, DailyProblemData } from "@/services/dailyProblemService";
import { getSupabaseServer } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { ProblemType } from "@/types";
import eventBus from "@/lib/eventBus";

/**
 * Generate a deterministic daily problem based on the date
 * Same date = same problem for all users
 */
async function generateDeterministicDailyProblem(date: string): Promise<DailyProblemData | null> {
  try {
    // Use date as seed for deterministic selection
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();
    
    // Deterministic difficulty based on day of week
    const difficulties: Array<"elementary" | "middle school" | "high school" | "advanced"> = [
      "elementary",
      "middle school", 
      "high school",
      "advanced",
      "middle school",
      "high school",
      "elementary"
    ];
    const difficulty = difficulties[dayOfWeek];

    // Deterministic problem type based on day of month
    const problemTypes: ProblemType[] = [
      ProblemType.ARITHMETIC,
      ProblemType.ALGEBRA,
      ProblemType.GEOMETRY,
      ProblemType.WORD_PROBLEM,
      ProblemType.MULTI_STEP,
    ];
    const problemType = problemTypes[dayOfMonth % problemTypes.length];

    // Deterministic template selection based on date hash
    const dateHash = date.split("-").reduce((acc, val) => acc + parseInt(val), 0);
    
    const templates: Record<ProblemType, string[]> = {
      [ProblemType.ARITHMETIC]: [
        "If a pizza is cut into 8 equal slices and you eat 3 slices, what fraction of the pizza did you eat?",
        "Calculate: 15 × 4 + 12 ÷ 3",
        "What is 25% of 80?",
        "Solve: 3² + 4² = ?",
        "A box contains 24 apples. If you remove 9 apples, how many are left?",
      ],
      [ProblemType.ALGEBRA]: [
        "Solve for x: 2x + 5 = 13",
        "If 3x - 7 = 14, what is the value of x?",
        "Find x if: x + 8 = 20",
        "Solve: 5x = 25",
        "If 2x - 3 = 11, what is x?",
      ],
      [ProblemType.GEOMETRY]: [
        "Find the area of a rectangle with length 8 and width 5",
        "What is the perimeter of a square with side length 6?",
        "Find the area of a circle with radius 4. Use π ≈ 3.14",
        "A triangle has angles of 60°, 60°, and ? What is the missing angle?",
        "What is the volume of a cube with side length 3?",
      ],
      [ProblemType.WORD_PROBLEM]: [
        "Sarah has 15 apples. She gives away 7. How many does she have left?",
        "A store has a 20% off sale. If an item costs $50, what's the sale price?",
        "John has twice as many books as Mary. Together they have 18 books. How many does each have?",
        "A train travels 120 miles in 2 hours. What is its speed in miles per hour?",
        "If 3 pizzas cost $27, how much does 1 pizza cost?",
      ],
      [ProblemType.MULTI_STEP]: [
        "Solve: 2(x + 3) - 5 = 11",
        "If 3x + 2 = 2x + 8, what is x?",
        "Solve: 5(x - 2) + 3 = 18",
        "Find x: 4x - 7 = 2x + 9",
        "Solve: 2(x + 5) - 3(x - 2) = 10",
      ],
      [ProblemType.UNKNOWN]: [
        "Solve for x: 2x + 5 = 13",
        "What is 15 + 23?",
        "Find the area of a rectangle with length 8 and width 5",
      ],
    };

    const typeTemplates = templates[problemType] || templates[ProblemType.ALGEBRA];
    const templateIndex = dateHash % typeTemplates.length;
    const problemText = typeTemplates[templateIndex];

    return {
      date,
      problem: {
        text: problemText,
        type: problemType,
        confidence: 1.0,
      },
      difficulty,
      topic: problemType.replace("_", " "),
    };
  } catch (error) {
    logger.error("Error generating deterministic daily problem", { error, date });
    return null;
  }
}

// Note: GET is now used for completion status check
// To fetch the problem itself, we'll need a different endpoint or use POST with action parameter

// GET: Get daily problem OR check completion status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const userId = searchParams.get("userId");
    const profileId = searchParams.get("profileId");
    const action = searchParams.get("action"); // "getProblem" or "checkCompletion"

    // If action is "getProblem", return the daily problem (shared for all users)
    if (action === "getProblem") {
      logger.debug("Fetching daily problem", { date });
      
      // First check if problem exists in database
      const existingProblem = await getDailyProblem(date);
      if (existingProblem) {
        logger.debug("Daily problem found in database", { date });
        return NextResponse.json({ success: true, problem: existingProblem });
      }

      // No problem exists - generate one deterministically based on date
      logger.info("No daily problem found, generating new one", { date });
      const generatedProblem = await generateDeterministicDailyProblem(date);
      
      if (generatedProblem) {
        // Save to database
        const saved = await saveDailyProblem(generatedProblem);
        if (saved) {
          logger.info("Daily problem generated and saved", { date });
          return NextResponse.json({ success: true, problem: generatedProblem });
        }
      }

      return NextResponse.json({ success: false, error: "Failed to generate daily problem" }, { status: 500 });
    }

    // Default: Check completion status (requires userId)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required for completion check" },
        { status: 400 }
      );
    }

    logger.debug("Checking completion status via API", { date, userId, profileId });
    
    try {
      const supabase = getSupabaseServer();
      
      logger.debug("Supabase client obtained", { 
        hasClient: !!supabase,
        envHasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        envHasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
      
      // Simplified query - just check if a record exists
      // Use count() for faster performance than selecting all fields
      // Use 'date' column (NOT NULL) - completion table doesn't have 'problem_date'
      const query = supabase
        .from("daily_problems_completion")
        .select("id, problem_text, user_id", { count: 'exact', head: false })
        .eq("date", date)
        .eq("user_id", userId)
        .limit(1);
      
      logger.debug("Running simplified completion query", { date, userId });

      // Execute query with shorter timeout
      const queryPromise = query.maybeSingle();
      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) => {
        setTimeout(() => {
          logger.warn("Completion check query timeout", { date, userId });
          resolve({ data: null, error: { message: "Query timeout", code: "TIMEOUT" } });
        }, 2000); // Short 2s timeout
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result;

      if (error) {
        if (error.code === "TIMEOUT") {
          logger.warn("Completion check timed out - treating as not solved", { date, userId });
          // On timeout, assume not solved and let user proceed
          return NextResponse.json({ success: true, isSolved: false, timeout: true });
        }
        logger.error("Error checking completion", { error: error.message, errorCode: error.code, date, userId });
        // On error, assume not solved and let user proceed
        return NextResponse.json({ success: true, isSolved: false });
      }

      const isSolved = !!data;
      const problemText = data?.problem_text || null;
      
      // CRITICAL: Verify the data belongs to the correct user
      const dataUserId = (data as any)?.user_id;
      if (data && dataUserId !== userId) {
        logger.error("CRITICAL: Completion data belongs to different user!", { 
          requestedUserId: userId, 
          dataUserId,
          date 
        });
        return NextResponse.json({ success: true, isSolved: false, error: "User mismatch" });
      }
      
      logger.debug("Completion check result", { 
        date, 
        userId, 
        isSolved, 
        hasData: !!data, 
        hasProblemText: !!problemText,
        problemTextPreview: problemText ? problemText.substring(0, 50) : "none",
        dataUserId: dataUserId || "none"
      });
      return NextResponse.json({ success: true, isSolved, problemText });
    } catch (err) {
      logger.error("Exception in completion check", { error: err, date, userId });
      // On exception, assume not solved and let user proceed
      return NextResponse.json({ success: true, isSolved: false });
    }
  } catch (error) {
    logger.error("Error in GET completion check", { error });
    return NextResponse.json(
      { success: false, isSolved: false },
      { status: 500 }
    );
  }
}

// POST: Save daily problem OR mark as solved
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, problem, difficulty, topic, userId, profileId, problemText } = body;

    // Handle marking as solved
    if (action === "markSolved") {
      if (!date || !userId || !problemText) {
        return NextResponse.json(
          { success: false, error: "Missing required fields for markSolved" },
          { status: 400 }
        );
      }

      logger.debug("Marking daily problem as solved via API", { date, userId, profileId, problemTextLength: problemText?.length });
      
      try {
        const supabase = getSupabaseServer();
        
        // First, check if record exists
        // Use 'date' column (NOT NULL) - completion table doesn't have 'problem_date'
        let checkQuery = supabase
          .from("daily_problems_completion")
          .select("id")
          .eq("user_id", userId)
          .eq("date", date);

        if (profileId && profileId !== "null") {
          checkQuery = checkQuery.eq("student_profile_id", profileId);
        } else {
          checkQuery = checkQuery.is("student_profile_id", null);
        }

        const { data: existing, error: checkError } = await checkQuery.maybeSingle();

        let result: any;
        if (existing && (existing as any).id) {
          // Update existing record
          logger.debug("Updating existing completion", { id: (existing as any).id });
          result = await (supabase as any)
            .from("daily_problems_completion")
            .update({
              problem_text: problemText,
              completed_at: new Date().toISOString(),
              is_solved: true,
            })
            .eq("id", (existing as any).id)
            .select();
        } else {
          // Insert new record
          logger.debug("Inserting new completion");
          
          // CRITICAL: daily_problem_id is NOT NULL, so we must fetch it first
          const { data: dailyProblemData, error: dailyProblemError } = await supabase
            .from("daily_problems")
            .select("id")
            .eq("date", date)
            .single();
          
          if (dailyProblemError || !dailyProblemData) {
            logger.error("Failed to find daily problem for completion", { 
              error: dailyProblemError, 
              date, 
              userId 
            });
            return NextResponse.json(
              { success: false, error: "Daily problem not found for this date" },
              { status: 404 }
            );
          }
          
          // Use 'date' column (NOT NULL) - completion table doesn't have 'problem_date'
          const insertData: any = {
            user_id: userId,
            daily_problem_id: dailyProblemData.id, // REQUIRED: NOT NULL column
            date: date, // Use 'date' column, not 'problem_date'
            problem_text: problemText,
            completed_at: new Date().toISOString(),
            is_solved: true,
          };

          if (profileId && profileId !== "null") {
            insertData.student_profile_id = profileId;
          } else {
            insertData.student_profile_id = null;
          }

          result = await (supabase as any)
            .from("daily_problems_completion")
            .insert(insertData)
            .select();
        }

        const { data, error } = result as { data: any; error: any };

        if (error) {
          logger.error("Error marking daily problem as solved", { 
            error: error?.message || String(error), 
            errorCode: error?.code,
            errorDetails: JSON.stringify(error),
            errorHint: error?.hint,
            date, 
            userId,
            profileId: profileId && profileId !== "null" ? profileId : null
          });
          return NextResponse.json(
            { success: false, error: error?.message || String(error), errorCode: error?.code },
            { status: 500 }
          );
        }

        logger.info("Daily problem marked as solved successfully", { date, userId, data, recordId: data?.[0]?.id });
        
        // Award XP for daily problem completion
        const effectiveProfileId = profileId && profileId !== "null" ? profileId : null;
        try {
          logger.debug("Attempting to award XP for daily problem", { userId, effectiveProfileId, date });
          
          // Use server client (has service role key if available, otherwise anon key)
          const supabase = getSupabaseServer();
          
          // Fetch current XP directly using server client
          let xpQuery = supabase
            .from("xp_data")
            .select("*")
            .eq("user_id", userId);
          
          if (effectiveProfileId) {
            xpQuery = xpQuery.eq("student_profile_id", effectiveProfileId);
          } else {
            xpQuery = xpQuery.is("student_profile_id", null);
          }
          
          const { data: xpRows, error: xpFetchError } = await xpQuery;
          
          if (xpFetchError) {
            logger.error("Error fetching XP data for award", { error: xpFetchError.message, userId });
            throw new Error(`Failed to fetch XP data: ${xpFetchError.message}`);
          }
          
          if (!xpRows || xpRows.length === 0) {
            logger.warn("No XP data found for user, cannot award XP", { userId });
            return NextResponse.json({ success: true, data, xpAwarded: null });
          }
          
          const currentXP = {
            total_xp: xpRows[0].total_xp || 0,
            level: xpRows[0].level || 1,
            xp_to_next_level: xpRows[0].xp_to_next_level || 100,
            xp_history: (xpRows[0].xp_history as any) || [],
          };
          
          logger.debug("XP data fetched", { 
            totalXP: currentXP.total_xp, 
            level: currentXP.level,
            historyCount: currentXP.xp_history.length
          });
          
          if (currentXP) {
            // Daily problems are worth 30 XP (same as word problems)
            const xpGained = 30;
            const newTotalXP = currentXP.total_xp + xpGained;
            
            // Calculate new level (same formula as XPSystem)
            const calculateLevel = (totalXP: number): number => {
              let level = 1;
              let xpNeeded = 0;
              while (xpNeeded <= totalXP) {
                xpNeeded += Math.round(100 * (level - 1) * 1.5 + 100);
                if (xpNeeded <= totalXP) {
                  level++;
                }
              }
              return level;
            };
            
            const newLevel = calculateLevel(newTotalXP);
            const xpForNextLevel = Math.round(100 * (newLevel - 1) * 1.5 + 100);
            const xpInCurrentLevel = newTotalXP - (newLevel > 1 ? Array.from({ length: newLevel - 1 }, (_, i) => 
              Math.round(100 * i * 1.5 + 100)
            ).reduce((a, b) => a + b, 0) : 0);
            const xpToNextLevel = Math.max(0, xpForNextLevel - xpInCurrentLevel);
            
            const today = new Date().toISOString().split("T")[0];
            const todayHistory = currentXP.xp_history?.find((h: any) => h.date === today);
            
            // Update XP directly using server client
            // Add a new entry to xp_history instead of modifying existing one (cleaner)
            const updatedXPHistory = [
              ...(currentXP.xp_history || []),
              { date: today, xp: xpGained, reason: "Problem of the Day solved" }
            ];
            
            let updateQuery = supabase
              .from("xp_data")
              .update({
                total_xp: newTotalXP,
                level: newLevel,
                xp_to_next_level: xpToNextLevel,
                xp_history: updatedXPHistory,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
            
            if (effectiveProfileId) {
              updateQuery = updateQuery.eq("student_profile_id", effectiveProfileId);
            } else {
              updateQuery = updateQuery.is("student_profile_id", null);
            }
            
            const { error: updateError } = await updateQuery;
            
            if (updateError) {
              logger.error("Failed to update XP data directly", { 
                error: updateError.message, 
                errorCode: updateError.code,
                userId, 
                effectiveProfileId 
              });
              throw new Error(`Failed to update XP data: ${updateError.message}`);
            }
            
            logger.info("XP update successful", { userId, xpGained, newTotalXP, newLevel });
            
            logger.info("XP awarded for daily problem completion", { 
              userId, 
              xpGained, 
              newTotalXP, 
              newLevel,
              date 
            });
            
            // Return XP information in response so frontend can show toast
            return NextResponse.json({ 
              success: true, 
              data,
              xpAwarded: {
                xpGained,
                newTotalXP,
                newLevel,
                leveledUp: newLevel > currentXP.level
              }
            });
          } else {
            // No XP data found - return success but no XP info
            logger.warn("No XP data found for user, cannot award XP", { userId });
            return NextResponse.json({ success: true, data, xpAwarded: null });
          }
        } catch (xpError) {
          // Log full error details for debugging
          logger.error("Failed to award XP for daily problem", { 
            error: xpError instanceof Error ? xpError.message : String(xpError),
            errorStack: xpError instanceof Error ? xpError.stack : undefined,
            errorDetails: xpError,
            userId, 
            date,
            effectiveProfileId
          });
          // Still return success for the completion, just without XP info
          // Frontend will handle missing xpAwarded gracefully
          return NextResponse.json({ success: true, data, xpAwarded: null, xpError: "XP award failed - check logs" });
        }
        
        // Emit problem_completed event for other orchestration (goals, challenges, etc.)
        try {
          await eventBus.emit("problem_completed", userId, {
            problemText: problemText,
            problemType: "WORD_PROBLEM", // Daily problems are typically word problems
            difficulty: "middle school", // Default difficulty for daily problems
            hintsUsed: 0,
            timeSpent: 0,
            profileId: effectiveProfileId,
          });
          logger.debug("Problem completed event emitted for daily problem", { userId, date });
        } catch (eventError) {
          // Don't fail the request if event emission fails
          logger.warn("Failed to emit problem_completed event for daily problem", { 
            error: eventError, 
            userId, 
            date 
          });
        }
      } catch (err) {
        logger.error("Exception marking daily problem as solved", { error: err, date, userId });
        return NextResponse.json(
          { success: false, error: err instanceof Error ? err.message : "Unknown error" },
          { status: 500 }
        );
      }
    }

    // Handle saving daily problem
    if (!date || !problem || !problem.text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    logger.debug("Saving daily problem to database", { date, topic: topic || problem.type });
    const success = await saveDailyProblem({
      date,
      problem,
      difficulty: difficulty || "middle school",
      topic: topic || problem.type?.replace("_", " ") || "Math",
    });

    if (success) {
      logger.info("Daily problem saved successfully", { date });
      return NextResponse.json({ success: true });
    } else {
      logger.error("Failed to save daily problem", { date });
      return NextResponse.json(
        { success: false, error: "Failed to save daily problem" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Error in POST daily-problem API route", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

