import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const expectedSecret = Deno.env.get('USER_CREATED_WEBHOOK_SECRET');
    if (!expectedSecret || body?.function_args?.secret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = body;

    if (event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const userId = event?.entity_id;
    if (!userId) {
      return Response.json({ error: 'No entity_id in event' }, { status: 400 });
    }

    // Only set trial dates if not already set
    if (data?.trial_start_date) {
      return Response.json({ ok: true, skipped: 'already has trial dates' });
    }

    const today = new Date();
    const trialStart = today.toISOString().split('T')[0];
    const trialEndDate = new Date(today);
    trialEndDate.setDate(trialEndDate.getDate() + 30);
    const trialEnd = trialEndDate.toISOString().split('T')[0];

    await base44.asServiceRole.entities.User.update(userId, {
      trial_start_date: trialStart,
      trial_end_date: trialEnd,
      access_status: 'trial',
    });

    return Response.json({ ok: true, trial_start_date: trialStart, trial_end_date: trialEnd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});