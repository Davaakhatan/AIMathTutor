"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useLearningPath } from "@/hooks/useLearningPath";
import { ParsedProblem } from "@/types";
import {
  LearningPath as LearningPathType,
  generateLearningPath,
  updateLearningPathProgress,
  getNextProblemForStep,
} from "@/services/learningPathGenerator";
import { ConceptTrackingData } from "@/services/conceptTracker";
import { logger } from "@/lib/logger";

interface LearningPathProps {
  onStartProblem: (problem: ParsedProblem) => void;
  apiKey?: string;
}

export default function LearningPath({ onStartProblem, apiKey }: LearningPathProps) {
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { learningPath, isLoading, isSaving, setLearningPath, reload } = useLearningPath();
  const [conceptData, setConceptData] = useLocalStorage<ConceptTrackingData>(
    "aitutor-concepts",
    { concepts: {}, lastUpdated: Date.now() }
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update path progress when concepts change
  useEffect(() => {
    if (learningPath && conceptData) {
      // Check if any step should be marked as completed based on mastery
      let pathUpdated = false;
      const updatedPath = { ...learningPath };
      
      // Debug: Log all available concepts
      logger.debug("Learning path progress check", {
        pathId: learningPath.id,
        stepsCount: learningPath.steps.length,
        availableConcepts: Object.keys(conceptData.concepts),
        conceptDataLastUpdated: conceptData.lastUpdated,
      });
      
      updatedPath.steps = updatedPath.steps.map(step => {
        // Try exact match first
        let concept = conceptData.concepts[step.conceptId];
        
        // If not found, try matching by concept.id field
        if (!concept) {
          const conceptValues = Object.values(conceptData.concepts);
          const matchedConcept = conceptValues.find(
            c => c.id === step.conceptId || c.id?.toLowerCase() === step.conceptId.toLowerCase()
          );
          if (matchedConcept) {
            concept = matchedConcept;
            logger.debug("Found concept by id field match", {
              stepConceptId: step.conceptId,
              matchedConceptId: matchedConcept.id,
            });
          }
        }
        
        // If still not found, try case-insensitive key match
        if (!concept) {
          const conceptKeys = Object.keys(conceptData.concepts);
          const matchedKey = conceptKeys.find(
            key => key.toLowerCase() === step.conceptId.toLowerCase()
          );
          if (matchedKey) {
            concept = conceptData.concepts[matchedKey];
            logger.debug("Found concept with case-insensitive match", {
              stepConceptId: step.conceptId,
              matchedKey,
            });
          }
        }
        
        // Debug logging
        if (concept) {
          logger.debug("Checking step completion", {
            stepConceptId: step.conceptId,
            stepConceptName: step.conceptName,
            masteryLevel: concept.masteryLevel,
            problemsSolved: concept.problemsSolved,
            problemsAttempted: concept.problemsAttempted,
            isCurrentlyCompleted: step.completed,
          });
        } else {
          logger.debug("No concept data found for step", {
            stepConceptId: step.conceptId,
            stepConceptName: step.conceptName,
            availableConcepts: Object.keys(conceptData.concepts),
            conceptDataKeys: Object.keys(conceptData.concepts).map(k => ({
              key: k,
              id: conceptData.concepts[k]?.id,
            })),
          });
        }
        
        // Mark as completed if:
        // 1. Mastery level >= 60% (lower threshold for completion)
        // 2. OR has solved at least one problem successfully (50% success rate)
        // 3. OR has attempted and solved at least one problem (first problem solved = completed)
        // 4. OR has solved at least one problem (more lenient - any solve counts)
        const isCompleted = concept && (
          concept.masteryLevel >= 60 || 
          (concept.problemsSolved > 0 && concept.problemsSolved >= concept.problemsAttempted * 0.5) ||
          (concept.problemsSolved > 0 && concept.problemsAttempted === 1) ||
          concept.problemsSolved >= 1 // More lenient: if solved at least 1 problem, mark as completed
        );
        
        if (isCompleted && !step.completed) {
          logger.info("Marking step as completed", {
            stepConceptId: step.conceptId,
            stepConceptName: step.conceptName,
            masteryLevel: concept.masteryLevel,
            problemsSolved: concept.problemsSolved,
          });
          pathUpdated = true;
          return {
            ...step,
            completed: true,
            completedAt: Date.now(),
          };
        }
        return step;
      });
      
      if (pathUpdated) {
        const completedSteps = updatedPath.steps.filter(s => s.completed).length;
        updatedPath.progress = Math.round((completedSteps / updatedPath.steps.length) * 100);
        
        // Check if all steps are completed
        const allStepsCompleted = completedSteps === updatedPath.steps.length;
        
        // Find the next incomplete step (first step that's not completed)
        const nextIncompleteIndex = updatedPath.steps.findIndex(s => !s.completed);
        // If all steps are completed, set to the last step index
        updatedPath.currentStep = nextIncompleteIndex >= 0 ? nextIncompleteIndex : updatedPath.steps.length - 1;
        updatedPath.lastUpdated = Date.now();
        
        // Mark path as completed if all steps are done
        if (allStepsCompleted && updatedPath.status !== "completed") {
          updatedPath.status = "completed";
          updatedPath.completedAt = Date.now();
          logger.info("🎉 Learning path completed!", {
            goal: updatedPath.goal,
            completedSteps,
            progress: updatedPath.progress,
          });
        } else {
          // Ensure status is active if not completed
          if (!updatedPath.status) {
            updatedPath.status = "active";
          }
        }
        
        logger.info("Learning path step completed, updating current step", {
          completedSteps,
          progress: updatedPath.progress,
          newCurrentStep: updatedPath.currentStep,
          newCurrentStepName: updatedPath.steps[updatedPath.currentStep]?.conceptName,
          completedStepNames: updatedPath.steps.filter(s => s.completed).map(s => s.conceptName),
          isCompleted: allStepsCompleted,
        });
        
        // Save to database - the hook will update state immediately after save
        // This will trigger a re-render with the new currentStep
        setLearningPath(updatedPath)
          .then(() => {
            logger.info("Learning path updated in database and UI", {
              completedSteps,
              progress: updatedPath.progress,
              currentStep: updatedPath.currentStep,
              newCurrentStepName: updatedPath.steps[updatedPath.currentStep]?.conceptName,
              status: updatedPath.status,
            });
            // The hook's setLearningPath already updated the state, so UI should update immediately
            // No need to reload - that would cause a delay and potential race condition
          })
          .catch((error) => {
            logger.error("Failed to save learning path update", { error });
            // Only reload on error to try to recover
            reload();
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptData?.lastUpdated, learningPath?.id, setLearningPath, reload, refreshTrigger]); // Include refreshTrigger to force re-check
  
  // Listen for localStorage changes (when conceptData is updated)
  useEffect(() => {
    if (!learningPath || !conceptData) return;
    
    // Listen for storage events (when localStorage is updated from another component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "aitutor-concepts" && e.newValue) {
        try {
          const newConceptData = JSON.parse(e.newValue);
          logger.debug("Concept data changed via storage event, checking path", {
            lastUpdated: newConceptData.lastUpdated,
            conceptsCount: Object.keys(newConceptData.concepts || {}).length,
          });
          // The first useEffect will pick up the change via conceptData dependency
        } catch (error) {
          logger.error("Failed to parse concept data from storage event", { error });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom events (for same-tab updates)
    const handleConceptUpdate = () => {
      logger.debug("Concept update event received, refreshing concept data");
      // Force refresh concept data from localStorage
      try {
        const stored = localStorage.getItem("aitutor-concepts");
        if (stored) {
          const parsed = JSON.parse(stored);
          logger.debug("Refreshing concept data from localStorage", {
            conceptsCount: Object.keys(parsed.concepts || {}).length,
            lastUpdated: parsed.lastUpdated,
            conceptIds: Object.keys(parsed.concepts || {}),
          });
          setConceptData(parsed);
          setRefreshTrigger(prev => prev + 1); // Force re-check
        } else {
          logger.warn("No concept data found in localStorage");
        }
      } catch (error) {
        logger.error("Failed to refresh concept data from localStorage", { error });
      }
    };
    
    // Also check periodically (every 2 seconds) for concept updates
    const intervalId = setInterval(() => {
      try {
        const stored = localStorage.getItem("aitutor-concepts");
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only update if lastUpdated changed
          if (parsed.lastUpdated !== conceptData?.lastUpdated) {
            logger.debug("Periodic check: concept data updated", {
              oldLastUpdated: conceptData?.lastUpdated,
              newLastUpdated: parsed.lastUpdated,
            });
            setConceptData(parsed);
            setRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (error) {
        // Silently fail for periodic checks
      }
    }, 2000);
    
    // Listen for problem completion events to immediately check path progress
    const handleProblemCompleted = () => {
      logger.debug("Problem completed event received, checking learning path progress");
      // Force refresh concept data and trigger path update check
      try {
        const stored = localStorage.getItem("aitutor-concepts");
        if (stored) {
          const parsed = JSON.parse(stored);
          setConceptData(parsed);
          setRefreshTrigger(prev => prev + 1);
        }
      } catch (error) {
        logger.error("Failed to refresh concept data on problem completion", { error });
      }
    };
    
    window.addEventListener("problem_completed", handleProblemCompleted);

    window.addEventListener("concept_data_updated", handleConceptUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("concept_data_updated", handleConceptUpdate);
      window.removeEventListener("problem_completed", handleProblemCompleted);
      clearInterval(intervalId);
    };
  }, [learningPath?.id, conceptData?.lastUpdated]);

  const handleGeneratePath = async () => {
    if (!goal.trim()) return;
    
    setIsGenerating(true);
    try {
      const path = await generateLearningPath(goal, conceptData, apiKey);
      await setLearningPath(path);
      setGoal("");
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent("learning_path_updated"));
    } catch (error) {
      logger.error("Failed to generate learning path", { error });
      alert("Failed to generate learning path. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartStep = async (stepIndex: number) => {
    if (!learningPath) return;
    
    const step = learningPath.steps[stepIndex];
    if (!step) return;
    
    try {
      // Try to get a generated problem for this step
      const problem = await getNextProblemForStep(step, apiKey);
      if (problem) {
        onStartProblem(problem);
      } else {
        // Fallback: create a simple problem based on step
        const fallbackProblem: ParsedProblem = {
          text: `Practice ${step.conceptName}`,
          type: step.problemType,
          confidence: 0.8,
        };
        onStartProblem(fallbackProblem);
      }
    } catch (error) {
      logger.error("Failed to start learning path step", { error, step });
    }
  };

  const handleClearPath = async () => {
    if (confirm("Are you sure you want to clear your learning path?")) {
      try {
        await setLearningPath(null);
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent("learning_path_updated"));
      } catch (error) {
        logger.error("Failed to clear learning path", { error });
      }
    }
  };

  // Log current step for debugging (must be before any conditional returns)
  useEffect(() => {
    if (learningPath) {
      logger.debug("Learning path current step", {
        currentStepIndex: learningPath.currentStep,
        currentStepName: learningPath.steps[learningPath.currentStep]?.conceptName,
        completedSteps: learningPath.steps.filter(s => s.completed).length,
        totalSteps: learningPath.steps.length,
      });
    }
  }, [learningPath?.currentStep, learningPath?.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading learning path...</p>
        </div>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
            Learning Path
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a personalized learning journey
          </p>
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeneratePath()}
            placeholder="e.g., Learn quadratic equations, Master geometry, Improve algebra..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            disabled={isGenerating}
          />
          <button
            onClick={handleGeneratePath}
            disabled={!goal.trim() || isGenerating}
            className="w-full px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isGenerating ? "Generating Path..." : "Generate Learning Path"}
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
            Examples:
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            &quot;Learn quadratic equations&quot;, &quot;Master geometry basics&quot;, 
            &quot;Improve algebra skills&quot;, &quot;Practice fractions and decimals&quot;
          </p>
        </div>
      </div>
    );
  }

  const currentStep = learningPath.steps[learningPath.currentStep];
  const completedSteps = learningPath.steps.filter(s => s.completed).length;
  const isCompleted = learningPath.status === "completed" || completedSteps === learningPath.steps.length;

  return (
    <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
      {/* Completion Celebration */}
      {isCompleted && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-300 dark:border-green-700 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
            Congratulations!
          </h3>
          <p className="text-green-700 dark:text-green-300 mb-4">
            You&apos;ve completed &quot;{learningPath.goal}&quot;!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={async () => {
                // Archive current path and create new one
                try {
                  const archivedPath = { ...learningPath, status: "archived" as const };
                  await setLearningPath(archivedPath);
                  // Clear the goal input and show generation form
                  setGoal("");
                  await reload();
                } catch (error) {
                  logger.error("Failed to archive path", { error });
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Start New Path
            </button>
            <button
              onClick={async () => {
                // Just archive it, don't create new one
                try {
                  const archivedPath = { ...learningPath, status: "archived" as const };
                  await setLearningPath(archivedPath);
                  await reload();
                } catch (error) {
                  logger.error("Failed to archive path", { error });
                }
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              Archive Path
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
          {learningPath.goal}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {completedSteps} of {learningPath.steps.length} steps completed ({learningPath.progress}%)
          {isCompleted && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
              ✓ Completed
            </span>
          )}
        </p>
      </div>
      
      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={async () => {
              // Force refresh by reloading concept data from localStorage and path from database
              try {
                // Reload concept data from localStorage
                const stored = localStorage.getItem("aitutor-concepts");
                if (stored) {
                  const parsed = JSON.parse(stored);
                  setConceptData(parsed);
                  logger.debug("Refreshed concept data from localStorage", {
                    conceptsCount: Object.keys(parsed.concepts || {}).length,
                    lastUpdated: parsed.lastUpdated,
                  });
                }
                
                // Reload path from database
                await reload();
                
                // Force a check by updating trigger
                setRefreshTrigger(prev => prev + 1);
              } catch (error) {
                logger.error("Failed to refresh", { error });
              }
            }}
            className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-md transition-colors"
            title="Refresh progress"
          >
            ↻ Refresh
          </button>
          <button
            onClick={handleClearPath}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${learningPath.progress}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {learningPath.steps.map((step, index) => {
          const isCurrent = index === learningPath.currentStep;
          const isCompleted = step.completed;
          const isUpcoming = index > learningPath.currentStep;
          
          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : isCompleted
                  ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                  : isUpcoming
                  ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {isCompleted ? "✓" : step.stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {step.conceptName}
                      </h4>
                      {isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {step.description} • {step.difficulty}
                    </p>
                    {step.prerequisites.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Requires: {step.prerequisites.map(p => p.replace(/_/g, " ")).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                {isCurrent && (
                  <button
                    onClick={() => handleStartStep(index)}
                    className="ml-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate New Path */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={async () => {
            try {
              await setLearningPath(null);
              window.dispatchEvent(new CustomEvent("learning_path_updated"));
            } catch (error) {
              logger.error("Failed to clear learning path", { error });
            }
          }}
          disabled={isSaving}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Create a new learning path"}
        </button>
      </div>
    </div>
  );
}

