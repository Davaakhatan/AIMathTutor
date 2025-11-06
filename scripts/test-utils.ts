/**
 * Test Utilities for AI Math Tutor
 * 
 * These utilities help test the application without requiring a full UI.
 * Run with: npx ts-node scripts/test-utils.ts
 */

import { problemParser } from "../services/problemParser";
import { dialogueManager } from "../services/dialogueManager";
import { contextManager } from "../services/contextManager";

// Test problems by type
export const TEST_PROBLEMS = {
  arithmetic: [
    "15 + 27",
    "8 × 4 - 12",
    "100 ÷ 5 + 10"
  ],
  algebra_linear: [
    "2x + 5 = 13",
    "3x - 7 = 14",
    "5x + 3 = 2x + 15"
  ],
  algebra_quadratic: [
    "x² + 5x + 6 = 0",
    "x² - 9 = 0",
    "2x² + 7x + 3 = 0"
  ],
  geometry_area: [
    "Find the area of a circle with radius 5",
    "What's the area of a rectangle that's 10 by 5?",
    "Calculate the area of a triangle with base 8 and height 6"
  ],
  geometry_perimeter: [
    "Find the perimeter of a rectangle that is 10 units long and 5 units wide",
    "What's the perimeter of a square with side length 7?"
  ],
  geometry_angles: [
    "In a triangle, two angles are 30° and 60°. What's the measure of the third angle?",
    "If one angle of a right triangle is 45°, what's the other angle?"
  ],
  word_simple: [
    "Sarah drives 60 miles per hour. How long does it take her to drive 180 miles?",
    "A store has 50 apples. If they sell 15, how many are left?"
  ],
  word_percentage: [
    "A store has a 20% off sale. If an item originally costs $50, what's the sale price?",
    "If a shirt costs $40 and the price increases by 15%, what's the new price?"
  ],
  word_multi_variable: [
    "Sarah has twice as many apples as John. Together they have 12 apples. How many apples does each have?",
    "The sum of two numbers is 20. One number is 3 times the other. What are the numbers?"
  ],
  multi_step: [
    "Solve for x: 2(x + 3) - 5 = 11",
    "3x + 2 = 2x + 8",
    "5(x - 2) + 3 = 18"
  ]
};

/**
 * Test problem parsing
 */
export async function testProblemParsing(problemText: string) {
  console.log(`\nTesting problem parsing: "${problemText}"`);
  try {
    const parsed = await problemParser.parseText(problemText);
    console.log("✅ Parsed successfully:");
    console.log(`   Text: ${parsed.text}`);
    console.log(`   Type: ${parsed.type || "unknown"}`);
    console.log(`   Confidence: ${parsed.confidence}`);
    return parsed;
  } catch (error) {
    console.error("❌ Parsing failed:", error);
    return null;
  }
}

/**
 * Test conversation flow
 */
export async function testConversationFlow(problemText: string, studentResponses: string[]) {
  console.log(`\n=== Testing Conversation Flow ===`);
  console.log(`Problem: "${problemText}"`);
  
  try {
    // Parse problem
    const parsed = await problemParser.parseText(problemText);
    if (!parsed) {
      console.error("Failed to parse problem");
      return;
    }

    // Initialize conversation
    const session = await dialogueManager.initializeConversation(parsed);
    console.log(`\n✅ Session created: ${session.id}`);
    
    // Get initial message
    const history = await dialogueManager.getHistory(session.id);
    const initialMessage = history.find(msg => msg.role === "tutor");
    if (initialMessage) {
      console.log(`\nTutor: ${initialMessage.content}`);
    }

    // Simulate student responses
    for (let i = 0; i < studentResponses.length; i++) {
      const studentResponse = studentResponses[i];
      console.log(`\nStudent: ${studentResponse}`);
      
      try {
        const tutorResponse = await dialogueManager.processMessage(session.id, studentResponse);
        console.log(`Tutor: ${tutorResponse.content}`);
      } catch (error) {
        console.error(`❌ Error processing message:`, error);
        break;
      }
    }

    // Get final context
    const finalContext = await contextManager.getContext(session.id);
    if (finalContext) {
      console.log(`\n📊 Final Context:`);
      console.log(`   Messages: ${finalContext.messages.length}`);
      console.log(`   Stuck Count: ${finalContext.stuckCount}`);
    }

  } catch (error) {
    console.error("❌ Conversation test failed:", error);
  }
}

/**
 * Run all test problems
 */
export async function runAllTests() {
  console.log("🧪 Running All Tests...\n");
  
  let total = 0;
  let passed = 0;

  for (const [category, problems] of Object.entries(TEST_PROBLEMS)) {
    console.log(`\n📁 Testing ${category}:`);
    for (const problem of problems) {
      total++;
      const result = await testProblemParsing(problem);
      if (result) {
        passed++;
      }
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
}

/**
 * Test specific problem type
 */
export async function testProblemType(type: keyof typeof TEST_PROBLEMS) {
  console.log(`\n🧪 Testing ${type} problems...\n`);
  const problems = TEST_PROBLEMS[type];
  
  for (const problem of problems) {
    await testProblemParsing(problem);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  npm run test:all              - Run all tests");
    console.log("  npm run test:type <type>      - Test specific problem type");
    console.log("  npm run test:parse <problem>  - Test parsing a problem");
    console.log("  npm run test:chat <problem>   - Test conversation flow");
    console.log("\nAvailable types:", Object.keys(TEST_PROBLEMS).join(", "));
  } else if (args[0] === "all") {
    runAllTests();
  } else if (args[0] === "type" && args[1]) {
    testProblemType(args[1] as keyof typeof TEST_PROBLEMS);
  } else if (args[0] === "parse" && args[1]) {
    testProblemParsing(args.slice(1).join(" "));
  } else if (args[0] === "chat" && args[1]) {
    const problem = args.slice(1).join(" ");
    const responses = ["x", "Subtract 5", "Divide by 2"];
    testConversationFlow(problem, responses);
  }
}

