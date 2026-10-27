/**
 * Text formatting utilities for CBT CERIA
 * Preserves paragraphs, line breaks (\n <-> <br>), and handles overflow wrapping.
 */

import { convertLatexToStandardMath } from './mathFormatter';

/**
 * Converts all line breaks (\r\n or \n) into <br> tags before saving to Firestore.
 * Preserves consecutive enters (empty lines) as multiple <br> tags for paragraph spacing.
 */
export function convertNewlinesToBreakTags(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  // Normalize Windows \r\n to \n
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Convert \n to <br>
  return normalized.replace(/\n/g, '<br>');
}

/**
 * Converts <br> or <br/> or <br /> tags back to standard \n newlines
 * for editing inside <textarea> elements.
 */
export function convertBreakTagsToNewlines(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<br\s*\/?>/gi, '\n');
}

/**
 * Prepares question/statement text for rendering on screen:
 * - Converts <br> tags into \n so that CSS `white-space: pre-wrap;` renders them as visual line breaks
 * - Converts any legacy LaTeX formulas to standard math format
 */
export function formatQuestionDisplay(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  // Standardize <br> tags to \n for white-space: pre-wrap
  const withNewlines = convertBreakTagsToNewlines(text);
  // Apply standard math formatter
  return convertLatexToStandardMath(withNewlines);
}

/**
 * Helper to insert formatting tags or text at cursor position in a HTMLTextAreaElement
 */
export function insertTextAtCursor(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after: string = ''
): { newText: string; selectionStart: number; selectionEnd: number } | null {
  if (!textarea) return null;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  const replacement = before + selectedText + after;
  const newText = text.substring(0, start) + replacement + text.substring(end);

  const newCursorPos = selectedText.length > 0
    ? start + replacement.length
    : start + before.length;

  return {
    newText,
    selectionStart: newCursorPos,
    selectionEnd: newCursorPos,
  };
}
