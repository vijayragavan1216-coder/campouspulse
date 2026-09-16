import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { processAssistantQuery } from '../assistant.js';

const router = Router();

// POST /api/assistant/chat
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const userPrompt = (req.body.prompt || req.body.message || '') as string;

    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      res.status(400).json({ error: 'Please enter a message for Pulse Assistant.' });
      return;
    }

    const response = await processAssistantQuery(userPrompt.trim(), user, req.body.history || []);
    res.status(200).json(response);
  } catch (err: any) {
    console.error('Pulse Assistant error:', err);
    res.status(200).json({
      reply: 'Pulse Assistant is temporarily operating in local safety mode. How can I help you draft or check campus service requests today?',
      safetyNotice: 'Operating in safety mode. As an AI assistant, I never automatically submit or modify requests on your behalf.',
      suggestedActions: ['Draft a Request', 'Check SLA Policies', 'View My Requests'],
    });
  }
});

export default router;
