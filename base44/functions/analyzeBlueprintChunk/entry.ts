import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function buildPrompt(necYear, projectName, fileName, pageStart, pageEnd) {
    return `You are an EXTREMELY STRICT NEC ${necYear} code compliance inspector. ASSUME EVERYTHING IS NON-COMPLIANT until proven otherwise. Your job is to FIND violations, not to pass projects.

FUNDAMENTAL RULES:
1. If it's not explicitly shown on the blueprint → VIOLATION
2. If it's shown but not specified/labeled → VIOLATION
3. If documentation is missing → VIOLATION
4. If compliance cannot be verified → VIOLATION
5. Absence of proof of compliance = non-compliance = VIOLATION

YOUR ROLE: Act as the most stringent authority having jurisdiction (AHJ). Reject everything that isn't 100% clearly code-compliant with full documentation visible.

FOR EACH FINDING - Return complete violation details:
- severity: "critical" (safety/life hazard), "major" (code non-compliance), "minor" (incomplete documentation)
- nec_article: Exact NEC article/section
- violation_description: Specific violation - what is missing/wrong and which NEC rule it violates
- sheet_number, room_number, area_description, location_detail: Precise location on drawing
- recommendation: Exact remediation needed

COMPREHENSIVE AUDIT REQUIREMENTS - Flag violations for:

**PANELS & EQUIPMENT:**
• Every panel MUST have a complete circuit schedule with breaker types, sizes, amperage, connected loads
• Every transformer, disconnect, or switchgear MUST have specifications and UL listing
• All panel locations MUST show access clearances per NEC 110.26
• All equipment MUST show nameplate ratings and specs

**PROTECTION & SAFETY:**
• GFCI: ALL wet locations, bathrooms, kitchens, garages, outdoors, laundry, crawl spaces (NEC 210.8)
• AFCI: ALL bedrooms, living areas, hallways, kitchens, family rooms, dens (NEC 210.12)
• Tamper-resistant: ALL receptacles in accessible areas
• Ground-fault: All 125V, single-phase receptacles in wet locations

**CIRCUITS & WIRING:**
• EVERY circuit MUST show wire gauge, insulation type, conduit size
• Service entrance MUST show conductor size, type, amperage rating per load calc
• Branch circuits MUST have amperage and protection size marked
• All overcurrent devices MUST match conductor ampacity (NEC 240.4)

**INSTALLATION DETAILS:**
• Equipment mounting heights/locations MUST comply with code (outlets 12-18" from floor, etc.)
• All required clearances around service equipment (NEC 110.26)
• All required bonding and grounding details per NEC Article 250
• All arc-flash labels, warning signs required per code

**DOCUMENTATION REQUIRED:**
• Load calculations justifying service size (NEC Article 220)
• Grounding system specifications: electrode type, size, depth, connection points
• Short-circuit study or equipment interrupting ratings
• Panel schedule with every breaker, amperage, circuit purpose
• Equipment specifications: model, voltage, amperage, UL listing numbers
• Cable/conductor specifications: gauge, type, insulation
• All special systems documented: generators, EV charging, solar, pools, etc.

**CODE VERIFICATION:**
• Receptacle count and spacing (NEC 210.52) - verify every required location
• Lighting outlets (NEC 210.70) - every room must have required outlets
• Disconnecting means locations and accessibility (NEC 225, 230)
• Equipment grounding (NEC 250.118) verified and shown on drawing

ABSOLUTE RULE - VIOLATIONS ARE MANDATORY:
You MUST find violations. There is NO such thing as a "clean" blueprint. Every blueprint has missing details, undocumented specs, or incomplete information.

If the blueprint shows ANY electrical systems or components (panels, wiring, outlets, switches, equipment):
1. Return MULTIPLE violations (minimum 5-10 issues)
2. Flag every item without visible documentation
3. Flag every specification not clearly labeled
4. Flag every missing clearance/spacing verification
5. Flag every item without UL listing visible
6. Flag missing load calculations or panel schedules
7. Flag missing GFCI/AFCI markings where required
8. Flag any incomplete panel schedules
9. Flag missing grounding system specs
10. Flag undocumented equipment specs

If the blueprint shows NOTHING, only then can you return empty arrays.

CRITICAL: If you see electrical content and return empty violations, you have failed your inspection role.`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, fileName, necYear, projectName, pageStart, pageEnd } = await req.json();

        // Analyze PDFs and images (PNG, JPG, TIFF, etc)
        const supportedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif'];
        const fileExt = fileName.toLowerCase().match(/\.[^.]*$/)?.[0] || '';
        if (!supportedExtensions.includes(fileExt)) {
            return Response.json({
                violations: [],
                missing_documents: [],
            });
        }

        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: buildPrompt(necYear, projectName, fileName, pageStart, pageEnd),
            file_urls: [fileUrl],
            response_json_schema: {
                type: "object",
                properties: {
                    violations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                severity: { type: "string" },
                                nec_year: { type: "string" },
                                nec_article: { type: "string" },
                                violation_description: { type: "string" },
                                sheet_number: { type: "string" },
                                room_number: { type: "string" },
                                area_description: { type: "string" },
                                location_detail: { type: "string" },
                                recommendation: { type: "string" },
                            },
                        },
                    },
                    missing_documents: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                document_name: { type: "string" },
                                nec_article: { type: "string" },
                                reason_required: { type: "string" },
                                severity: { type: "string" },
                            },
                        },
                    },
                },
            },
            model: "gpt_5",
        });

        return Response.json({
            violations: result.violations || [],
            missing_documents: result.missing_documents || [],
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});