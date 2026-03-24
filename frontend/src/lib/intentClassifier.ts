/**
 * Lightweight Frontend Intent Classifier
 * Categorizes queries into 'conversational' or 'informational' to drive layout logic.
 * NEW: Detects specific overview intents for high-fidelity card stacks.
 */

type IntentCategory = 'conversational' | 'informational';
export type OverviewType = 'college' | 'dept' | 'hod' | 'trustees' | null;

const INTENT_GROUPS: Record<string, { conversational: string[], about_college: string[], informational: string[] }> = {
    en: {
        conversational: [
            'how are you', 'who are you', 'what is your name', 'tell me about clara',
            'who is the principal', 'principal name', 'who is principal',
            'hello', 'hi', 'good morning', 'good evening', 'thank you', 'thanks'
        ],
        about_college: [
            'tell me about the college', 'about the college', 'college overview',
            'information about the college', 'describe the college', 'about college',
            'overview of institution', 'history of college', 'college description',
            'institutional description', 'tell me about svit', 'about svit'
        ],
        informational: [
            'college', 'courses', 'available', 'admission', 'fee', 'tuition', 'placement',
            'department', 'engineering', 'where is', 'direction', 'building', 'campus',
            'facilities', 'hostel', 'library', 'lab', 'canteen', 'office', 'hod', 'trustee', 'management'
        ]
    },
    // ... other languages truncated for brevity in this scratch, but kept in final
};

/**
 * Normalizes text for better intent matching
 */
function normalizeText(text: string): string {
    return text
        .normalize('NFC')
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

export function detectOverviewType(text: string): OverviewType {
    const n = normalizeText(text);
    
    // Trustees
    if (n.includes('trustee') || n.includes('management') || n.includes('board') || n.includes('holla')) return 'trustees';
    
    // HOD
    if (n.includes('hod') || n.includes('head of department') || n.includes('who lead') || n.includes('shashikumar')) return 'hod';
    
    // Dept
    if (n.includes('department') || n.includes('dept') || n.includes('cse') || n.includes('ise') || n.includes('ece')) return 'dept';
    
    // College
    if (n.includes('college') || n.includes('institution') || n.includes('svit') || n.includes('about the')) return 'college';
    
    return null;
}

export function getMessageIntent(text: string): IntentCategory {
    const normalized = normalizeText(text);
    if (!normalized) return 'conversational';
    
    if (detectOverviewType(text)) return 'informational';

    // Fallback search
    const infoKeywords = ['fee', 'admission', 'placement', 'course', 'where is', 'address', 'location'];
    if (infoKeywords.some(k => normalized.includes(k))) return 'informational';

    return 'conversational';
}

export function isAboutCollegeIntent(text: string): boolean {
    return !!detectOverviewType(text);
}
