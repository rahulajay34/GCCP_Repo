/**
 * Assignment Data Model - Aligned with CSV export format
 * Matches headers from temp - template.csv
 */

export type QuestionType = 'mcsc' | 'mcmc' | 'subjective';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

/**
 * Primary interface for assignment questions - matches CSV export structure
 */
export interface AssignmentItem {
    questionType: QuestionType;
    contentType: 'markdown';
    contentBody: string;

    // Optional numeric fields (unused for current question types)
    intAnswer?: number;
    prepTime?: number;
    floatAnswerMax?: number;
    floatAnswerMin?: number;
    fitbAnswer?: string;

    // Answer fields based on question type
    mcscAnswer?: number;        // Index 1-4 for single correct (mcsc only)
    subjectiveAnswer?: string;  // Model answer (subjective only)

    // Options as object with keys 1-4
    options: {
        1: string;
        2: string;
        3: string;
        4: string;
    };

    mcmcAnswer?: string;        // Comma-separated indices, e.g., "1, 4" (mcmc only)
    tagRelationships?: string;  // Optional tags
    difficultyLevel: DifficultyLevel;
    answerExplanation: string;
}

/**
 * Legacy format from Creator agent - used for internal processing
 * Will be converted to AssignmentItem by Formatter
 */
export interface LegacyAssignmentQuestion {
    type: 'MCSC' | 'MCMC' | 'Subjective';
    question_text: string;
    options?: string[];
    correct_option?: string;    // "A" for MCSC, "A,C" for MCMC
    explanation: string;
    model_answer?: string;      // For Subjective
}

/**
 * Convert legacy question format to new AssignmentItem format
 */
export function convertLegacyToAssignmentItem(legacy: LegacyAssignmentQuestion): AssignmentItem {
    const optionsArray = legacy.options || ['', '', '', ''];

    // Map letter-based answers to numeric indices
    const letterToIndex: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };

    let mcscAnswer: number | undefined;
    let mcmcAnswer: string | undefined;

    if (legacy.type === 'MCSC' && legacy.correct_option) {
        mcscAnswer = letterToIndex[legacy.correct_option.toUpperCase().trim()] || 1;
    } else if (legacy.type === 'MCMC' && legacy.correct_option) {
        // Convert "A,C" to "1, 3"
        const letters = legacy.correct_option.split(',').map(l => l.trim().toUpperCase());
        const indices = letters.map(l => letterToIndex[l]).filter(Boolean);
        mcmcAnswer = indices.join(', ');
    }

    return {
        questionType: legacy.type.toLowerCase() as QuestionType,
        contentType: 'markdown',
        contentBody: legacy.question_text,
        options: {
            1: optionsArray[0] || '',
            2: optionsArray[1] || '',
            3: optionsArray[2] || '',
            4: optionsArray[3] || '',
        },
        mcscAnswer,
        mcmcAnswer,
        subjectiveAnswer: legacy.type === 'Subjective' ? legacy.model_answer : undefined,
        difficultyLevel: 'Medium',
        answerExplanation: legacy.explanation || '',
    };
}

/**
 * CSV headers matching temp - template.csv
 */
export const CSV_HEADERS = [
    'questionType',
    'contentType',
    'contentBody',
    'intAnswer',
    'prepTime(in_seconds)',
    'floatAnswer.max',
    'floatAnswer.min',
    'fitbAnswer',
    'mcscAnswer',
    'subjectiveAnswer',
    'option.1',
    'option.2',
    'option.3',
    'option.4',
    'mcmcAnswer',
    'tagRelationships',
    'difficultyLevel',
    'answerExplanation',
] as const;

/**
 * Convert AssignmentItem to CSV row
 */
export function assignmentItemToCSVRow(item: AssignmentItem): string[] {
    return [
        item.questionType,
        item.contentType,
        item.contentBody,
        item.intAnswer?.toString() || '',
        item.prepTime?.toString() || '',
        item.floatAnswerMax?.toString() || '',
        item.floatAnswerMin?.toString() || '',
        item.fitbAnswer || '',
        item.mcscAnswer?.toString() || '',
        item.subjectiveAnswer || '',
        item.options[1],
        item.options[2],
        item.options[3],
        item.options[4],
        item.mcmcAnswer || '',
        item.tagRelationships || '',
        item.difficultyLevel,
        item.answerExplanation,
    ];
}

/**
 * Escape a value for CSV (handle quotes and newlines)
 */
export function escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Generate full CSV content from array of AssignmentItems
 */
export function generateCSV(items: AssignmentItem[]): string {
    const headerRow = CSV_HEADERS.join(',');
    const dataRows = items.map(item => {
        return assignmentItemToCSVRow(item)
            .map(escapeCSVValue)
            .join(',');
    });
    return [headerRow, ...dataRows].join('\r\n');
}
