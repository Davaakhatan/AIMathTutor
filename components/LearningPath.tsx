"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
  const [learningPath, setLearningPath] = useLocalStorage<LearningPathType | null>(
    "aitutor-learning-path",
    null
  );
  const [conceptData] = useLocalStorage<ConceptTrackingData>(
    "aitutor-concepts",
    { concepts: {}, lastUpdated: Date.now() }
  );

  // Update path progress when concepts change
  useEffect(() => {
    if (learningPath && conceptData) {
      // Check if any step should be marked as completed based on mastery
      let pathUpdated = false;
      const updatedPath = { ...learningPath };
      
      updatedPath.steps = updatedPath.steps.map(step => {
        const concept = conceptData.concepts[step.conceptId];
        // Mark as completed if:
        // 1. Mastery level >= 60% (lower threshold for completion)
        // 2. OR has solved at least one problem successfully (50% success rate)
        // 3. OR has attempted and solved at least one problem
        const isCompleted = concept && (
          concept.masteryLevel >= 60 || 
          (concept.problemsSolved > 0 && concept.problemsSolved >= concept.problemsAttempted * 0.5) ||
          (concept.problemsSolved > 0 && concept.problemsAttempted === 1)
        );
        
        if (isCompleted && !step.completed) {
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
        updatedPath.currentStep = updatedPath.steps.findIndex(s => !s.completed);
        updatedPath.lastUpdated = Date.now();
        setLearningPath(updatedPath);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptData?.lastUpdated, learningPath?.id]); // Only depend on conceptData changes and path ID, not the full path object
  
  // Also check for updates periodically (every 2 seconds) to catch real-time updates
  useEffect(() => {
    if (!learningPath || !conceptData) return;
    
    const interval = setInterval(() => {
      let pathUpdated = false;
      const updatedPath = { ...learningPath };
      
      updatedPath.steps = updatedPath.steps.map(step => {
        const concept = conceptData.concepts[step.conceptId];
        const isCompleted = concept && (
          concept.masteryLevel >= 60 || 
          (concept.problemsSolved > 0 && concept.problemsSolved >= concept.problemsAttempted * 0.5) ||
          (concept.problemsSolved > 0 && concept.problemsAttempted === 1)
        );
        
        if (isCompleted && !step.completed) {
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
        updatedPath.currentStep = updatedPath.steps.findIndex(s => !s.completed);
        updatedPath.lastUpdated = Date.now();
        setLearningPath(updatedPath);
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningPath?.id, conceptData?.lastUpdated]);

  const handleGeneratePath = async () => {
    if (!goal.trim()) return;
    
    setIsGenerating(true);
    try {
      const path = generateLearningPath(goal, conceptData, apiKey);
      setLearningPath(path);
      setGoal("");
    } catch (error) {
      logger.error("Failed to generate learning path", { error });
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

  const handleClearPath = () => {
    if (confirm("Are you sure you want to clear your learning path?")) {
      setLearningPath(null);
    }
  };

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

  return (
    <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
          {learningPath.goal}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {completedSteps} of {learningPath.steps.length} steps completed ({learningPath.progress}%)
        </p>
      </div>
      
      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              // Force refresh by checking concept data again
              if (conceptData) {
                let pathUpdated = false;
                const updatedPath = { ...learningPath };
                
                updatedPath.steps = updatedPath.steps.map(step => {
                  const concept = conceptData.concepts[step.conceptId];
                  const isCompleted = concept && (
                    concept.masteryLevel >= 60 || 
                    (concept.problemsSolved > 0 && concept.problemsSolved >= concept.problemsAttempted * 0.5) ||
                    (concept.problemsSolved > 0 && concept.problemsAttempted === 1)
                  );
                  
                  if (isCompleted && !step.completed) {
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
                  updatedPath.currentStep = updatedPath.steps.findIndex(s => !s.completed);
                  updatedPath.lastUpdated = Date.now();
                  setLearningPath(updatedPath);
                }
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
          onClick={() => setLearningPath(null)}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          Create a new learning path
        </button>
      </div>
    </div>
  );
}

