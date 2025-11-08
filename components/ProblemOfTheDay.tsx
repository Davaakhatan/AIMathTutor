"use client";

import { useState, useEffect } from "react";
import { ParsedProblem, ProblemType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { isDailyProblemSolved, markDailyProblemSolved, getDailyProblem, type DailyProblemData } from "@/services/dailyProblemService";

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
  const [dailyProblem, setDailyProblem] = useState<DailyProblem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCard, setShowCard] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Track if we're loading from database

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Only render after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load daily problem IMMEDIATELY (don't wait for user/profile - problem is shared)
  useEffect(() => {
    if (!isMounted) return;

    const loadDailyProblem = async () => {
      setIsLoading(true);
      const today = getTodayDate();
      console.log("[ProblemOfTheDay] Starting to load daily problem for", today);

      // Check cache first (localStorage) - same problem for everyone on same day
      try {
        const cacheKey = `daily-problem-${today}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedProblem = JSON.parse(cached);
          console.log("[ProblemOfTheDay] Using cached problem");
          setDailyProblem(cachedProblem);
          setIsLoading(false);
          
          // Check completion status separately (async, non-blocking)
          if (user) {
            isDailyProblemSolved(user.id, today, activeProfile?.id || null)
              .then((solved) => {
                setIsSolved(solved);
                if (solved && cachedProblem) {
                  setDailyProblem({
                    ...cachedProblem,
                    solved: true,
                    solvedAt: new Date().toISOString(),
                  });
                }
              })
              .catch((err) => console.error("[ProblemOfTheDay] Error checking completion:", err));
          } else {
            // Guest mode - check localStorage for completion
            const localData = localStorage.getItem("aitutor-daily-problem");
            if (localData) {
              const localProblem = JSON.parse(localData);
              if (localProblem.date === today && localProblem.solved) {
                setIsSolved(true);
              }
            }
          }
          return; // Early return - problem loaded from cache
        }
        console.log("[ProblemOfTheDay] No cache found, checking database...");
      } catch (e) {
        console.error("[ProblemOfTheDay] Cache read failed:", e);
        // Cache read failed, continue to database
      }

      try {
        // Try to get today's problem from database
        console.log("[ProblemOfTheDay] Fetching from database...");
        const dbProblem = await getDailyProblem(today);
        
        if (dbProblem) {
          console.log("[ProblemOfTheDay] Problem found in database");
          const problem: DailyProblem = {
            ...dbProblem,
            solved: false, // Will check completion status separately
            solvedAt: undefined,
          };
          setDailyProblem(problem);
          setIsLoading(false); // Clear loading immediately after setting problem
          
          // Cache it for future loads
          try {
            const cacheKey = `daily-problem-${today}`;
            localStorage.setItem(cacheKey, JSON.stringify(problem));
          } catch (e) {
            console.error("[ProblemOfTheDay] Cache write failed:", e);
          }

          // Check completion status via API (more reliable than direct query)
          if (user) {
            fetch(`/api/daily-problem?date=${today}&userId=${user.id}&profileId=${activeProfile?.id || "null"}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success && data.isSolved) {
                  console.log("[ProblemOfTheDay] Already solved via API check");
                  setIsSolved(true);
                  setDailyProblem((prev) => prev ? {
                    ...prev,
                    solved: true,
                    solvedAt: new Date().toISOString(),
                  } : prev);
                }
              })
              .catch((err) => console.error("[ProblemOfTheDay] Error checking completion via API:", err));
          } else {
            // Guest mode - check localStorage for completion
            const localData = localStorage.getItem("aitutor-daily-problem");
            if (localData) {
              const localProblem = JSON.parse(localData);
              if (localProblem.date === today && localProblem.solved) {
                setIsSolved(true);
              }
            }
          }
          return; // Early return - problem loaded
        }
        
        // No problem in database for today - generate one
        console.log("[ProblemOfTheDay] No problem in database for today, generating...");
        try {
          await generateDailyProblem();
          setIsLoading(false); // Ensure loading is cleared after generation
        } catch (genError) {
          console.error("[ProblemOfTheDay] Error generating problem:", genError);
          setIsLoading(false); // Clear loading even on error
          // Show a fallback problem
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
  useEffect(() => {
    if (!dailyProblem || !user) return;
    
    const today = getTodayDate();
    if (dailyProblem.date !== today) return;

    const checkCompletion = async () => {
      // Check completion status via API (more reliable than direct query)
      console.log("[ProblemOfTheDay] Checking completion status via API...", { userId: user.id, today, profileId: activeProfile?.id });
      try {
        const response = await Promise.race([
          fetch(`/api/daily-problem?date=${today}&userId=${user.id}&profileId=${activeProfile?.id || "null"}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }),
          new Promise<Response>((resolve) => {
            setTimeout(() => {
              console.warn("[ProblemOfTheDay] API completion check timeout after 2 seconds");
              resolve(new Response(JSON.stringify({ success: false, isSolved: false }), { status: 200 }));
            }, 2000);
          }),
        ]);

        const data = await response.json();
        const solved = data.success && data.isSolved === true;
        console.log("[ProblemOfTheDay] Completion check result:", solved);
        setIsSolved(solved);
        if (solved) {
          setDailyProblem((prev) => prev ? {
            ...prev,
            solved: true,
            solvedAt: new Date().toISOString(),
          } : prev);
        }
      } catch (err) {
        console.error("[ProblemOfTheDay] Error checking completion:", err);
        setIsSolved(false);
      }
    };

    checkCompletion();

    // Also check periodically (every 2 seconds) in case the event was missed
    const interval = setInterval(() => {
      if (!isSolved) {
        checkCompletion();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, activeProfile?.id, dailyProblem?.date, isSolved]); // Check when user/profile changes or when not solved

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
    if (!isMounted || !dailyProblem || !user) return;

    const handleProblemSolved = async (event?: Event) => {
      const today = getTodayDate();
      
      // Only save if it's today's problem
      if (dailyProblem.date !== today || !dailyProblem.problem.text || isSolved) {
        return;
      }

      console.log("[ProblemOfTheDay] Saving completion to database...");
      
      // Save directly via API
      try {
        const response = await fetch("/api/daily-problem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "markSolved",
            date: today,
            userId: user.id,
            profileId: activeProfile?.id || null,
            problemText: dailyProblem.problem.text,
          }),
        });

        const data = await response.json();
        if (data.success) {
          console.log("[ProblemOfTheDay] ✅ Saved to database!");
          setIsSolved(true);
          setDailyProblem((prev) => prev ? {
            ...prev,
            solved: true,
            solvedAt: new Date().toISOString(),
          } : prev);
        } else {
          console.error("[ProblemOfTheDay] ❌ Save failed:", data.error);
        }
      } catch (err) {
        console.error("[ProblemOfTheDay] ❌ Error saving:", err);
      }
    };

    // Listen for problem solved events
    const handleProblemSolvedWrapper = (event: Event) => {
      console.log("[ProblemOfTheDay] Event received!", event.type, event);
      handleProblemSolved(event);
    };

    window.addEventListener("problemSolved", handleProblemSolvedWrapper);
    
    // Also listen for problem_completed event (from orchestrator)
    window.addEventListener("problem_completed", handleProblemSolvedWrapper);
    
    // Test: Listen to all custom events to debug
    const debugHandler = (event: Event) => {
      if (event.type.includes("problem") || event.type.includes("solved") || event.type.includes("completed")) {
        console.log("[ProblemOfTheDay] DEBUG - Custom event detected:", event.type, event);
      }
    };
    window.addEventListener("problemSolved", debugHandler, true);
    window.addEventListener("problem_completed", debugHandler, true);
    
    console.log("[ProblemOfTheDay] Event listeners registered", {
      hasDailyProblem: !!dailyProblem,
      hasUser: !!user,
      dailyProblemText: dailyProblem?.problem.text?.substring(0, 50),
    });
    
    return () => {
      window.removeEventListener("problemSolved", handleProblemSolvedWrapper);
      window.removeEventListener("problem_completed", handleProblemSolvedWrapper);
      window.removeEventListener("problemSolved", debugHandler, true);
      window.removeEventListener("problem_completed", debugHandler, true);
    };
  }, [isMounted, dailyProblem, user, activeProfile?.id]);

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
          fetch("/api/daily-problem", {
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
    fetch("/api/daily-problem", {
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
    if (dailyProblem && !isGenerating && !isSolved) {
      // Store the problem text in session storage for real-time detection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("aitutor-current-problem-text", dailyProblem.problem.text);
      }
      onProblemSelected(dailyProblem.problem);
      setShowCard(false);
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

  if (!showCard || !dailyProblem) {
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg transition-colors">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">📅</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">
                  Problem of the Day
                </h3>
                {isSolved && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Solved
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors line-clamp-1">
                {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${difficultyColors[dailyProblem.difficulty]}`}>
              {difficultyIcons[dailyProblem.difficulty]} {dailyProblem.difficulty.charAt(0).toUpperCase() + dailyProblem.difficulty.slice(1)}
            </span>
            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-medium transition-colors">
              {dailyProblem.topic}
            </span>
          </div>

          <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-medium mb-3 transition-colors break-words">
            {dailyProblem.problem.text}
          </p>
        </div>

        <button
          onClick={() => setShowCard(false)}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close Problem of the Day"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-600 dark:text-gray-400 transition-colors">
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                Generating today&apos;s challenge...
              </span>
            ) : (
              "A new challenge every day!"
            )}
        </div>
        <button
          onClick={handleStartProblem}
          disabled={isGenerating || isSolved || isLoading}
          className={`px-4 py-2.5 sm:py-2 rounded-lg active:scale-95 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 min-h-[44px] touch-device:min-h-[48px] ${
            isSolved
              ? "bg-green-600 dark:bg-green-700 text-white cursor-default"
              : isGenerating || isLoading
              ? "bg-blue-300 dark:bg-blue-800 text-white"
              : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
          }`}
          aria-label={isSolved ? "Problem of the Day Completed" : isLoading ? "Loading..." : "Start Problem of the Day"}
        >
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Completed</span>
            </>
          ) : (
            <>
              <span>Start Challenge</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

