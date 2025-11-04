"use client";

import { ParsedProblem, Message } from "@/types";

interface PrintViewProps {
  problem: ParsedProblem | null;
  messages: Message[];
}

/**
 * Print-friendly view of the conversation
 */
export default function PrintView({ problem, messages }: PrintViewProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Math Tutor - Conversation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            .problem { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .message { margin: 15px 0; padding: 10px; }
            .tutor { background: #f3f4f6; border-left: 3px solid #4b5563; }
            .student { background: #f9fafb; border-left: 3px solid #1f2937; }
            .timestamp { color: #6b7280; font-size: 12px; margin-top: 5px; }
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>AI Math Tutor - Conversation</h1>
          ${problem ? `
            <div class="problem">
              <h2>Problem</h2>
              <p>${problem.text}</p>
              ${problem.type ? `<p><strong>Type:</strong> ${problem.type.replace("_", " ")}</p>` : ""}
            </div>
          ` : ""}
          <h2>Conversation</h2>
          ${messages.map((msg) => `
            <div class="message ${msg.role}">
              <p><strong>${msg.role === "user" ? "Student" : "Tutor"}:</strong></p>
              <p>${msg.content}</p>
              ${msg.timestamp ? `<p class="timestamp">${new Date(msg.timestamp).toLocaleString()}</p>` : ""}
            </div>
          `).join("")}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!problem || messages.length === 0) return null;

  return (
    <button
      onClick={handlePrint}
      className="text-xs text-gray-500 hover:text-gray-700 transition-colors font-light px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
      aria-label="Print conversation"
      title="Print conversation"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      Print
    </button>
  );
}

