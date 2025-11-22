"use client";

import { useState, useEffect } from "react";
import { ParsedProblem, ProblemType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { isDailyProblemSolved, markDailyProblemSolved, getDailyProblem, type DailyProblemData } from "@/services/dailyProblemService";
import { useToast } from "@/hooks/useToast";
import Toast from "@/components/Toast";
import eventBus from "@/lib/eventBus";

interface ProblemOfTheDayProps {
  onProblemSelected: (problem: ParsedProblem) => void;
  apiKey?: string;
}

interface DailyProblem {
  problem: ParsedProblem;
  date: string; // YYYY-MM-DD format
  difficulty: "elementary" | "middle school" | "high school" | "advanced";
  topic: string;
  solved?: boolean; // Track if this daily problem has been solved
  solvedAt?: string; // Timestamp when solved
}

/**
 * Problem of the Day - A new challenge every day
 * Generates a problem based on the current date (deterministic seed)
 */
export default function ProblemOfTheDay({ 
  onProblemSelected,
  apiKey 
}: ProblemOfTheDayProps) {
  const { user, activeProfile } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Load from cache IMMEDIATELY (synchronously) on initial render
  const today = getTodayDate();
  const cacheKey = `daily-problem-${today}`;
  let initialProblem: DailyProblem | null = null;
  let initialIsSolved = false;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Validate cached data structure
      if (parsed && parsed.problem && parsed.problem.text && parsed.date === today) {
        initialProblem = parsed;
        console.log("[ProblemOfTheDay] Using cached problem (immediate load)", {
          hasProblem: !!parsed.problem,
          hasText: !!parsed.problem.text,
          date: parsed.date,
        });
        
        // Check guest completion status immediately
        const localData = localStorage.getItem("aitutor-daily-problem");
        if (localData) {
          const localProblem = JSON.parse(localData);
          if (localProblem.date === today && localProblem.solved) {
            initialIsSolved = true;
            if (initialProblem) {
              initialProblem.solved = true;
              initialProblem.solvedAt = localProblem.solvedAt;
            }
          }
        }
      } else {
        console.warn("[ProblemOfTheDay] Cached problem invalid, will reload", {
          hasParsed: !!parsed,
          hasProblem: parsed?.problem,
          hasText: parsed?.problem?.text,
          dateMatch: parsed?.date === today,
        });
        // Clear invalid cache
        try {
          localStorage.removeItem(cacheKey);
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (e) {
    console.error("[ProblemOfTheDay] Cache read failed:", e);
    // Clear corrupted cache
    try {
      localStorage.removeItem(cacheKey);
    } catch (clearError) {
      // Ignore
    }
  }

  const [dailyProblem, setDailyProblem] = useState<DailyProblem | null>(initialProblem);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCard, setShowCard] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSolved, setIsSolved] = useState(initialIsSolved);
  const [isLoading, setIsLoading] = useState(!initialProblem); // Only loading if no cache

  // Only render after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Debug logging and auto-reload if problem is missing - MUST be before any early returns
  useEffect(() => {
    if (isMounted && !isLoading && !dailyProblem) {
      console.warn("[ProblemOfTheDay] No daily problem available, triggering reload", {
        isMounted,
        isLoading,
        showCard,
        initialProblem: !!initialProblem,
      });
      // Trigger reload from database
      setIsLoading(true);
    }
  }, [isMounted, isLoading, dailyProblem, showCard]);

  // Load daily problem - sync from database if needed (only if no cache)
  useEffect(() => {
    if (!isMounted) return;
    
    // If we already have cached problem, don't check completion here
    // Let the dedicated completion check useEffect handle it
    if (dailyProblem) {
      return; // Already have problem from cache - completion check is separate
    }

    // No cache - load from database/API
    const loadDailyProblem = async () => {
      setIsLoading(true);
      console.log("[ProblemOfTheDay] No cache found, checking database...");

      try {
        // Fetch today's problem from API (server-side, ensures same problem for all users)
        console.log("[ProblemOfTheDay] Fetching daily problem from API...");
        const response = await fetch(`/api/v2/daily-problem?action=getProblem&date=${today}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.problem) {
            console.log("[ProblemOfTheDay] Problem fetched from API (shared for all users)");
            const problem: DailyProblem = {
              ...data.problem,
              solved: false, // Will check completion status separately
              solvedAt: undefined,
            };
            setDailyProblem(problem);
            setIsLoading(false);
            
            // Cache it for future loads
            try {
              const cacheKey = `daily-problem-${today}`;
              localStorage.setItem(cacheKey, JSON.stringify(problem));
            } catch (e) {
              console.error("[ProblemOfTheDay] Cache write failed:", e);
            }

            // Check completion status separately (will be handled by the useEffect)
            // Don't check here to avoid duplicate checks
            return; // Early return - problem loaded
          }
        }
        
        // Fallback if API fails
        console.log("[ProblemOfTheDay] API failed, trying direct database fetch...");
        const dbProblem = await getDailyProblem(today);
        
        if (dbProblem) {
          console.log("[ProblemOfTheDay] Problem found in database");
          const problem: DailyProblem = {
            ...dbProblem,
            solved: false,
            solvedAt: undefined,
          };
          setDailyProblem(problem);
          setIsLoading(false);
          
          try {
            const cacheKey = `daily-problem-${today}`;
            localStorage.setItem(cacheKey, JSON.stringify(problem));
          } catch (e) {
            console.error("[ProblemOfTheDay] Cache write failed:", e);
          }
          return;
        }
        
        // Last resort - show fallback problem
        console.log("[ProblemOfTheDay] No problem available, showing fallback");
        setIsLoading(false);
        const fallbackProblem: DailyProblem = {
          problem: {
            text: "Solve: 2x + 5 = 13",
            type: ProblemType.ALGEBRA,
            confidence: 1.0,
          },
          date: today,
          difficulty: "middle school",
          topic: "Algebra",
          solved: false,
        };
        setDailyProblem(fallbackProblem);
      } catch (error) {
        console.error("[ProblemOfTheDay] Error loading daily problem from database:", error);
        setIsLoading(false); // Clear loading on error
        // Fallback to localStorage or generate new
        try {
          const localData = localStorage.getItem("aitutor-daily-problem");
          if (localData) {
            const localProblem = JSON.parse(localData);
            if (localProblem.date === today) {
              console.log("[ProblemOfTheDay] Using problem from localStorage");
              setDailyProblem(localProblem);
              setIsSolved(localProblem.solved === true);
            } else {
              console.log("[ProblemOfTheDay] localStorage problem is old, generating new...");
              try {
                await generateDailyProblem();
              } catch (genError) {
                console.error("[ProblemOfTheDay] Error generating in fallback:", genError);
                // Show fallback problem
                const fallbackProblem: DailyProblem = {
                  problem: {
                    text: "Solve: 2x + 5 = 13",
                    type: ProblemType.ALGEBRA,
                    confidence: 1.0,
                  },
                  date: today,
                  difficulty: "middle school",
                  topic: "Algebra",
                  solved: false,
                };
                setDailyProblem(fallbackProblem);
              }
            }
          } else {
            console.log("[ProblemOfTheDay] No localStorage data, generating new problem...");
            try {
              await generateDailyProblem();
            } catch (genError) {
              console.error("[ProblemOfTheDay] Error generating:", genError);
              // Show fallback problem
              const fallbackProblem: DailyProblem = {
                problem: {
                  text: "Solve: 2x + 5 = 13",
                  type: ProblemType.ALGEBRA,
                  confidence: 1.0,
                },
                date: today,
                difficulty: "middle school",
                topic: "Algebra",
                solved: false,
              };
              setDailyProblem(fallbackProblem);
            }
          }
        } catch (e) {
          console.error("[ProblemOfTheDay] Error in fallback:", e);
          setIsLoading(false);
          // Last resort - show fallback problem
          const fallbackProblem: DailyProblem = {
            problem: {
              text: "Solve: 2x + 5 = 13",
              type: ProblemType.ALGEBRA,
              confidence: 1.0,
            },
            date: today,
            difficulty: "middle school",
            topic: "Algebra",
            solved: false,
          };
          setDailyProblem(fallbackProblem);
        }
      }
    };

    loadDailyProblem();
  }, [isMounted]); // Only run on mount - don't wait for user!

  // Check completion status separately when user/profile loads (non-blocking)
  // ONLY for logged-in users - guest users use localStorage
  // Check ONCE only to prevent flicker
  useEffect(() => {
    if (!dailyProblem || !isMounted) return;
    
    const today = getTodayDate();
    if (dailyProblem.date !== today) return;

    // Guest mode: check localStorage only (no database access) - do it once
    if (!user) {
      // Only check once, don't re-check
      try {
        const localData = localStorage.getItem("aitutor-daily-problem");
        if (localData) {
          const localProblem = JSON.parse(localData);
          // Only mark as solved if date AND problem text match
          if (localProblem.date === today && 
              localProblem.problem?.text === dailyProblem.problem.text && 
              localProblem.solved) {
            setIsSolved(true);
            setDailyProblem((prev) => prev ? {
              ...prev,
              solved: true,
              solvedAt: localProblem.solvedAt,
            } : prev);
          }
        }
      } catch (e) {
        // Ignore errors for guest mode
      }
      return; // Don't check database for guest users
    }
    
    // Logged-in users: check database ONCE (no interval to prevent flicker)
    let hasChecked = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const checkCompletion = async () => {
      // Only check once
      if (hasChecked) return;
      hasChecked = true;
      
      // Check completion status via API (more reliable than direct query)
      console.log("[ProblemOfTheDay] Checking completion status via API...", { userId: user.id, today, profileId: activeProfile?.id });
      try {
        const response = await Promise.race([
          fetch(`/api/v2/daily-problem?date=${today}&userId=${user.id}&profileId=${activeProfile?.id || "null"}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }),
          new Promise<Response>((resolve) => {
            timeoutId = setTimeout(() => {
              console.warn("[ProblemOfTheDay] API completion check timeout after 5 seconds");
              resolve(new Response(JSON.stringify({ success: false, isSolved: false }), { status: 200 }));
            }, 5000); // Increased from 2s to 5s
          }),
        ]);

        const data = await response.json();
        const solved = data.success && data.isSolved === true;
        const savedProblemText = data.problemText || null;
        const currentProblemText = dailyProblem.problem.text;
        
        console.log("[ProblemOfTheDay] Completion check response", {
          solved,
          hasSavedText: !!savedProblemText,
          hasCurrentText: !!currentProblemText,
          savedPreview: savedProblemText ? savedProblemText.substring(0, 30) : "none",
          currentPreview: currentProblemText ? currentProblemText.substring(0, 30) : "none"
        });
        
        // CRITICAL: Only mark as solved if the problem text matches!
        // This prevents showing "completed" for a different problem on the same date
        const problemMatches = savedProblemText && currentProblemText && savedProblemText === currentProblemText;
        
        if (solved && problemMatches) {
          console.log("[ProblemOfTheDay] ✅ Completion verified - problem text matches!");
          setIsSolved(true);
          setDailyProblem((prev) => prev ? {
            ...prev,
            solved: true,
            solvedAt: new Date().toISOString(),
          } : prev);
          
          // Update cache
          try {
            const cacheKey = `daily-problem-${today}`;
            const updated = {
              ...dailyProblem,
              solved: true,
              solvedAt: new Date().toISOString(),
            };
            localStorage.setItem(cacheKey, JSON.stringify(updated));
          } catch (e) {
            // Ignore cache errors
          }
        } else if (solved && !problemMatches) {
          console.log("[ProblemOfTheDay] ⚠️ Completion found but problem text doesn't match - ignoring", {
            saved: savedProblemText?.substring(0, 50),
            current: currentProblemText?.substring(0, 50),
          });
          // Explicitly set as NOT solved
          setIsSolved(false);
        } else {
          // No completion found
          console.log("[ProblemOfTheDay] ❌ No completion found");
          setIsSolved(false);
        }
      } catch (err) {
        console.error("[ProblemOfTheDay] Error checking completion:", err);
        // Don't change state on error - keep what we have
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    // Check IMMEDIATELY, no delay
    checkCompletion();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // Only re-check when user or profile changes, NOT when dailyProblem changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProfile?.id, isMounted]);

  // Reset card visibility when problem changes (new day)
  useEffect(() => {
    if (dailyProblem) {
      const today = getTodayDate();
      if (dailyProblem.date === today && !showCard) {
        // Show card again if it's today's problem and was hidden
        setShowCard(true);
      }
    }
  }, [dailyProblem?.date, showCard]);

  // Listen for problem solved events and save to database
  useEffect(() => {
    if (!isMounted || !dailyProblem) return;

    const handleProblemSolved = async (event?: Event) => {
      const today = getTodayDate();
      
      console.log("[ProblemOfTheDay] Event received! Checking if should save...", {
        dateMatch: dailyProblem.date === today,
        hasText: !!dailyProblem.problem.text,
        alreadySolved: isSolved,
        dailyProblemText: dailyProblem.problem.text?.substring(0, 50),
      });
      
      // Only save if it's today's problem and not already solved
      if (dailyProblem.date !== today || !dailyProblem.problem.text || isSolved) {
        console.log("[ProblemOfTheDay] Skipping save:", {
          dateMatch: dailyProblem.date === today,
          hasText: !!dailyProblem.problem.text,
          alreadySolved: isSolved,
        });
        return;
      }

      // CRITICAL: Verify the solved problem is actually the Problem of the Day
      // Check event detail first (if available), then sessionStorage, then allow if both are empty
      const eventDetail = (event as CustomEvent)?.detail;
      const solvedProblemText = eventDetail?.problemText || sessionStorage.getItem("aitutor-current-problem-text") || "";
      const dailyProblemText = dailyProblem.problem.text;
      
      // If we have a problem text from the event or sessionStorage, it must match the daily problem
      // If both are empty, we'll still save (user might have navigated differently, but this is risky)
      if (solvedProblemText && solvedProblemText.trim() !== "" && solvedProblemText !== dailyProblemText) {
        console.log("[ProblemOfTheDay] ⚠️ Solved problem doesn't match daily problem - ignoring", {
          solved: solvedProblemText.substring(0, 50),
          daily: dailyProblemText.substring(0, 50),
          source: eventDetail?.problemText ? "event" : "sessionStorage",
        });
        return;
      }
      
      // If we don't have a problem text to verify, log a warning but still save
      // (This might be a false positive, but better to save than miss a completion)
      if (!solvedProblemText || solvedProblemText.trim() === "") {
        console.log("[ProblemOfTheDay] ⚠️ No problem text to verify - saving anyway (might be false positive)");
      }
      
      console.log("[ProblemOfTheDay] ✅ Problem matches! Saving completion...");

      // Update UI IMMEDIATELY (optimistic update)
      const solvedAt = new Date().toISOString();
      setIsSolved(true);
      setDailyProblem((prev) => prev ? {
        ...prev,
        solved: true,
        solvedAt,
      } : prev);

      // Guest mode: save to localStorage only (non-blocking)
      if (!user) {
        console.log("[ProblemOfTheDay] Saving completion to localStorage (guest mode)...");
        // Save in background (don't await)
        try {
          const localData = {
            date: today,
            problem: dailyProblem.problem,
            solved: true,
            solvedAt,
          };
          localStorage.setItem("aitutor-daily-problem", JSON.stringify(localData));
          console.log("[ProblemOfTheDay] ✅ Saved to localStorage!");
        } catch (err) {
          console.error("[ProblemOfTheDay] ❌ Error saving to localStorage:", err);
          // Revert on error
          setIsSolved(false);
          setDailyProblem((prev) => prev ? {
            ...prev,
            solved: false,
            solvedAt: undefined,
          } : prev);
        }
        return;
      }

      // Logged-in users: save to database (non-blocking, in background)
      console.log("[ProblemOfTheDay] Saving completion to database...");
      
      // Don't await - save in background
      fetch("/api/v2/daily-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markSolved",
          date: today,
          userId: user.id,
          profileId: activeProfile?.id || null,
          problemText: dailyProblem.problem.text,
        }),
      })
        .then(async (response) => {
          const data = await response.json();
          console.log("[ProblemOfTheDay] API response received:", { 
            success: data.success, 
            hasXpAwarded: !!data.xpAwarded, 
            xpAwarded: data.xpAwarded,
            xpError: data.xpError,
            fullResponse: data
          });
          return data;
        })
        .then((data) => {
          if (data.success) {
            console.log("[ProblemOfTheDay] ✅ Saved to database!", { xpAwarded: data.xpAwarded, xpError: data.xpError });
            
            // Show XP gain toast if XP was awarded
            if (data.xpAwarded && data.xpAwarded.xpGained) {
              const { xpGained, newLevel, leveledUp } = data.xpAwarded;
              console.log("[ProblemOfTheDay] Showing XP toast:", { xpGained, newLevel, leveledUp });
              
              // Play XP gain sound
              if (typeof window !== "undefined") {
                import("@/lib/soundEffects").then(({ playXPGain, playLevelUp }) => {
                  if (leveledUp) {
                    playLevelUp();
                    setTimeout(() => playXPGain(), 500);
                  } else {
                    playXPGain();
                  }
                }).catch((err) => {
                  console.warn("[ProblemOfTheDay] Sound effects not available:", err);
                  // Sound effects not available - continue without sound
                });
              }
              
              // Show toast notification
              if (leveledUp) {
                console.log("[ProblemOfTheDay] Showing level up toast");
                showToast(`🎉 Level Up! You reached Level ${newLevel}!`, "success");
                setTimeout(() => {
                  console.log("[ProblemOfTheDay] Showing XP gain toast");
                  showToast(`+${xpGained} XP - Problem of the Day solved!`, "success");
                }, 2000);
              } else {
                console.log("[ProblemOfTheDay] Showing XP gain toast (no level up)");
                showToast(`+${xpGained} XP - Problem of the Day solved!`, "success");
              }
            } else if (data.xpError) {
              // XP award failed but completion was saved
              console.warn("[ProblemOfTheDay] Completion saved but XP award failed:", data.xpError);
              showToast("Problem completed! (XP award failed - check console)", "error");
            } else {
              // No XP info - completion saved but no XP awarded
              console.log("[ProblemOfTheDay] Completion saved (no XP info)", { data });
              showToast("Problem of the Day completed!", "success");
            }
          } else {
            console.error("[ProblemOfTheDay] ❌ Save failed:", data.error);
            showToast("Failed to save completion. Please try again.", "error");
            // Revert on error
            setIsSolved(false);
            setDailyProblem((prev) => prev ? {
              ...prev,
              solved: false,
              solvedAt: undefined,
            } : prev);
          }
        })
        .catch((err) => {
          console.error("[ProblemOfTheDay] ❌ Error saving:", err);
          // Revert on error
          setIsSolved(false);
          setDailyProblem((prev) => prev ? {
            ...prev,
            solved: false,
            solvedAt: undefined,
          } : prev);
        });
    };

    // Listen for problem solved events
    const handleProblemSolvedWrapper = (event: Event) => {
      console.log("[ProblemOfTheDay] Window event received!", event.type, event);
      handleProblemSolved(event);
    };

    window.addEventListener("problemSolved", handleProblemSolvedWrapper);

    // Also listen for problem_completed event (from orchestrator)
    window.addEventListener("problem_completed", handleProblemSolvedWrapper);

    // Subscribe to eventBus for problem_completed (primary method now)
    const unsubscribe = eventBus.on("problem_completed", (event) => {
      console.log("[ProblemOfTheDay] EventBus problem_completed received!", event);
      // Create a synthetic event with the problem text
      const syntheticEvent = {
        detail: {
          problemText: event.data?.problemText,
          userId: event.userId,
        }
      } as unknown as Event;
      handleProblemSolved(syntheticEvent);
    });

    return () => {
      window.removeEventListener("problemSolved", handleProblemSolvedWrapper);
      window.removeEventListener("problem_completed", handleProblemSolvedWrapper);
      unsubscribe();
    };
  }, [isMounted, dailyProblem, user, activeProfile?.id, isSolved]); // Include isSolved to prevent saving if already solved

  const generateDailyProblem = async () => {
    setIsGenerating(true);
    const today = getTodayDate();
    console.log("[ProblemOfTheDay] Generating new daily problem...");
    
    try {
      // Use date as seed to generate consistent problems per day
      // Rotate through difficulty levels based on day of week
      const dayOfWeek = new Date().getDay();
      const difficulties: Array<"elementary" | "middle school" | "high school" | "advanced"> = [
        "elementary",
        "middle school", 
        "high school",
        "advanced",
        "middle school",
        "high school",
        "elementary"
      ];
      const selectedDifficulty = difficulties[dayOfWeek];

      // Rotate through problem types based on day of month
      const dayOfMonth = new Date().getDate();
      const problemTypes: ProblemType[] = [
        ProblemType.ARITHMETIC,
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.WORD_PROBLEM,
        ProblemType.MULTI_STEP,
      ];
      const selectedType = problemTypes[dayOfMonth % problemTypes.length];

      // Generate problem via API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      let response;
      try {
        response = await fetch("/api/generate-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedType,
            difficulty: selectedDifficulty,
            ...(apiKey && { apiKey }),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error("Request timeout - API took too long to respond");
        } else {
          console.error("Network error:", fetchError);
        }
        throw fetchError;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.problem) {
          const newDailyProblem: DailyProblem = {
            problem: result.problem,
            date: today,
            difficulty: selectedDifficulty,
            topic: selectedType.replace("_", " "),
            solved: false, // New problem, not solved yet
          };
          setDailyProblem(newDailyProblem);
          setIsLoading(false); // Clear loading immediately
          console.log("[ProblemOfTheDay] Problem generated successfully");
          
          // Cache it immediately
          try {
            const cacheKey = `daily-problem-${today}`;
            localStorage.setItem(cacheKey, JSON.stringify(newDailyProblem));
          } catch (e) {
            console.error("[ProblemOfTheDay] Cache write failed:", e);
          }
          
          // Save to database via API (async, non-blocking)
          fetch("/api/v2/daily-problem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: today,
              problem: result.problem,
              difficulty: selectedDifficulty,
              topic: selectedType.replace("_", " "),
            }),
          }).catch((error) => {
            console.error("Error saving daily problem to database:", error);
            // Non-blocking - problem is already cached
          });
        } else {
          // Fallback to template
          console.log("[ProblemOfTheDay] API response invalid, using fallback...");
          await generateFallbackProblem(selectedType, selectedDifficulty);
        }
      } else {
        // Fallback to template
        console.log("[ProblemOfTheDay] API response not OK, using fallback...");
        await generateFallbackProblem(selectedType, selectedDifficulty);
      }
    } catch (error) {
      console.error("[ProblemOfTheDay] Error generating daily problem:", error);
      setIsLoading(false); // Clear loading on error
      // Fallback to template
      const dayOfWeek = new Date().getDay();
      const difficulties: Array<"elementary" | "middle school" | "high school" | "advanced"> = [
        "elementary",
        "middle school", 
        "high school",
        "advanced",
        "middle school",
        "high school",
        "elementary"
      ];
      const dayOfMonth = new Date().getDate();
      const problemTypes: ProblemType[] = [
        ProblemType.ARITHMETIC,
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.WORD_PROBLEM,
        ProblemType.MULTI_STEP,
      ];
      generateFallbackProblem(
        problemTypes[dayOfMonth % problemTypes.length],
        difficulties[dayOfWeek]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackProblem = async (
    type: ProblemType,
    difficulty: "elementary" | "middle school" | "high school" | "advanced"
  ) => {
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

    const typeTemplates = templates[type] || templates[ProblemType.ALGEBRA];
    const randomIndex = new Date().getDate() % typeTemplates.length;
    const problemText = typeTemplates[randomIndex];

    const today = getTodayDate();
    const newDailyProblem: DailyProblem = {
      problem: {
        text: problemText,
        type: type,
        confidence: 1.0,
      },
      date: today,
      difficulty: difficulty,
      topic: type.replace("_", " "),
      solved: false, // New problem, not solved yet
    };
    setDailyProblem(newDailyProblem);
    setIsLoading(false); // Clear loading immediately
    console.log("[ProblemOfTheDay] Fallback problem generated");
    
    // Cache it immediately
    try {
      const cacheKey = `daily-problem-${today}`;
      localStorage.setItem(cacheKey, JSON.stringify(newDailyProblem));
    } catch (e) {
      console.error("[ProblemOfTheDay] Cache write failed:", e);
    }
    
    // Save to database via API (async, non-blocking)
    fetch("/api/v2/daily-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        problem: newDailyProblem.problem,
        difficulty: difficulty,
        topic: type.replace("_", " "),
      }),
    }).catch((error) => {
      console.error("Error saving daily problem to database:", error);
      // Non-blocking - problem is already cached
    });
  };

  const handleStartProblem = () => {
    console.log("[ProblemOfTheDay] Start button clicked!", {
      hasProblem: !!dailyProblem,
      isGenerating,
      isSolved,
      isLoading,
      canStart: dailyProblem && !isGenerating && !isSolved && !isLoading
    });
    
    if (dailyProblem && !isGenerating && !isSolved && !isLoading) {
      // Store the problem text in session storage for real-time detection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("aitutor-current-problem-text", dailyProblem.problem.text);
      }
      onProblemSelected(dailyProblem.problem);
      setShowCard(false);
    } else {
      console.warn("[ProblemOfTheDay] Cannot start - conditions not met");
    }
  };

  // Don't render until after hydration to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  // Show loading state while checking database
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading Problem of the Day...</span>
        </div>
      </div>
    );
  }

  if (!dailyProblem) {
    return null;
  }

  if (!showCard) {
    return null;
  }

  // Validate problem structure before rendering
  if (!dailyProblem.problem || !dailyProblem.problem.text) {
    console.error("[ProblemOfTheDay] Invalid problem structure", dailyProblem);
    return null;
  }

  const difficultyColors = {
    elementary: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    "middle school": "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    "high school": "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700",
    advanced: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
  };

  const difficultyIcons = {
    elementary: "🌱",
    "middle school": "📚",
    "high school": "🎓",
    advanced: "🔥",
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-2 border-blue-200/60 dark:border-blue-700/40 rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Sparkle effect on solved */}
      {isSolved && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 dark:from-green-400/30 dark:to-emerald-400/30 rounded-full blur-3xl animate-pulse" />
      )}

      <div className="relative flex items-start justify-between gap-4 mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {/* Improved icon with gradient */}
            <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
              <span className="text-white text-2xl">📅</span>
              {isSolved && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Problem of the Day
                </h3>
                {isSolved && (
                  <span className="px-2.5 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-green-200/50 dark:border-green-700/50 animate-in fade-in slide-in-from-top-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Solved!
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors line-clamp-1 font-medium mt-0.5">
                {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
          </div>
          
          {/* Enhanced badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all hover:scale-105 shadow-sm ${difficultyColors[dailyProblem.difficulty]}`}>
              {difficultyIcons[dailyProblem.difficulty]} {dailyProblem.difficulty.charAt(0).toUpperCase() + dailyProblem.difficulty.slice(1)}
            </span>
            <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border-2 border-gray-300/50 dark:border-gray-600/50 text-xs font-semibold transition-all hover:scale-105 shadow-sm">
              {dailyProblem.topic}
            </span>
          </div>

          {/* Problem text with better typography */}
          <div className="bg-white/60 dark:bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border-2 border-gray-200/50 dark:border-gray-700/50 shadow-inner">
            <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-medium leading-relaxed break-words">
              {dailyProblem.problem.text}
            </p>
          </div>
        </div>

        {/* Enhanced close button */}
        <button
          onClick={() => setShowCard(false)}
          className="relative text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all p-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 group/close"
          aria-label="Close Problem of the Day"
          title="Close"
        >
          <svg className="w-5 h-5 transition-transform group-hover/close:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Enhanced footer */}
      <div className="relative flex items-center justify-between gap-4 pt-4 border-t-2 border-gray-200/50 dark:border-gray-700/50">
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 transition-colors font-medium">
          {isGenerating ? (
            <span className="flex items-center gap-2 animate-pulse">
              <span className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
              Generating today&apos;s challenge...
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-base">✨</span>
              A new challenge every day!
            </span>
          )}
        </div>
        
        {/* Enhanced button with gradient */}
        <button
          type="button"
          onClick={handleStartProblem}
          disabled={isGenerating || isSolved || isLoading}
          className={`relative px-5 py-3 rounded-xl active:scale-95 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-sm flex items-center gap-2.5 min-h-[44px] touch-device:min-h-[48px] shadow-lg hover:shadow-xl overflow-hidden group/btn ${
            isSolved
              ? "bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 text-white cursor-default"
              : isGenerating || isLoading
              ? "bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-800 dark:to-indigo-800 text-white"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600"
          }`}
          aria-label={isSolved ? "Problem of the Day Completed" : isLoading ? "Loading..." : "Start Problem of the Day"}
        >
          {/* Button shine effect */}
          {!isSolved && !isGenerating && !isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
          )}
          
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </>
          ) : isSolved ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Completed</span>
              <span className="text-lg">🎉</span>
            </>
          ) : (
            <>
              <span>Start Challenge</span>
              <svg className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
      
      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

