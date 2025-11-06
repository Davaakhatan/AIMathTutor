"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ParsedProblem } from "@/types";

interface SavedProblem extends ParsedProblem {
  savedAt: number;
  id: string;
}

interface ToolsMenuProps {
  onSelectProblem?: (problem: ParsedProblem) => void;
}

/**
 * Unified Tools Menu - Combines Search, Tips, and Formula Reference
 */
export default function ToolsMenu({ onSelectProblem }: ToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "tips" | "formulas">("search");
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [savedProblems] = useLocalStorage<SavedProblem[]>("aitutor-problem-history", []);
  const [bookmarks] = useLocalStorage<SavedProblem[]>("aitutor-bookmarks", []);
  const [currentTip, setCurrentTip] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const allProblems = [...bookmarks.map((b) => ({ ...b, isBookmarked: true })), ...savedProblems.map((p) => ({ ...p, isBookmarked: false }))];
  
  const filteredProblems = query.trim()
    ? allProblems.filter((p) =>
        p.text.toLowerCase().includes(query.toLowerCase()) ||
        (p.type && p.type.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const tips = [
    {
      title: "Ask Questions",
      content: "The tutor guides you through questions. Try answering them step by step.",
    },
    {
      title: "Use Voice Input",
      content: "Click the microphone button to speak your responses instead of typing.",
    },
    {
      title: "Try the Whiteboard",
      content: "Draw diagrams or equations on the whiteboard to visualize problems.",
    },
    {
      title: "Adjust Difficulty",
      content: "Change the difficulty level to match your grade level for better guidance.",
    },
    {
      title: "Export Your Work",
      content: "Save your conversation by clicking the Export button at the bottom.",
    },
  ];

  const shortcuts = [
    { key: "Enter", description: "Send message (in input field)" },
    { key: "Shift + Enter", description: "New line (in input field)" },
    { key: "Ctrl/Cmd + K", description: "Search problems" },
    { key: "?", description: "Show/hide tips and shortcuts" },
    { key: "Esc", description: "Close modals/dialogs" },
  ];

  const formulas = [
    {
      category: "Algebra",
      name: "Quadratic Formula",
      formula: "x = (-b ± √(b² - 4ac)) / 2a",
      description: "For solving ax² + bx + c = 0",
    },
    {
      category: "Algebra",
      name: "Slope",
      formula: "m = (y₂ - y₁) / (x₂ - x₁)",
      description: "Slope of a line through two points",
    },
    {
      category: "Geometry",
      name: "Area of Circle",
      formula: "A = πr²",
      description: "Area of a circle with radius r",
    },
    {
      category: "Geometry",
      name: "Area of Triangle",
      formula: "A = (1/2) × b × h",
      description: "Area with base b and height h",
    },
    {
      category: "Geometry",
      name: "Pythagorean Theorem",
      formula: "a² + b² = c²",
      description: "For right triangles",
    },
    {
      category: "Algebra",
      name: "Distance Formula",
      formula: "d = √((x₂ - x₁)² + (y₂ - y₁)²)",
      description: "Distance between two points",
    },
    {
      category: "Geometry",
      name: "Circumference",
      formula: "C = 2πr",
      description: "Circumference of a circle",
    },
    {
      category: "Algebra",
      name: "Slope-Intercept",
      formula: "y = mx + b",
      description: "Equation of a line",
    },
  ];

  const categories = ["All", ...Array.from(new Set(formulas.map((f) => f.category)))];
  const filteredFormulas =
    selectedCategory === "All"
      ? formulas
      : formulas.filter((f) => f.category === selectedCategory);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setActiveTab("search");
      }
      if (e.key === "?" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(!isOpen);
          if (!isOpen) setActiveTab("tips");
        }
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ 
          position: 'fixed', 
          top: 'max(1rem, env(safe-area-inset-top, 1rem))', 
          right: 'clamp(1rem, 5rem, calc(100vw - 4rem))', 
          zIndex: 40 
        }}
        className="bg-gray-900 dark:bg-gray-700 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 touch-device:min-h-[48px] touch-device:min-w-[48px] relative"
        aria-label="Open tools menu"
        title="Tools Menu (Ctrl+K or ?)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={{ 
        position: 'fixed', 
        top: 'max(1rem, env(safe-area-inset-top, 1rem))', 
        right: 'clamp(1rem, 5rem, calc(100vw - 4rem))', 
        zIndex: 40,
        maxWidth: 'calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))'
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col transition-all duration-200"
    >
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "search"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "tips"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Tips
          </button>
          <button
            onClick={() => setActiveTab("formulas")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "formulas"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Formulas
          </button>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery("");
          }}
          className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "search" && (
          <div className="p-4">
            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems by text or type..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {query.trim() === "" ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p className="text-sm">Start typing to search problems</p>
                  <p className="text-xs mt-2">Search across all saved problems and bookmarks</p>
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p className="text-sm">No problems found</p>
                  <p className="text-xs mt-2">Try different keywords</p>
                </div>
              ) : (
                filteredProblems.map((problem) => (
                  <button
                    key={problem.id || `search-${problem.text}`}
                    onClick={() => {
                      if (onSelectProblem) {
                        onSelectProblem(problem);
                      }
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium line-clamp-2 mb-1">
                          {problem.text}
                        </p>
                        <div className="flex items-center gap-2">
                          {problem.type && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">
                              {problem.type.replace("_", " ")}
                            </span>
                          )}
                          {(problem as any).isBookmarked && (
                            <span className="text-xs text-yellow-500 dark:text-yellow-400">★ Bookmarked</span>
                          )}
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "tips" && (
          <div className="p-4">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setShowShortcuts(false)}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  !showShortcuts
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Tips
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                  showShortcuts
                    ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Shortcuts
              </button>
            </div>

            {!showShortcuts ? (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {tips[currentTip].title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                    {tips[currentTip].content}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {tips.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTip(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentTip ? "bg-gray-900 dark:bg-gray-100" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                        aria-label={`Go to tip ${index + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentTip((prev) => (prev > 0 ? prev - 1 : tips.length - 1))}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentTip((prev) => (prev < tips.length - 1 ? prev + 1 : 0))}
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Use these keyboard shortcuts to navigate faster:
                </p>
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-300">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-gray-700">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "formulas" && (
          <div className="p-4">
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-gray-900 dark:bg-gray-700 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {filteredFormulas.map((formula, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{formula.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formula.description}</p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase">{formula.category}</span>
                  </div>
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded font-mono text-sm text-gray-900 dark:text-gray-100">
                    {formula.formula}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

