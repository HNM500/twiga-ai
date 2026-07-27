export type CompanionSearchMode = 'web' | 'chat';

export interface CompanionRouteDecision {
  mode: CompanionSearchMode;
  reason:
    | 'explicit-no-web'
    | 'explicit-web-request'
    | 'time-sensitive'
    | 'verification-needed'
    | 'local-discovery'
    | 'high-stakes-current-guidance'
    | 'conversation-or-creation';
}

export type CompanionModelTier = 'standard' | 'reasoning';

export interface CompanionModelDecision {
  tier: CompanionModelTier;
  reason: 'explicit-deep-reasoning' | 'comparative-decision' | 'complex-planning' | 'standard';
}

const NO_WEB_PATTERN =
  /\b(?:do not|don't|dont|without|no)\s+(?:browse|browsing|search|searching|web|internet)\b|\b(?:usitafute|bila kutafuta|bila intaneti)\b/i;

const EXPLICIT_WEB_PATTERN =
  /\b(?:search|browse|look\s*up|google|find sources?|cite sources?|with citations?|verify online|check online|fact[- ]?check)\b|\b(?:tafuta|vinjari|vyanzo|thibitisha mtandaoni|angalia mtandaoni)\b/i;

const TIME_SENSITIVE_PATTERN =
  /\b(?:today|tonight|tomorrow|yesterday|this (?:week|month|year)|latest|newest|recent|recently|current(?:ly)?|now|live|upcoming|breaking|as of|weather|forecast|news|headline|score|fixture|schedule|result|traffic|exchange rate|price|cost|opening hours?|deadline|availability|in stock|president|prime minister|minister|ceo)\b|\b(?:leo|kesho|jana|wiki hii|mwezi huu|mwaka huu|hivi sasa|sasa|karibuni|habari (?:kuu|za)|hali ya hewa|utabiri|bei|gharama|ratiba|matokeo|aliyepo|inayokuja)\b/i;

const VERIFICATION_PATTERN =
  /\b(?:is (?:this|that|it) true|is .* (?:real|legitimate|authentic|official)|confirm|verify|evidence|source|citation|according to|reported that|government notice|press release)\b|\b(?:ni kweli|halali|thibitisha|ushahidi|chanzo|taarifa ya serikali)\b/i;

const LOCAL_DISCOVERY_PATTERN =
  /\b(?:find|recommend|best|nearest|near me|nearby|where (?:can|should|do) i|business(?:es)?|restaurant(?:s)?|hotel(?:s)?|clinic(?:s)?|shop(?:s)?|accountant(?:s)?|lawyer(?:s)?)\b.{0,80}\b(?:in|near|around|dar es salaam|dodoma|arusha|mwanza|zanzibar|tanzania)\b|\b(?:wapi|karibu nami|pendekeza|biashara|mgahawa|hoteli|kliniki|duka)\b/i;

const TRAVEL_RESEARCH_PATTERN =
  /\b(?:plan|itinerary|panga)\b.{0,50}\b(?:trip|travel|visit|safari|ziara)\b.{0,100}\b(?:dar es salaam|dodoma|arusha|mwanza|zanzibar|tanzania)\b/i;

const HIGH_STAKES_CURRENT_PATTERN =
  /\b(?:law|legal|regulation|licen[cs]e|permit|visa|passport|tax|tra|brela|immigration|medicine|medical|symptom|treatment|loan|interest rate|investment|insurance|government requirement|eligibility)\b|\b(?:sheria|kanuni|leseni|kibali|viza|pasipoti|kodi|dawa|matibabu|dalili|mkopo|riba|uwekezaji|bima|serikali)\b/i;

const EXPLICIT_DEEP_REASONING_PATTERN =
  /\b(?:think deeply|reason carefully|deep analysis|analys[ei] in depth|thorough analysis|work through the reasoning|chambua kwa kina|fikiria kwa kina|toa uchambuzi wa kina)\b/i;

const COMPARATIVE_DECISION_PATTERN =
  /\b(?:compare|evaluate|assess|weigh|contrast|linganisha|tathmini|pima)\b[\s\S]{0,160}\b(?:trade[- ]?offs?|pros and cons|advantages and disadvantages|options|alternatives|strategy|decision|faida na hasara|chaguo|mikakati?|uamuzi)\b|\b(?:trade[- ]?offs?|pros and cons|faida na hasara)\b[\s\S]{0,160}\b(?:compare|evaluate|assess|weigh|linganisha|tathmini|pima)\b/i;

const COMPLEX_PLANNING_PATTERN =
  /\b(?:business plan|financial model|go-to-market|market-entry strategy|decision framework|risk analysis|root cause analysis|scenario analysis|mpango wa biashara|mkakati wa kuingia sokoni|mfumo wa maamuzi|uchambuzi wa hatari|uchambuzi wa chanzo)\b/i;

/**
 * Selects whether Twiga should answer directly or use web search.
 *
 * This router is intentionally deterministic: it adds no model cost, makes the
 * result easy to test, and keeps explicit user overrides authoritative.
 */
export function routeCompanionRequest(query: string): CompanionRouteDecision {
  const normalized = query.trim();

  if (NO_WEB_PATTERN.test(normalized)) {
    return { mode: 'chat', reason: 'explicit-no-web' };
  }

  if (EXPLICIT_WEB_PATTERN.test(normalized)) {
    return { mode: 'web', reason: 'explicit-web-request' };
  }

  if (TIME_SENSITIVE_PATTERN.test(normalized)) {
    return { mode: 'web', reason: 'time-sensitive' };
  }

  if (VERIFICATION_PATTERN.test(normalized)) {
    return { mode: 'web', reason: 'verification-needed' };
  }

  if (LOCAL_DISCOVERY_PATTERN.test(normalized) || TRAVEL_RESEARCH_PATTERN.test(normalized)) {
    return { mode: 'web', reason: 'local-discovery' };
  }

  if (HIGH_STAKES_CURRENT_PATTERN.test(normalized)) {
    return { mode: 'web', reason: 'high-stakes-current-guidance' };
  }

  return { mode: 'chat', reason: 'conversation-or-creation' };
}

/**
 * Escalates only clearly complex requests to Twiga's slower reasoning model.
 * Ordinary conversation, search synthesis and simple planning stay on the
 * value model so latency and cost remain predictable.
 */
export function routeCompanionModel(query: string): CompanionModelDecision {
  const normalized = query.trim();

  if (EXPLICIT_DEEP_REASONING_PATTERN.test(normalized)) {
    return { tier: 'reasoning', reason: 'explicit-deep-reasoning' };
  }

  if (COMPARATIVE_DECISION_PATTERN.test(normalized)) {
    return { tier: 'reasoning', reason: 'comparative-decision' };
  }

  if (COMPLEX_PLANNING_PATTERN.test(normalized)) {
    return { tier: 'reasoning', reason: 'complex-planning' };
  }

  return { tier: 'standard', reason: 'standard' };
}

export function getLatestUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return '';

  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex] as { role?: unknown; parts?: unknown };
    if (message?.role !== 'user' || !Array.isArray(message.parts)) continue;

    const text = message.parts
      .filter(
        (part): part is { type: 'text'; text: string } =>
          typeof part === 'object' &&
          part !== null &&
          (part as { type?: unknown }).type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string',
      )
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (text) return text;
  }

  return '';
}
