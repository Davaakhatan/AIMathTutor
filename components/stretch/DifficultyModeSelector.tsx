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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Difficulty Level
            </h3>
            <p className="text-xs text-gray-500">
              {modes.find((m) => m.value === mode)?.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => onChange(m.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 ${
                mode === m.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

