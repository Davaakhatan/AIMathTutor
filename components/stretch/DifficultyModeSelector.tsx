"use client";

interface DifficultyModeSelectorProps {
  mode: "elementary" | "middle" | "high" | "advanced";
  onChange: (mode: "elementary" | "middle" | "high" | "advanced") => void;
}

export default function DifficultyModeSelector({
  mode,
  onChange,
}: DifficultyModeSelectorProps) {
  const modes: Array<{
    value: "elementary" | "middle" | "high" | "advanced";
    label: string;
    description: string;
  }> = [
    {
      value: "elementary",
      label: "Elementary",
      description: "More guidance, simpler language",
    },
    {
      value: "middle",
      label: "Middle School",
      description: "Balanced scaffolding",
    },
    {
      value: "high",
      label: "High School",
      description: "Less guidance, more independence",
    },
    {
      value: "advanced",
      label: "Advanced",
      description: "Minimal hints, complex problems",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 transition-colors">
              Difficulty Level
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">
              {modes.find((m) => m.value === mode)?.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 ${
                mode === m.value
                  ? "bg-gray-900 dark:bg-gray-700 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-label={`Set difficulty to ${m.label}`}
              title={m.description}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

