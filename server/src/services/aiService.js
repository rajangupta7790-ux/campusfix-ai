import { Complaint } from '../models/Complaint.js';
import { AppError } from '../utils/AppError.js';
import { AiError } from '../utils/AiError.js';
import { env } from '../config/env.js';
import { analyzeComplaintText } from './geminiService.js';
import { loadDetail } from './complaintService.js';

// Safe, generic messages. The raw error text is never stored.
const SAFE_MESSAGES = {
  TIMEOUT: 'AI request timed out',
  QUOTA: 'AI quota or rate limit reached',
  AUTH: 'AI credentials were rejected',
  UNAVAILABLE: 'AI service is unavailable',
  NETWORK: 'Could not reach the AI service',
  NOT_CONFIGURED: 'AI is not configured',
  EMPTY_RESPONSE: 'AI returned an empty answer',
  INVALID_OUTPUT: 'AI returned an unusable answer',
  BAD_REQUEST: 'AI request was rejected',
};

// Complaints being analyzed right now, so one complaint is never sent twice at once
const inFlight = new Set();

// Returns: 'success' | 'failed' | 'busy' | 'missing' | 'stale'
export async function analyzeAndStore(complaintId) {
  const id = String(complaintId);
  if (inFlight.has(id)) return 'busy';
  inFlight.add(id);

  try {
    const complaint = await Complaint.findById(id).select('title description').lean();
    if (!complaint) return 'missing';

    let update;
    let outcome;
    try {
      const r = await analyzeComplaintText({
        title: complaint.title,
        description: complaint.description,
      });
      update = {
        $set: {
          'ai.status': 'success',
          'ai.category': r.category,
          'ai.priority': r.priority,
          'ai.summary': r.summary,
          'ai.generatedAt': new Date(),
        },
        $unset: { 'ai.errorMessage': '' },
      };
      outcome = 'success';
    } catch (err) {
      const code = err instanceof AiError ? err.code : 'UNKNOWN';
      console.warn(`[ai] analysis failed for complaint ${id}: ${code}`); // no text, no key
      update = {
        $set: {
          'ai.status': 'failed',
          'ai.errorMessage': SAFE_MESSAGES[code] ?? 'AI analysis failed',
          'ai.generatedAt': new Date(),
        },
        $unset: { 'ai.category': '', 'ai.priority': '', 'ai.summary': '' },
      };
      outcome = 'failed';
    }

    // Only save if the text is still the text we analyzed (the student may have edited it)
    const res = await Complaint.updateOne(
      { _id: id, title: complaint.title, description: complaint.description },
      update
    );
    return res.matchedCount === 0 ? 'stale' : outcome;
  } catch (err) {
    console.error(`[ai] could not store analysis for complaint ${id}: ${err.name}`);
    return 'failed';
  } finally {
    inFlight.delete(id);
  }
}

// Admin button: try again after a failure
export async function retryAnalysis(id) {
  if (!env.AI_ENABLED) {
    throw new AppError(503, 'AI_DISABLED', 'AI analysis is turned off');
  }

  const complaint = await Complaint.findById(id).select('ai.status');
  if (!complaint) throw new AppError(404, 'NOT_FOUND', 'Complaint not found');
  if (complaint.ai?.status === 'success') {
    throw new AppError(409, 'AI_ALREADY_DONE', 'This complaint already has an AI suggestion');
  }

  const outcome = await analyzeAndStore(id);
  if (outcome === 'busy') {
    throw new AppError(409, 'AI_BUSY', 'AI analysis is already running for this complaint');
  }
  if (outcome === 'missing') throw new AppError(404, 'NOT_FOUND', 'Complaint not found');

  return loadDetail(id);
}