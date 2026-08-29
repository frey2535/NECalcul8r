import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { analysisId, allViolations, allMissingDocs, necYear, projectName } = await req.json();

        // Verify the caller owns this analysis record before allowing any update
        const existingAnalysis = await base44.asServiceRole.entities.Analysis.get(analysisId);
        if (!existingAnalysis || existingAnalysis.created_by_id !== user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Deduplicate missing docs by document_name
        const seenDocs = new Set();
        const uniqueMissingDocs = allMissingDocs.filter(d => {
            if (seenDocs.has(d.document_name)) return false;
            seenDocs.add(d.document_name);
            return true;
        });

        // Add unique IDs to violations
        const violationsWithIds = allViolations.map((v, i) => ({
            ...v,
            id: v.id || `V-${String(i + 1).padStart(3, '0')}`,
            nec_year: v.nec_year || necYear,
        }));

        // Generate summary via LLM
        const criticalCount = violationsWithIds.filter(v => v.severity === 'critical').length;
        const majorCount = violationsWithIds.filter(v => v.severity === 'major').length;
        const minorCount = violationsWithIds.filter(v => v.severity === 'minor').length;

        const summaryPrompt = `You are an NEC code expert. Write a professional executive summary for an electrical blueprint code review.

Project: ${projectName}
NEC Year: ${necYear}
Total Violations: ${violationsWithIds.length} (${criticalCount} critical, ${majorCount} major, ${minorCount} minor)
Missing Documents: ${uniqueMissingDocs.length}

Top violations found:
${violationsWithIds.slice(0, 10).map(v => `- [${v.severity?.toUpperCase()}] NEC ${v.nec_article}: ${v.violation_description}`).join('\n')}

Write a concise 3-4 sentence professional summary of the overall compliance status, the most significant issues found, and the general corrective action needed. Be direct and professional.`;

        const summaryResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: summaryPrompt,
        });

        // Update the analysis record
        await base44.asServiceRole.entities.Analysis.update(analysisId, {
            status: 'completed',
            violations: violationsWithIds,
            missing_documents: uniqueMissingDocs,
            total_violations: violationsWithIds.length,
            total_missing_docs: uniqueMissingDocs.length,
            summary: summaryResult || '',
        });

        return Response.json({
            success: true,
            total_violations: violationsWithIds.length,
            total_missing_docs: uniqueMissingDocs.length,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});