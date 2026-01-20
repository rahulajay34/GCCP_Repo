import { ContentMode } from "@/types/content";

export const CREATOR_SYSTEM_PROMPTS = {
  lecture: `You are an expert educator creating comprehensive lecture notes for students who have completed pre-reading. Your writing builds mastery through clear explanations, practical examples, and careful progression from simple to complex.

Your tone is conversational but thorough—like a knowledgeable mentor walking students through material they're ready to deeply understand.

Core principles:

- Build on pre-read foundation without repeating it
- Progress from "What → Why → How → Recap"
- Use concrete examples for every abstract concept
- Include common mistakes and how to fix them
- Keep sentences direct and under 20 words for complex ideas
- Use active voice and "you" language

Length target: Comprehensive coverage while staying focused (approximately 1600-3000 words)`,

  "pre-read": `You are an expert educator creating engaging pre-read materials. Your goal is to spark curiosity and build a foundation for the upcoming lecture.
  
  Focus on:
  - Building anticipation
  - Establishing basic vocabulary
  - Connecting to real-world problems`,

  assignment: `You are an expert assessment creator. Create clear, unambiguous questions that test understanding, application, and analysis.`,
};

export const getCreatorUserPrompt = (
  topic: string,
  subtopics: string,
  mode: ContentMode,
  prerequisites: string = "None",
) => {
  if (mode === "lecture") {
    return `Topic: ${topic}
Key Concepts: ${subtopics}
Prerequisites: ${prerequisites}
Student Context: They've completed pre-reading on this topic

Create lecture notes that take students from basic awareness to solid understanding. Structure naturally following this flow:

## What You'll Learn

Begin with "In this lesson, you'll learn to…" then provide 3-4 specific, actionable goals using verbs like explain, apply, compare, build. Avoid abstract goals—be concrete about what they'll be able to do.

## Detailed Explanation

This is your core teaching section. Move from simple to complete, using examples and clear progression.

Include these subsections flexibly—only where they naturally fit:

### What Is ${topic}? (Always include)

- Start with relatable analogy
- Define in one clear sentence
- Link back to pre-read knowledge: "You learned about X in the pre-read; now we'll..."

### Why It Matters (Always include)

- Explain the problem it solves
- Use direct examples: "You'll need this when..."
- Include at least one real-world use case

### Detailed Walkthrough (Always include—this is your main teaching)

Build complete understanding through:

- Problem → Solution flow showing before/after
- Detailed examples (code, case studies, demonstrations)
- Step-by-step breakdowns with plain English explanations
- Common mistakes and fixes
- Real use-cases that make topics concrete

For code examples: Keep them focused (5-15 lines) and explain what's happening in plain English after each example.

For concept explanations: Use mini case studies that illustrate each idea in action.

### Additional Clarity (Include when needed)

Add subsections if they help understanding:

- Common confusions: "People often mix this up with..."
- Tips or warnings for tricky parts
- **Mermaid Diagrams**: Include a mermaid diagram (flowchart, sequence, or graph) if it significantly simplifies a complex process or flow. Use \`mermaid\` code blocks.

## Key Takeaways

Provide a strong summary students can review later:

- 3-5 bullet points capturing main ideas
- Simple mental model: "Think of X as..."
- 1-2 sentences connecting to future topics

Critical instructions:

- Never use the word "analogy" explicitly in the content
- Never reference "the session," "this lecture," or "as discussed" in meta ways
- Write as if you're teaching directly, not describing teaching
- Only bold first occurrence of key terms
- Keep paragraphs to 3-4 sentences maximum`;
  }

  if (mode === "pre-read") {
    return `Topic: ${topic}
Key Concepts: ${subtopics}
Prerequisites: ${prerequisites}

Create pre-read content that introduces this topic to complete beginners. Structure your response naturally following this flow:

## What You'll Learn

Start with "In this pre-read, you'll discover:" then list 3-4 specific, jargon-free promises using action words (discover, understand, learn).

## Understanding ${topic}

Build awareness through these subsections—but only include ones that naturally fit. Don't force every subsection if it feels awkward:

### What Is ${topic}? (Always include)

- Begin with an everyday analogy
- Follow with one clear definition sentence
- For technical topics: show pseudo-code concept
- For non-technical: use a mini-story

### Why Does This Matter? (Always include)

- List exactly 3 benefits
- Frame as problems solved or improvements gained
- Keep explanations to 1-2 sentences each

### From Known to New (Include when helpful)

- Show the "painful way" using only prerequisites
- Introduce new concept as the elegant solution
- For code: show repetitive approach then simplified version
- For concepts: show inefficient scenario then improvement

### Core Components (Include for multi-part topics)

- Break into 3-5 main parts maximum
- Each gets: simple name + one sentence + micro-example

### Step-by-Step Process (Include for procedural topics)

- 3-5 numbered steps
- One clear action per step
- For code: minimal example per step
- For concepts: progress mini case study

### Key Features (Include only if essential)

- Maximum 2-3 features
- Only features critical for basics
- Simple example for each

### Putting It All Together (Always include)

- ONE complete example using prerequisites plus new concept
- For code: 10-15 lines maximum
- For concepts: complete mini case study with clear outcome

## Practice Exercises

Create 3-5 thinking exercises. Mix and match from:

- Pattern Recognition: Identify what could be improved
- Concept Detective: Guess purpose in examples
- Real-Life Application: List 3 situations to apply this
- Spot the Error: Find what's wrong
- Planning Ahead: How to apply concept to new situation

Important: Write naturally. Never mention the word "analogy" explicitly. Never reference "the session" or "this pre-read" in a meta way. Just teach directly.`;
  }

  if (mode === "assignment") {
    return `Topic: ${topic}
Key Concepts: ${subtopics}
Question Type: Mixed (MCSC, MCMC, Subjective)
Difficulty: Medium
Number of Questions: 5

Create 5 mixed questions at Medium difficulty level for this topic.

For MCSC questions:
- Write clear, specific question text
- Provide exactly 4 plausible options
- Ensure only one is definitively correct
- Write explanations that teach why the correct answer works and why others don't

For MCMC questions:
- Write clear question text that indicates multiple correct answers
- Provide exactly 4 options
- Ensure 2-3 are correct
- Explain why each correct answer is right

For Subjective questions:
- Write open-ended questions that require explanation or demonstration
- **model_answer**: Provide the direct, "correct" answer or key points a student should write.
- **explanation**: Provide the detailed, complete answer to the question.

Critical: Question text should be direct and clear. Never include meta-language.

**CRITICAL OUTPUT RULE:** The content inside the JSON fields (like \`explanation\`, \`question_text\`) must be **final, student-facing content only**. Do NOT include internal notes.

**FORMATTING RULES**:
1. Use **Markdown** for formatting within fields.
2. Output **ONLY** a valid JSON list of objects.
3. Wrap the JSON in a code block like \`\`\`json ... \`\`\`.

\`\`\`json
[
  { "type": "MCSC", "question_text": "...", "options": ["A", "B", "C", "D"], "correct_option": "A", "explanation": "..." },
  { "type": "Subjective", "question_text": "...", "model_answer": "...", "explanation": "..." }
]
\`\`\``;
  }
  return `Create content for ${topic} covering ${subtopics}.`;
};
