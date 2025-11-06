"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Message, ParsedProblem } from "@/types";
import MessageComponent from "./Message";
import MessageInput, { MessageInputRef } from "./MessageInput";
import StepVisualization from "../stretch/StepVisualization";
import ConceptualConnections from "../ConceptualConnections";
import VoiceInterface, { speakText } from "../stretch/VoiceInterface";
import ProgressiveHints from "../ProgressiveHints";
import Whiteboard from "../stretch/Whiteboard";
import { sanitizeInput, formatErrorMessage, isRetryableError, delay } from "@/lib/utils";
import ErrorRecovery from "../ErrorRecovery";
import { DrawingSuggestion } from "../ai/DrawingSuggestionParser";
import { useToast } from "@/hooks/useToast";
import Toast from "../Toast";
import EmotionalSupport from "../EmotionalSupport";

interface ChatUIProps {
  sessionId: string;
  initialMessages?: Message[];
  onRestart?: () => void;
  problem?: ParsedProblem;
  enableStretchFeatures?: boolean;
  difficultyMode?: "elementary" | "middle" | "high" | "advanced";
  voiceEnabled?: boolean;
  onMessagesChange?: (messages: Message[]) => void;
  apiKey?: string; // Optional: Client-provided API key as fallback
}

const ChatUI = memo(function ChatUI({ 
  sessionId, 
  initialMessages = [], 
  onRestart,
  problem,
  enableStretchFeatures = true,
  difficultyMode = "middle",
  voiceEnabled: propVoiceEnabled = true,
  onMessagesChange,
  apiKey,
}: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(propVoiceEnabled);
  const [showWhiteboard, setShowWhiteboard] = useState(enableStretchFeatures); // Show by default when stretch features enabled
  const [voiceSyncEnabled, setVoiceSyncEnabled] = useState(false);
  const whiteboardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toasts, showToast, removeToast } = useToast();
  
  // Sync with prop
  useEffect(() => {
    setVoiceEnabled(propVoiceEnabled);
  }, [propVoiceEnabled]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<MessageInputRef>(null);

  // Sync initialMessages when they change
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length]);

  // Notify parent of message changes
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Delay scroll slightly to ensure DOM is updated
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages]);

  // Memoize celebrate callback to prevent infinite loops
  const handleCelebrate = useCallback(() => {
    // Optional: Add celebration sound or animation
  }, []);

  // Handle drawing suggestions
  const handleDrawingSuggestion = useCallback((suggestion: DrawingSuggestion) => {
    console.log("Drawing suggestion clicked:", suggestion);
    
    switch (suggestion.type) {
      case "highlight":
        // For highlight suggestions, show guidance and focus attention
        showToast(
          `💡 ${suggestion.action}: ${suggestion.description || "Look at the calculation mentioned in the message."}`,
          "info",
          5000
        );
        // Scroll to the relevant message if possible
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
        break;
        
      case "line":
      case "shape":
        // For drawing suggestions, show instructions and ensure whiteboard is visible
        if (!showWhiteboard) {
          setShowWhiteboard(true);
        }
        showToast(
          `✏️ ${suggestion.action}. Use the whiteboard tools to ${suggestion.description || "draw this."}`,
          "info",
          5000
        );
        break;
        
      case "label":
        // For label suggestions, guide user to add text
        if (!showWhiteboard) {
          setShowWhiteboard(true);
        }
        showToast(
          `🏷️ ${suggestion.action}. Click the "Aa" button on the whiteboard to add text labels.`,
          "info",
          5000
        );
        break;
        
      case "annotation":
        // For annotation suggestions, provide general guidance
        showToast(
          `📝 ${suggestion.action}: ${suggestion.description || "Add this annotation to help visualize the problem."}`,
          "info",
          5000
        );
        if (!showWhiteboard) {
          setShowWhiteboard(true);
        }
        break;
        
      default:
        // Generic feedback
        showToast(
          `💡 ${suggestion.action}: ${suggestion.description || "Follow this suggestion to improve your work."}`,
          "info",
          4000
        );
    }
  }, [showWhiteboard, showToast]);

  const handleSendMessage = useCallback(async (message: string, whiteboardImage?: string) => {
    if (!message.trim() || isLoading) return;
    
    // Validate sessionId exists before sending
    if (!sessionId) {
      const errorMsg = "No active session. Please start a new problem first.";
      setError(errorMsg);
      console.error("Cannot send message: sessionId is missing", {
        sessionId,
        messagesCount: messages.length,
      });
      return;
    }
    
    // Handle voice input if needed
    if (enableStretchFeatures && voiceEnabled) {
      // Voice input is already handled by VoiceInterface onTranscript
    }

    // Sanitize input
    const sanitizedMessage = sanitizeInput(message, 1000);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: sanitizedMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Retry logic
    let lastError: Error | null = null;
    const maxRetries = 2;
    
    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

          // Prepare request body
          const requestBody: any = {
            sessionId,
            message: sanitizedMessage,
            difficultyMode: difficultyMode,
            apiKey: apiKey, // Include client-provided API key if available
          };

          // Add whiteboard image if provided (convert data URL to base64)
          if (whiteboardImage) {
            // Check if it's already a data URL or just base64
            let base64Data: string;
            if (whiteboardImage.startsWith('data:image')) {
              base64Data = whiteboardImage.split(",")[1]; // Remove data URL prefix
            } else {
              base64Data = whiteboardImage; // Already base64
            }
            
            // Log for debugging
            console.log("Sending whiteboard image:", {
              hasImage: true,
              originalLength: whiteboardImage.length,
              base64Length: base64Data.length,
              startsWith: whiteboardImage.substring(0, 30),
            });
            
            requestBody.whiteboardImage = base64Data;
          } else {
            console.log("No whiteboard image to send");
          }

          // Try streaming first (enabled by default for better UX)
          const useStreaming = true; // Can be made configurable later
          
          if (useStreaming) {
            try {
              // Add streaming flag to request
              requestBody.stream = true;
              
              const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                // Fallback to non-streaming on error
                throw new Error(`Streaming failed: ${response.status}`);
              }

              // Check if response is streaming (text/event-stream)
              const contentType = response.headers.get("content-type");
              if (contentType?.includes("text/event-stream")) {
                // Handle streaming response
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                
                if (!reader) {
                  throw new Error("No reader available for streaming");
                }

                // Create placeholder message for streaming
                const streamingMessageId = (Date.now() + 1).toString();
                const streamingMessage: Message = {
                  id: streamingMessageId,
                  role: "tutor",
                  content: "",
                  timestamp: Date.now(),
                  isStreaming: true,
                };

                setMessages((prev) => [...prev, streamingMessage]);

                let accumulatedContent = "";
                let buffer = "";

                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || ""; // Keep incomplete line in buffer

                    for (const line of lines) {
                      if (!line.trim()) continue;
                      
                      try {
                        const data = JSON.parse(line);
                        
                        if (data.type === "chunk" && data.content) {
                          accumulatedContent += data.content;
                          // Update message in real-time
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === streamingMessageId
                                ? { ...msg, content: accumulatedContent }
                                : msg
                            )
                          );
                        } else if (data.type === "done") {
                          // Streaming complete
                          break;
                        } else if (data.type === "error") {
                          throw new Error(data.error || "Streaming error");
                        }
                      } catch (parseError) {
                        // Ignore JSON parse errors for incomplete lines
                        continue;
                      }
                    }
                  }

                  // Finalize message (remove streaming flag)
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessageId
                        ? {
                            ...msg,
                            content: accumulatedContent,
                            isStreaming: false,
                          }
                        : msg
                    )
                  );

                  // Speak tutor response if voice is enabled
                  if (voiceEnabled && enableStretchFeatures && accumulatedContent) {
                    speakText(accumulatedContent);
                  }

                  return; // Success, exit retry loop
                } catch (streamError) {
                  // Remove streaming message on error
                  setMessages((prev) => prev.filter((msg) => msg.id !== streamingMessageId));
                  throw streamError;
                }
              } else {
                // Response is not streaming, handle as regular JSON
                const result = await response.json();
                if (result.success && result.response) {
                  const tutorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "tutor",
                    content: result.response.text,
                    timestamp: result.response.timestamp,
                  };

                  setMessages((prev) => [...prev, tutorMessage]);
                  
                  if (voiceEnabled && enableStretchFeatures) {
                    speakText(result.response.text);
                  }
                  
                  return;
                } else {
                  throw new Error(result.error || "Failed to get response from tutor");
                }
              }
            } catch (streamError) {
              // Fallback to non-streaming on streaming error
              console.debug("Streaming failed, falling back to regular request", {
                error: streamError instanceof Error ? streamError.message : String(streamError),
              });
              // Remove stream flag and continue with regular request
              delete requestBody.stream;
            }
          }

          // Regular (non-streaming) request
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || 
              `Server error: ${response.status} ${response.statusText}`
            );
          }

          const result = await response.json();

          if (result.success && result.response) {
            const tutorMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "tutor",
              content: result.response.text,
              timestamp: result.response.timestamp,
            };

            setMessages((prev) => [...prev, tutorMessage]);
            
            // Speak tutor response if voice is enabled
            if (voiceEnabled && enableStretchFeatures) {
              speakText(result.response.text);
            }
            
            return; // Success, exit retry loop
          } else {
            throw new Error(result.error || "Failed to get response from tutor");
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Unknown error");
          
          // Check if it's a retryable error
          const isRetryable = isRetryableError(err);

          // If last attempt or not retryable, show error
          if (attempt === maxRetries || !isRetryable) {
            setError(formatErrorMessage(err));
            break;
          }
          
          // Wait before retry (exponential backoff)
          await delay(attempt);
        }
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, voiceEnabled, enableStretchFeatures, difficultyMode, isLoading, apiKey]);

  // Handle whiteboard drawing send
  const handleSendWhiteboard = useCallback((imageDataUrl: string) => {
    // Send whiteboard with a message indicating it's a drawing
    handleSendMessage("Here's my drawing/work:", imageDataUrl);
  }, [handleSendMessage]);

  // Handle whiteboard drawing review (feedback without sending)
  const handleReviewWhiteboard = useCallback((imageDataUrl: string) => {
    // Request review feedback on the drawing
    handleSendMessage("Can you review my drawing and give me feedback?", imageDataUrl);
  }, [handleSendMessage]);

      return (
        <div className="flex flex-col gap-4">
          {/* Whiteboard - Always visible when enabled */}
          {enableStretchFeatures && showWhiteboard && (
            <Whiteboard
              isEnabled={true}
              onSendDrawing={handleSendWhiteboard}
              onReviewDrawing={handleReviewWhiteboard}
              compact={false}
              onCanvasRef={(canvas) => {
                whiteboardCanvasRef.current = canvas;
              }}
            />
          )}
          
          <div 
            ref={chatContainerRef}
            className="flex flex-col h-full max-h-[400px] sm:max-h-[500px] md:max-h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors"
            role="log"
            aria-label="Conversation with math tutor"
            aria-live="polite"
            aria-atomic="false"
          >
      {/* Header with restart button, voice toggle, and whiteboard toggle */}
      {(onRestart || enableStretchFeatures) && messages.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-2">
            {enableStretchFeatures && (
              <>
                <VoiceInterface
                  onTranscript={(text) => {
                    // Put transcribed text into message input for review before sending
                    if (messageInputRef.current) {
                      messageInputRef.current.setValue(text);
                      messageInputRef.current.focus();
                    }
                  }}
                  onSpeak={() => {}}
                  isEnabled={voiceEnabled}
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline transition-colors">
                  Voice input
                </span>
                <button
                  onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                    showWhiteboard
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  aria-label={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
                  title={showWhiteboard ? "Hide whiteboard" : "Show whiteboard"}
                >
                  ✏️
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {enableStretchFeatures && (
              <>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-light px-2 py-1"
                  aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
                  title={voiceEnabled ? "Disable voice" : "Enable voice"}
                >
                  {voiceEnabled ? "🔊" : "🔇"}
                </button>
                <button
                  onClick={() => setVoiceSyncEnabled(!voiceSyncEnabled)}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors font-light ${
                    voiceSyncEnabled
                      ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  aria-label={voiceSyncEnabled ? "Disable voice-visual sync" : "Enable voice-visual sync"}
                  title={voiceSyncEnabled ? "Disable voice-visual sync" : "Enable voice-visual sync (synchronizes voice with visual highlights)"}
                >
                  🎬
                </button>
              </>
            )}
            {onRestart && (
              <button
                onClick={onRestart}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRestart();
                  }
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-light focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-1 rounded px-2 py-1"
                aria-label="Restart conversation"
              >
                Restart conversation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8 sm:py-12 transition-colors">
            <p className="text-sm font-light mb-2">Start the conversation</p>
            <p className="text-xs font-light text-gray-300 dark:text-gray-400 transition-colors">
              {enableStretchFeatures && "Try using voice input or type your response"}
            </p>
          </div>
        ) : (
          <>
            {/* Conceptual Connections */}
            {enableStretchFeatures && problem && messages.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ConceptualConnections problem={problem} compact={false} />
              </div>
            )}
            
            {/* Step Visualization */}
            {enableStretchFeatures && problem && messages.length > 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <StepVisualization messages={messages} problem={problem.text} />
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MessageComponent 
                  message={message} 
                  enableStretchFeatures={enableStretchFeatures}
                  onSuggestionClick={(suggestion) => {
                    handleDrawingSuggestion(suggestion);
                  }}
                  whiteboardRef={whiteboardCanvasRef}
                  voiceSyncEnabled={voiceSyncEnabled && voiceEnabled}
                />
              </div>
            ))}
          </>
        )}

        {isLoading && (
          <div className="flex flex-col gap-3 text-gray-400 dark:text-gray-500 animate-in fade-in transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400 rounded-full animate-spin transition-colors" />
              <span className="text-sm font-light">Tutor is thinking...</span>
            </div>
            {/* Loading skeleton for upcoming message */}
            <div className="flex justify-start animate-pulse">
              <div className="max-w-[75%] bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 space-y-2 transition-colors">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 transition-colors" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 transition-colors" />
              </div>
            </div>
          </div>
        )}

            {/* Progressive Hints */}
            {enableStretchFeatures && problem && messages.length > 0 && !isLoading && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 transition-colors" data-tutorial="hints">
                <ProgressiveHints
              problem={problem}
              sessionMessages={messages}
              apiKey={apiKey}
              onHintRequest={(hint) => {
                // Add hint as a tutor message
                const hintMessage: Message = {
                  id: Date.now().toString(),
                  role: "tutor",
                  content: `💡 Hint: ${hint}`,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, hintMessage]);
                if (onMessagesChange) {
                  onMessagesChange([...messages, hintMessage]);
                }
                // Speak hint if voice is enabled
                if (voiceEnabled) {
                  speakText(hint);
                }
              }}
            />
          </div>
        )}

        {error && (
          <ErrorRecovery
            error={error}
            onRetry={() => {
              setError(null);
              // Get the last user message and retry
              const lastUserMessage = messages
                .filter((m) => m.role === "user")
                .pop();
              if (lastUserMessage) {
                handleSendMessage(lastUserMessage.content);
              }
            }}
            onDismiss={() => setError(null)}
          />
        )}

        <div ref={messagesEndRef} />

        {/* Emotional Support */}
        {enableStretchFeatures && (
          <EmotionalSupport 
            messages={messages}
            onCelebrate={handleCelebrate}
          />
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        ref={messageInputRef}
        onSendMessage={(message) => handleSendMessage(message)}
        disabled={isLoading}
      />
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
});

export default ChatUI;

