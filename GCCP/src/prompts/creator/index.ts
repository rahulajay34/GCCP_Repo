import { ContentMode, GapAnalysisResult, CourseContext } from "@/types/content";

export interface CreatorPromptOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  courseContext?: CourseContext; // Injected by CourseDetector
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

export const CREATOR_SYSTEM_PROMPTS = {
  lecture: `You are an expert educator creating comprehensive lecture notes for students who have completed pre-reading. Your writing builds mastery through clear explanations, practical examples, and careful progression from simple to complex.

Your tone is conversational but thorough—like a knowledgeable mentor walking students through material they're ready to deeply understand.

Core principles:

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
Do not use phrases like "In this lecture" or "As an AI".
If creating '$' symbol in content, use \$ instead of $ symbol to prevent Markdown processors from misinterpreting dollar signs as LaTeX math delimiters.
Avoid using long paragraphs of text. Break down the content into smaller chunks of bullet points.

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

  assignment: `You are an expert assessment creator using Chain of Thought reasoning to create high-quality questions.

Your PRIMARY DIRECTIVE is to create EXACTLY the number of questions specified. This is non-negotiable.

═══════════════════════════════════════════════════════════════
📋 CHAIN OF THOUGHT PROCESS (Use this for EACH question)
═══════════════════════════════════════════════════════════════

1. DRAFT: Write the question targeting a specific concept
2. CRITIQUE: Is it clear? Are options plausible? Is exactly one/multiple correct?
3. REFINE: Fix any issues found in critique
4. FORMAT: Output the final JSON structure

═══════════════════════════════════════════════════════════════
📦 REQUIRED OUTPUT SCHEMA (Follow EXACTLY)
═══════════════════════════════════════════════════════════════

Each question MUST have this EXACT structure:
{
  "questionType": "mcsc" | "mcmc" | "subjective",
  "contentBody": "Question text with markdown...",
  "options": {
    "1": "First option text",
    "2": "Second option text", 
    "3": "Third option text",
    "4": "Fourth option text"
  },
  "mcscAnswer": 2,              // For mcsc ONLY: number 1-4
  "mcmcAnswer": "1, 3",         // For mcmc ONLY: comma-separated numbers
  "subjectiveAnswer": "...",    // For subjective ONLY: model answer
  "difficultyLevel": "0.5",     // For easy questions:0, for medium questions:0.5, for hard questions:1
  "answerExplanation": "Detailed teaching explanation..."
}

CRITICAL CONSTRAINTS:
• mcsc: EXACTLY one mcscAnswer (number 1-4), no mcmcAnswer
• mcmc: 2-3 correct in mcmcAnswer (e.g., "1, 4"), no mcscAnswer  
• subjective: subjectiveAnswer required, options can be empty strings
• ALL question types MUST have options object with keys 1-4

═══════════════════════════════════════════════════════════════
🚫 FORBIDDEN PATTERNS
═══════════════════════════════════════════════════════════════

NEVER write:
- "According to the transcript/topic/lecture..."
- "As discussed in the material..."
- "As an AI..." or meta-commentary
- References to source materials

Questions must be STANDALONE and student-facing.
═══════════════════════════════════════════════════════════════`,
};

/**
 * Format course context section for injection into prompts (runtime injection)
 * This section tailors content to the detected domain
 */
const formatCourseContextSection = (context?: CourseContext): string => {
  if (!context || context.domain === 'general') return '';

  return `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN-SPECIFIC CONTENT GUIDELINES
═══════════════════════════════════════════════════════════════

${context.contentGuidelines}

**Use these or similar types of examples:** ${context.characteristics.exampleTypes.join(', ')}

**Preferred formats:** ${context.characteristics.formats.join(', ')}

**Incorporate domain vocabulary naturally:** ${context.characteristics.vocabulary.slice(0, 7).join(', ')}

**Writing style:** ${context.characteristics.styleHints.join('; ')}

**Relatable scenarios students will connect with, you can use them or create your own:**
${context.characteristics.relatableExamples.map(ex => `• ${ex}`).join('\n')}

⚠️ CRITICAL REMINDERS:
• Do NOT mention any course name, program name, or domain label
• Do NOT use meta-phrases like "in this course" or "for this program"
• Just naturally incorporate the domain-appropriate examples and style
• Content should feel tailored but never explicitly state it's for a specific audience
═══════════════════════════════════════════════════════════════

`;
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
2. Use the instructor's specific examples, analogies
3. Preserve important quotes and demonstrations from the transcript
4. Only supplement with additional context when the transcript lacks coverage

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

CRITICAL INSTRUCTION: Since there are topics NOT COVERED in the transcript, you MUST add a final section titled "Further Exploration". In this section, briefly introduce these concepts as advanced/related topics that students should research, without stating "this was missing from the transcript". Just present them as natural extensions.

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
  const { topic, subtopics, mode, transcript, gapAnalysis, courseContext, assignmentCounts = { mcsc: 4, mcmc: 4, subjective: 1 } } = options;

  // Runtime course context injection (from CourseDetector)
  const courseSection = formatCourseContextSection(courseContext);

  if (mode === "lecture") {
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${courseSection}${transcriptSection}Topic: ${topic}
Key Concepts: ${subtopics}
Student Context: They've completed pre-reading on this topic
${transcript ? `
**SOURCE PRIORITY**: Your PRIMARY source is the transcript above. Extract explanations, examples, and key points directly from what was taught. Only add supplementary content for subtopics not covered in the transcript.
` : ''}
Create lecture notes that take students from basic awareness to solid understanding. Structure naturally following this flow:

## Lecture Notes : ${topic}

Begin with "In this lesson, you'll learn to…" then provide 3-4 specific, actionable goals using verbs like explain, apply, compare, build. Avoid abstract goals—be concrete about what they'll be able to do.

## Detailed Explanation

This is your core teaching section. Move from simple to complete, using examples and clear progression.

Include these subsections flexibly—only where they naturally fit:

### What Is ${topic}? (Always include)

- Start with relatable analogy
- Define in one clear sentence

### Why It Matters (Make this heading exciting - Don't use "Why It Matters")

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

    return `${courseSection}${transcriptSection}Topic: ${topic}
Key Concepts: ${subtopics}
${transcript ? `
**SOURCE PRIORITY**: Your PRIMARY source is the ${topic} and ${subtopics}.
` : ''}
Create pre-read content that introduces this topic to complete beginners in a way that is easy to understand and engaging manner. Structure your response naturally following this flow:

## Pre-Read Notes : ${topic}

Start with "In this pre-read, you'll discover:" then list 3-4 specific, jargon-free promises using action words (discover, understand, learn).

## Understanding ${topic} (use key concept from subtopics)

Build awareness through these subsections—but only include ones that naturally fit. Don't force every subsection if it feels awkward:

### What Is ${topic}? (use key vocab for the topic)

- Begin with an everyday analogy
- Follow with one clear definition sentence
- For technical topics: show pseudo-code concept
- For non-technical: use a mini-story

### Why Does This Matter? (Always include)

- List exactly 3 benefits
- Frame as problems solved or improvements gained
- Keep explanations to 1-2 sentences each

### From Known to New (replace known and new with prerequisites and new concept)

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
- For code: minimal example per step (if required)
- For concepts: progress mini case study

### Key Features (Include only if essential)

- Maximum 2-3 features
- Only features critical for basics
- Simple example for each

### Putting It All Together (Always include)

- ONE complete example using prerequisites plus new concept
- For code: 10-15 lines maximum (if required)
- For concepts: complete mini case study with clear outcome

## Practice Exercises

Create 3-5 thinking/creative exercises. Mix and match from:

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
    return `${courseSection}Topic: ${topic}
Key Concepts: ${subtopics}

═══════════════════════════════════════════════════════════════
⚠️  CRITICAL REQUIREMENT - EXACT QUESTION COUNTS ⚠️
═══════════════════════════════════════════════════════════════

You MUST create EXACTLY:
• mcsc (Multiple Choice Single Correct): ${mcsc} questions
• mcmc (Multiple Choice Multiple Correct): ${mcmc} questions  
• subjective (Open-ended): ${subjective} questions

TOTAL: ${total} questions - NO MORE, NO LESS

═══════════════════════════════════════════════════════════════
📦 EXACT JSON STRUCTURE REQUIRED
═══════════════════════════════════════════════════════════════

Output a JSON array where EACH question follows this EXACT structure:

**For mcsc (single correct answer):**
\`\`\`json
{
  "questionType": "mcsc",
  "contentBody": "Clear question text with markdown...",
  "options": {
    "1": "First option",
    "2": "Second option",
    "3": "Third option",
    "4": "Fourth option"
  },
  "mcscAnswer": 2,
  "difficultyLevel": "0.5",
  "answerExplanation": "Teaching explanation..."
}
\`\`\`

**For mcmc (multiple correct answers):**
\`\`\`json
{
  "questionType": "mcmc",
  "contentBody": "Question text (Select all that apply)...",
  "options": {
    "1": "First option",
    "2": "Second option",
    "3": "Third option",
    "4": "Fourth option"
  },
  "mcmcAnswer": "1, 3",
  "difficultyLevel": "0.5",
  "answerExplanation": "Teaching explanation... (if required show why other options are wrong)"
}
\`\`\`

**For subjective:**
\`\`\`json
{
  "questionType": "subjective",
  "contentBody": "Conceptual Implementation based question with clear submission guidelines...",
  "options": { "1": "", "2": "", "3": "", "4": "" },
  "subjectiveAnswer": "Model answer the student should provide...",
  "difficultyLevel": "0.5",
  "answerExplanation": "Teaching explanation... (Ideal editorial answer for the question)"
}
\`\`\`

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL CONSTRAINTS (VALIDATION WILL FAIL IF VIOLATED)
═══════════════════════════════════════════════════════════════

• mcsc: mcscAnswer must be a NUMBER (1, 2, 3, or 4), NOT a letter
• mcmc: mcmcAnswer must have 2+ numbers as comma-separated string (e.g., "1, 4")
• ALL questions MUST have options object with keys "1", "2", "3", "4"
• Use "questionType" NOT "type"
• Use "contentBody" NOT "question_text"
• Use "answerExplanation" NOT "explanation"

═══════════════════════════════════════════════════════════════
🔴 MANDATORY CODE BLOCK FORMATTING (DO NOT SKIP THIS)
═══════════════════════════════════════════════════════════════

When including code in contentBody or answerExplanation:
1. ALWAYS wrap code in triple backticks with language identifier
2. Format: \`\`\`python\\n<code>\\n\`\`\`
3. The BACKTICKS MUST be present in the final JSON string

CORRECT example:
"contentBody": "What is the output?\\n\\n\`\`\`python\\nfor i in range(3):\\n    print(i)\\n\`\`\`"

WRONG example (missing backticks):
"contentBody": "What is the output?\\n\\npython\\nfor i in range(3):\\n    print(i)"

If you include any code WITHOUT triple backticks, validation WILL FAIL.

**OUTPUT:**
Output ONLY a valid JSON array wrapped in \`\`\`json ... \`\`\`

REMINDER: EXACTLY ${mcsc} mcsc, ${mcmc} mcmc, ${subjective} subjective = ${total} total.`;
  }
  return `Create content for ${topic} covering ${subtopics}.`;
};
