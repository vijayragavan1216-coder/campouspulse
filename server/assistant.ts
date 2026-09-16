import { GoogleGenAI } from '@google/genai';
import { AuthUser } from './auth.js';
import { queryAll } from './db.js';
import { AssistantDraft } from '../src/types.js';

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export interface AssistantResponse {
  reply: string;
  draft?: AssistantDraft;
  suggestedActions?: string[];
  safetyNotice?: string;
}

export async function processAssistantQuery(
  prompt: string,
  user: AuthUser,
  history: { role: 'user' | 'assistant'; text: string }[] = []
): Promise<AssistantResponse> {
  const safetyDisclaimer =
    'Note: As Pulse Assistant, I can draft suggestions, explain policies, and check your requests. I will never automatically submit or modify requests on your behalf; you can review and submit the drafted details.';

  // Gather authorized context
  // Visible requests for user
  let visibleRequestsSummary = '';
  try {
    let requests: any[] = [];
    if (['Administrator', 'Super Administrator', 'Principal', 'Vice Principal'].includes(user.role)) {
      requests = await queryAll(`SELECT request_id, title, category, department, priority, status, sla_deadline, is_overdue FROM service_requests ORDER BY id DESC LIMIT 5`);
    } else if (user.role === 'Department Head') {
      requests = await queryAll(`SELECT request_id, title, category, department, priority, status, sla_deadline, is_overdue FROM service_requests WHERE department = ? ORDER BY id DESC LIMIT 5`, [user.department]);
    } else if (user.role === 'Maintenance Staff') {
      requests = await queryAll(`SELECT request_id, title, category, department, priority, status, sla_deadline, is_overdue FROM service_requests WHERE assigned_staff_id = ? ORDER BY id DESC LIMIT 5`, [user.id]);
    } else {
      requests = await queryAll(`SELECT request_id, title, category, department, priority, status, sla_deadline, is_overdue FROM service_requests WHERE submitted_by = ? ORDER BY id DESC LIMIT 5`, [user.id]);
    }
    visibleRequestsSummary = requests.map(r => `• [${r.request_id}] ${r.title} (${r.category} | ${r.status} | Priority: ${r.priority} | Due: ${r.sla_deadline})`).join('\n');
  } catch (err) {
    visibleRequestsSummary = 'No recent records found.';
  }

  const ai = getGeminiClient();

  if (ai) {
    try {
      const systemInstruction = `
You are Pulse Assistant, the official AI operational assistant for CampusPulse (Real-Time Student Service Management System).
The user interacting with you is: ${user.name}, Role: ${user.role}, Department: ${user.department}.

Visible Requests Authorized for this user:
${visibleRequestsSummary || 'No recent requests.'}

STRICT SAFETY MANDATES:
1. You can explain how to submit service requests, clarify SLA deadlines, explain status meanings, suggest titles and categories, and draft descriptions.
2. You MUST NOT automatically submit requests or claim you submitted a request.
3. You MUST NOT change request status or assign staff.
4. You MUST NOT expose private passwords, system secrets, or records outside the user's role authorization.
5. You MUST NOT pretend to be a human administrator.
6. If the user is describing a problem or asking for help filing a complaint, formulate a helpful draft object in JSON at the very end wrapped in:
<<<DRAFT:{"title":"...","description":"...","category":"...","department":"...","campusLocation":"...","building":"...","roomNumber":"...","priority":"..."}>>>
Where category is one of: Electrical, Plumbing, Internet, Cleanliness, Hostel, Classroom, Security, Transport, Furniture, Laboratory, Library, Medical, Cafeteria, Other.
Priority is one of: Low, Medium, High, Emergency.
Ensure the description is at least 15 characters and title is at least 5 characters.
`;

      // Use standard Gemini 2.5 Flash with 5-second timeout guard
      const generatePromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 5000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const fullText = response.text || '';
      let reply = fullText;
      let draft: AssistantDraft | undefined = undefined;

      const draftMatch = fullText.match(/<<<DRAFT:(.*?)>>>/s);
      if (draftMatch) {
        try {
          draft = JSON.parse(draftMatch[1]);
          reply = fullText.replace(/<<<DRAFT:(.*?)>>>/s, '').trim();
        } catch (e) {
          // ignore parse failure
        }
      }

      return {
        reply,
        draft,
        suggestedActions: ['Submit New Request', 'View My Requests', 'Check SLA Policies'],
        safetyNotice: safetyDisclaimer,
      };
    } catch (err) {
      console.warn('Gemini API call failed, using intelligent fallback rules:', err);
      // Fall through to fallback engine
    }
  }

  // Fallback Rule-Based Campus Engine
  return fallbackAssistantResponse(prompt, user, visibleRequestsSummary, safetyDisclaimer);
}

function fallbackAssistantResponse(
  prompt: string,
  user: AuthUser,
  visibleRequests: string,
  safetyDisclaimer: string
): AssistantResponse {
  const lower = prompt.toLowerCase();

  // 1. Check for request filing / drafting intent
  if (
    lower.includes('wifi') ||
    lower.includes('wi-fi') ||
    lower.includes('internet') ||
    lower.includes('leak') ||
    lower.includes('pipe') ||
    lower.includes('water') ||
    lower.includes('light') ||
    lower.includes('projector') ||
    lower.includes('power') ||
    lower.includes('broken') ||
    lower.includes('clean') ||
    lower.includes('ac') ||
    lower.includes('air conditioner') ||
    lower.includes('draft') ||
    lower.includes('submit') ||
    lower.includes('complaint')
  ) {
    let category = 'Other';
    let department = 'Facilities & Maintenance';
    let priority: 'Low' | 'Medium' | 'High' | 'Emergency' = 'Medium';
    let title = 'Campus Facility Issue Report';
    let desc = 'Issue reported regarding campus infrastructure requiring inspection and repair.';

    if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet')) {
      category = 'Internet';
      department = 'Information Technology';
      priority = 'High';
      title = 'Campus Wi-Fi Connectivity Disruption';
      desc = 'Experiencing persistent wireless network connection drops and latency in campus block.';
    } else if (lower.includes('leak') || lower.includes('water') || lower.includes('plumbing') || lower.includes('pipe')) {
      category = 'Plumbing';
      department = 'Facilities & Maintenance';
      priority = 'High';
      title = 'Washroom Plumbing Leak & Water Accumulation';
      desc = 'Water leaking steadily from plumbing fixture resulting in slippery surface and utility waste.';
    } else if (lower.includes('projector') || lower.includes('smartboard') || lower.includes('classroom')) {
      category = 'Classroom';
      department = 'Facilities & Maintenance';
      priority = 'Medium';
      title = 'Classroom Multimedia Projector Malfunction';
      desc = 'Classroom display unit fails to power on consistently, impacting scheduled lectures.';
    } else if (lower.includes('power') || lower.includes('light') || lower.includes('electrical')) {
      category = 'Electrical';
      department = 'Facilities & Maintenance';
      priority = 'High';
      title = 'Electrical Power Outlet & Lighting Failure';
      desc = 'Power fixture and overhead lighting inoperable, requiring electrical safety inspection.';
    } else if (lower.includes('clean') || lower.includes('trash') || lower.includes('garbage')) {
      category = 'Cleanliness';
      department = 'Facilities & Maintenance';
      priority = 'Medium';
      title = 'Corridor and Common Area Sanitation Request';
      desc = 'Disposal bins and floor area require thorough cleaning and hygiene replenishment.';
    }

    return {
      reply: `I have analyzed your inquiry and drafted a structured service request for you.\n\n• **Suggested Title**: ${title}\n• **Category**: ${category} (${department})\n• **Recommended Priority**: ${priority}\n• **Drafted Description**: "${desc}"\n\nYou can review these details and click **Transfer Draft to Form** to submit when you are ready.`,
      draft: {
        title,
        description: desc,
        category,
        department,
        campusLocation: 'Main Campus',
        building: user.hostel || 'Central Academic Complex',
        roomNumber: 'Room 101',
        priority,
      },
      suggestedActions: ['Transfer Draft to Form', 'Check Category SLA', 'View My Requests'],
      safetyNotice: safetyDisclaimer,
    };
  }

  // 2. Status inquiries
  if (lower.includes('status') || lower.includes('meaning') || lower.includes('under review')) {
    return {
      reply: `Here is a guide to CampusPulse service request statuses:\n\n1. **Submitted**: Request has been logged and queued for departmental triage.\n2. **Under Review**: Department Coordinator or Administrator is assessing required resources.\n3. **Assigned**: Dispatched to a qualified Maintenance or IT technician.\n4. **In Progress**: Technician is currently working on site to resolve the issue.\n5. **Resolved**: Work is completed and evidence or resolution notes have been recorded.\n6. **Closed**: Verified by the reporting user or department.\n7. **Rejected**: Non-compliant or duplicate request, accompanied by explanatory notes.`,
      suggestedActions: ['View My Requests', 'Submit New Request'],
      safetyNotice: safetyDisclaimer,
    };
  }

  // 3. SLA inquiries
  if (lower.includes('sla') || lower.includes('deadline') || lower.includes('hours') || lower.includes('overdue')) {
    return {
      reply: `CampusPulse Service Level Agreement (SLA) Targets:\n\n• **Medical**: 2 Hours (Targeted Triage)\n• **Security**: 4 Hours (Perimeter & Access Control)\n• **Cleanliness**: 6 Hours (Washroom & Common Grounds)\n• **Internet / Wi-Fi**: 8 Hours (Campus IT Networks)\n• **Classroom / Lab**: 8-12 Hours\n• **Electrical & Plumbing**: 12 Hours\n• **Hostel / Housing**: 12 Hours\n• **General & Transport**: 24 Hours\n\n*Note: High and Emergency priorities accelerate these deadlines.*`,
      suggestedActions: ['Submit New Request', 'SLA Policy Details'],
      safetyNotice: safetyDisclaimer,
    };
  }

  // 4. Request summary
  if (lower.includes('my request') || lower.includes('review') || lower.includes('track')) {
    return {
      reply: `Here are the latest active requests visible in your queue:\n\n${visibleRequests || 'You have no open requests right now.'}\n\nYou can click on any request in your Service Request list for complete history, attachments, and real-time updates.`,
      suggestedActions: ['View Service Request List', 'Submit Service Request'],
      safetyNotice: safetyDisclaimer,
    };
  }

  // Default guidance
  return {
    reply: `Hello ${user.name}! I am **Pulse Assistant**, here to assist you with CampusPulse services.\n\nI can assist you with:\n• **Drafting Service Requests**: Describe any issue (e.g. "Wi-Fi not working in Hostel Block B") and I'll generate a complete draft for you to review.\n• **Explaining SLA Deadlines**: Check how quickly your department is expected to respond.\n• **Status Explanations**: Understand what your ticket status means.\n• **Queue Tracking**: Summarize recent requests assigned to or submitted by you.\n\nHow can I help you today?`,
    suggestedActions: ['Draft a Wi-Fi Request', 'Draft a Plumbing Request', 'What are SLA targets?'],
    safetyNotice: safetyDisclaimer,
  };
}
