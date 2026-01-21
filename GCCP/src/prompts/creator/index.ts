import { ContentMode, GapAnalysisResult } from "@/types/content";

export interface CreatorPromptOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

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

═══════════════════════════════════════════════════════════════
🚫 FORBIDDEN PATTERNS - NEVER USE THESE
═══════════════════════════════════════════════════════════════

NEVER write phrases like:
- "According to the transcript/topic/lecture..."
- "As we discussed/covered/mentioned earlier..."
- "In this lecture/session/module..."
- "Based on the material provided..."
- "If you want I can..." or "Let me know if you'd like..."
- "As an AI..." or "I've created/generated..."
- "It's important to note that..." or "Please note that..."
- "The following section covers..."

Write as if YOU are the expert teaching directly to the student.
No meta-references to sources, materials, or the generation process.
Teach the content, don't describe teaching it.

═══════════════════════════════════════════════════════════════

Length target: Comprehensive coverage while staying focused (approximately 1600-3000 words)`,

  "pre-read": `You are an expert educator creating engaging pre-read materials. Your goal is to spark curiosity and build a foundation for the upcoming lecture.
  
Focus on:
- Building anticipation
- Establishing basic vocabulary
- Connecting to real-world problems

═══════════════════════════════════════════════════════════════
🚫 FORBIDDEN PATTERNS - NEVER USE THESE
═══════════════════════════════════════════════════════════════

NEVER write phrases like:
- "According to the transcript/topic/lecture..."
- "As we discussed/covered/mentioned..."
- "In this pre-read/session/module..."
- "Based on the material provided..."
- "As an AI..." or "I've created/generated..."

Write as if YOU are the expert introducing concepts directly.
No meta-references to sources or the generation process.
═══════════════════════════════════════════════════════════════`,

  assignment: `You are an expert assessment creator specializing in creating clear, unambiguous, high-quality questions. 

Your PRIMARY DIRECTIVE is to create EXACTLY the number of questions specified for each type. This is non-negotiable.

Quality Standards:
- Every question must be crystal clear with no ambiguity
- Options must be distinct and plausible (no trick answers)
- Correct answers must be definitively correct
- Explanations must teach the concept, not just state the answer
- Use markdown formatting in question text and explanations where helpful

Self-Verification Checklist (apply to each question):
1. Is the question clear and unambiguous?
2. Are all options plausible but only the correct one(s) definitively right?
3. Does the explanation teach WHY the answer is correct?
4. Is the difficulty level appropriate (Medium)?

═══════════════════════════════════════════════════════════════
🚫 FORBIDDEN PATTERNS - NEVER USE THESE IN QUESTIONS OR EXPLANATIONS
═══════════════════════════════════════════════════════════════

NEVER include phrases like:
- "According to the transcript/topic/lecture..."
- "As discussed in the material..."
- "Based on what we covered..."
- "As an AI..." or meta-commentary about generation

Questions and explanations must be STANDALONE and student-facing.
No references to source materials or generation process.
═══════════════════════════════════════════════════════════════`,
};

// Helper to format transcript section for prompts
const formatTranscriptSection = (transcript: string, gapAnalysis?: GapAnalysisResult): string => {
  let section = `
═══════════════════════════════════════════════════════════════
📝 TRANSCRIPT PROVIDED - PRIORITIZE THIS CONTENT
═══════════════════════════════════════════════════════════════

You have been given a lecture/session transcript. This is your PRIMARY SOURCE.

**CRITICAL INSTRUCTIONS:**
1. Extract key explanations, examples, and insights DIRECTLY from the transcript
2. Use the instructor's specific examples, analogies, and teaching style
3. Preserve important quotes and demonstrations from the transcript
4. Only supplement with additional context when the transcript lacks coverage
5. DO NOT make up examples that aren't in the transcript—use what was actually taught

`;

  if (gapAnalysis) {
    if (gapAnalysis.covered.length > 0) {
      section += `**FULLY COVERED in transcript (use transcript content):**
${gapAnalysis.covered.map(s => `- ✅ ${s}`).join('\n')}

`;
    }
    if (gapAnalysis.partiallyCovered.length > 0) {
      section += `**PARTIALLY COVERED (supplement with basics):**
${gapAnalysis.partiallyCovered.map(s => `- ⚠️ ${s}`).join('\n')}

`;
    }
    if (gapAnalysis.notCovered.length > 0) {
      section += `**NOT COVERED (you may add foundational content):**
${gapAnalysis.notCovered.map(s => `- ❌ ${s}`).join('\n')}

`;
    }
  }

  section += `═══════════════════════════════════════════════════════════════
TRANSCRIPT CONTENT:
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 80000)}
${transcript.length > 80000 ? '\n... [transcript truncated for length]' : ''}

═══════════════════════════════════════════════════════════════

`;
  return section;
};

export const getCreatorUserPrompt = (
  options: CreatorPromptOptions
) => {
  const { topic, subtopics, mode, transcript, gapAnalysis, assignmentCounts = { mcsc: 5, mcmc: 3, subjective: 2 } } = options;

  if (mode === "lecture") {
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${transcriptSection}Topic: ${topic}
Key Concepts: ${subtopics}
Student Context: They've completed pre-reading on this topic
${transcript ? `
**SOURCE PRIORITY**: Your PRIMARY source is the transcript above. Extract explanations, examples, and key points directly from what was taught. Only add supplementary content for subtopics not covered in the transcript.
` : ''}
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
- **Mermaid Diagrams**: Include a mermaid diagram if it significantly simplifies a complex process or flow.

MERMAID SYNTAX RULES (follow exactly):
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
\`\`\`

Mermaid requirements:
- Use \`graph TD\` for top-down, \`graph LR\` for left-right flows
- Quote labels with special characters: A["Label (info)"]
- NO HTML tags in labels
- Keep diagrams simple: max 8-10 nodes
- Valid node shapes: [rect], (round), {diamond}, ((circle))

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
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${transcriptSection}Topic: ${topic}
Key Concepts: ${subtopics}
${transcript ? `
**SOURCE PRIORITY**: Your PRIMARY source is the transcript above. Extract key concepts, vocabulary, and foundational ideas directly from what was taught. Only add supplementary content for subtopics not covered in the transcript.
` : ''}
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
    const { mcsc, mcmc, subjective } = assignmentCounts;
    const total = mcsc + mcmc + subjective;
    return `Topic: ${topic}
Key Concepts: ${subtopics}
Difficulty: Medium

═══════════════════════════════════════════════════════════════
⚠️  CRITICAL REQUIREMENT - EXACT QUESTION COUNTS ⚠️
═══════════════════════════════════════════════════════════════

You MUST create EXACTLY these quantities (no more, no less):
• MCSC (Multiple Choice Single Correct): ${mcsc} questions
• MCMC (Multiple Choice Multiple Correct): ${mcmc} questions  
• Subjective (Open-ended): ${subjective} questions

TOTAL: ${total} questions

FAILURE TO MATCH THESE EXACT COUNTS IS UNACCEPTABLE.

═══════════════════════════════════════════════════════════════

**Format Requirements:**

For MCSC questions:
- Write clear, specific question text
- Provide exactly 4 plausible options
- Ensure only ONE is definitively correct
- Use "correct_option": "A" (or B, C, D) for the single correct answer
- Write explanations that teach why the correct answer works and why others don't

For MCMC questions:
- Write clear question text (include phrase like "Select all that apply" or indicate multiple answers)
- Provide exactly 4 options
- Ensure 2-3 are correct
- Use "correct_option": "A,C" format (comma-separated letters for multiple correct)
- Explain why EACH correct answer is right

For Subjective questions:
- Write open-ended questions requiring explanation or demonstration
- **model_answer**: The ideal answer a student should provide
- **explanation**: Detailed explanation and key points to cover

**MARKDOWN FORMATTING FOR CODE:**
When including code in question_text or explanation, you MUST use proper markdown code blocks:
- Use TRIPLE BACKTICKS with language identifier, like: \`\`\`python ... \`\`\`
- NEVER write code inline without proper code block formatting
- Inside JSON strings, escape newlines as \\n
- Example of properly formatted question_text with code:
  "What will be the output of the following **nested loop** code?\\n\\n\`\`\`python\\nfor i in range(1, 4):\\n    for j in range(i):\\n        print(i, end=' ')\\n    print()\\n\`\`\`"

**Quality Checklist (verify each question):**
✓ Question is unambiguous - only one interpretation possible
✓ Options are plausible - no obviously wrong "filler" options
✓ Correct answer is definitively correct - no debate possible
✓ Explanation teaches the concept - not just "A is correct because A is right"
✓ Code blocks use triple backticks with language identifier

**CRITICAL OUTPUT RULES:**
1. Output ONLY a valid JSON array wrapped in a \`\`\`json code block
2. All content must be final, student-facing - NO internal notes or meta-commentary
3. Use **Markdown** formatting within question_text and explanation fields
4. Escape newlines as \\n in JSON strings

\`\`\`json
[
  { "type": "MCSC", "question_text": "What is the output?\\n\\n\`\`\`python\\nprint('Hello')\\n\`\`\`", "options": ["Hello", "hello", "Error", "None"], "correct_option": "A", "explanation": "The print() function outputs exactly what is in quotes." },
  { "type": "MCMC", "question_text": "Which are valid? (Select all)", "options": ["...", "...", "...", "..."], "correct_option": "A,C", "explanation": "..." },
  { "type": "Subjective", "question_text": "...", "model_answer": "...", "explanation": "..." }
]
\`\`\`

REMINDER: Create EXACTLY ${mcsc} MCSC, ${mcmc} MCMC, and ${subjective} Subjective questions.`;
  }
  return `Create content for ${topic} covering ${subtopics}.`;
};
