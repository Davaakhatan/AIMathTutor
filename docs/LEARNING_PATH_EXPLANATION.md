# Learning Path Feature - How It Works

## Overview
The Learning Path feature creates a personalized, step-by-step learning journey based on a user's goal. It automatically generates a sequence of math concepts to learn, ordered by prerequisites and dependencies.

## How It Works

### 1. **User Inputs a Goal**
- User enters a goal like "Learn quadratic equations" or "Master geometry"
- The goal is a free-text input that describes what they want to learn

### 2. **Goal Analysis & Concept Extraction**
The system analyzes the goal to identify relevant math concepts:

**Direct Matching:**
- Checks if the goal mentions specific concepts (e.g., "quadratic equations" → `quadratic_equations`)
- Matches concept names and IDs from a predefined knowledge base

**Keyword Inference:**
- If no direct matches, infers concepts from keywords:
  - "algebra" or "equation" → `linear_equations`, `factoring`
  - "geometry" or "triangle" → `area_triangle`, `area_circle`, `pythagorean_theorem`
  - "fraction" or "decimal" → `fractions`, `decimals`, `percentages`
- Default: starts with basic concepts (`fractions`, `area_rectangle`, `linear_equations`)

### 3. **Dependency Graph Building**
The system builds a dependency graph:
- **Collects Prerequisites**: For each target concept, finds all prerequisite concepts
- **Example**: To learn `quadratic_equations`, you need:
  - `linear_equations` (prerequisite)
  - `factoring` (prerequisite)
  - `exponents` (prerequisite)
  - And `exponents` needs `fractions` (prerequisite of prerequisite)

### 4. **Topological Sort (Ordering)**
Concepts are ordered using topological sort to ensure:
- Prerequisites are learned before dependent concepts
- No circular dependencies
- Logical learning progression

**Example Order:**
1. `fractions` (no prerequisites)
2. `decimals` (needs `fractions`)
3. `exponents` (needs `fractions`)
4. `linear_equations` (needs `fractions`, `decimals`)
5. `factoring` (needs `linear_equations`, `exponents`)
6. `quadratic_equations` (needs `linear_equations`, `factoring`, `exponents`)

### 5. **Step Creation**
Each concept becomes a learning step with:
- **Step Number**: Sequential order (1, 2, 3...)
- **Concept Name**: Human-readable name (e.g., "Linear Equations")
- **Difficulty**: Elementary, Middle School, High School, or Advanced
- **Problem Type**: Algebra, Geometry, Arithmetic, etc.
- **Description**: What the student will learn
- **Prerequisites**: List of required concepts
- **Completion Status**: Based on concept mastery (if tracked)

### 6. **Progress Tracking**
The system tracks:
- **Current Step**: First incomplete step
- **Progress**: Percentage of completed steps (0-100%)
- **Completed Steps**: Steps marked as done based on:
  - Concept mastery level ≥ 60%
  - OR solved at least one problem successfully (50% success rate)
  - OR solved one problem on first attempt

### 7. **Automatic Updates**
The path automatically updates when:
- Concept mastery changes (checked every 2 seconds)
- User completes problems related to path concepts
- User manually refreshes progress

### 8. **Starting a Step**
When user clicks "Start" on a step:
- System generates a problem matching the step's:
  - Problem type (Algebra, Geometry, etc.)
  - Difficulty level (Elementary, Middle School, etc.)
- Problem is opened in the chat interface
- User solves it with Socratic AI tutor

## Database Storage

### Table: `learning_paths`
- **id**: UUID (auto-generated)
- **user_id**: UUID (required)
- **student_profile_id**: UUID (nullable - null for students, profile ID for parent/teacher views)
- **goal**: Text (the user's learning goal)
- **target_concepts**: Text array (concept IDs to master)
- **steps**: JSONB (array of step objects)
- **current_step**: Integer (0-based index)
- **progress**: Integer (0-100)
- **created_at**: Timestamp
- **updated_at**: Timestamp

### Unique Constraint
- One learning path per user/profile combination
- Creating a new path replaces the existing one

## Available Concepts

The system knows about these math concepts:

**Arithmetic:**
- `fractions`, `decimals`, `percentages`, `ratios`

**Algebra:**
- `linear_equations`, `quadratic_equations`, `factoring`, `exponents`, `roots`, `slope`

**Geometry:**
- `area_rectangle`, `area_triangle`, `area_circle`, `perimeter`, `angles`, `pythagorean_theorem`, `volume`

Each concept has:
- Prerequisites (what you need to know first)
- Difficulty level
- Problem types it generates

## Example Flow

1. **User enters**: "Learn quadratic equations"
2. **System extracts**: `quadratic_equations`
3. **System finds prerequisites**: `linear_equations`, `factoring`, `exponents`
4. **System finds prerequisites of prerequisites**: `fractions`, `decimals`
5. **System orders**: fractions → decimals → exponents → linear_equations → factoring → quadratic_equations
6. **System creates 6 steps** with proper ordering
7. **User sees path** with current step highlighted
8. **User clicks "Start"** on step 1 (fractions)
9. **System generates** a fractions problem
10. **User solves** with AI tutor
11. **System updates** step 1 as completed when mastery ≥ 60%
12. **Progress updates** to 16% (1/6 steps)
13. **Current step** moves to step 2 (decimals)

## Benefits

- **Structured Learning**: Ensures prerequisites are learned first
- **Personalized**: Based on user's goal
- **Progress Tracking**: Visual progress bar and step completion
- **Automatic Updates**: Progress syncs with concept mastery
- **Persistent**: Saved in database, accessible across devices
- **Multi-User**: Parents/teachers can view student paths

