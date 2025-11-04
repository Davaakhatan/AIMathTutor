"use client";

import { useState, useEffect, useRef } from "react";

interface Formula {
  category: string;
  name: string;
  formula: string;
  description: string;
}

const formulas: Formula[] = [
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

export default function FormulaReference() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const categories = ["All", ...Array.from(new Set(formulas.map((f) => f.category)))];
  const filteredFormulas =
    selectedCategory === "All"
      ? formulas
      : formulas.filter((f) => f.category === selectedCategory);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 right-4 z-40 bg-gray-900 text-white rounded-full p-3 shadow-lg hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        aria-label="Open formula reference"
        title="Formula Reference"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-lg shadow-xl w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Formula Reference</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Close formula reference"
          type="button"
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

      <div className="px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredFormulas.map((formula, index) => (
          <div
            key={index}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{formula.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{formula.description}</p>
              </div>
              <span className="text-xs text-gray-400 uppercase">{formula.category}</span>
            </div>
            <div className="mt-2 p-2 bg-white border border-gray-200 rounded font-mono text-sm text-gray-900">
              {formula.formula}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

