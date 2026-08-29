import { ARTICLE_VERIFICATION_SEED } from "@/data/seedArticleVerifications";
import { CALCULATORS } from "@/data/nec/audit";
import { localEntities } from "./localEntities";
import { localIntegrations } from "./localIntegrations";
import { requireAdmin, requireUser } from "./localAuth";
import { newId } from "./localDb";

function wrapData(result) {
  return { data: result };
}

async function startAnalysis({ projectName, necYear, fileUrls, fileNames }) {
  const { user } = requireUser();
  const analysis = await localEntities.Analysis.create({
    project_name: projectName,
    nec_year: necYear,
    status: "analyzing",
    file_urls: fileUrls,
    file_names: fileNames,
    violations: [],
    missing_documents: [],
    total_violations: 0,
    total_missing_docs: 0,
  });

  queueMicrotask(() => {
    processAnalysis(analysis.id, projectName, necYear, fileUrls, fileNames, user.id).catch(async () => {
      await localEntities.Analysis.update(analysis.id, { status: "error" });
    });
  });

  return { analysisId: analysis.id };
}

async function processAnalysis(analysisId, projectName, necYear, fileUrls, fileNames, userId) {
  const allViolations = [];
  const allMissingDocs = [];

  for (let i = 0; i < (fileUrls || []).length; i++) {
    const fileUrl = fileUrls[i];
    const fileName = fileNames[i];
    try {
      const result = await analyzeBlueprintChunk({
        fileUrl,
        fileName,
        necYear,
        projectName,
      });
      if (result.violations) allViolations.push(...result.violations);
      if (result.missing_documents) allMissingDocs.push(...result.missing_documents);
      await localEntities.Analysis.update(analysisId, {
        violations: allViolations,
        missing_documents: allMissingDocs,
        total_violations: allViolations.length,
        total_missing_docs: allMissingDocs.length,
      });
    } catch (error) {
      console.error(`Failed to analyze ${fileName}:`, error.message);
    }
  }

  await consolidateAnalysis({
    analysisId,
    allViolations,
    allMissingDocs,
    necYear,
    projectName,
    userId,
  });
}

async function analyzeBlueprintChunk({ fileUrl, fileName, necYear, projectName, pageStart, pageEnd }) {
  const prompt = `You are an EXTREMELY STRICT NEC ${necYear} code compliance inspector. ASSUME EVERYTHING IS NON-COMPLIANT until proven otherwise.

Project: ${projectName}
File: ${fileName}
Pages: ${pageStart || 1}-${pageEnd || 1}

Return JSON with keys violations and missing_documents. Each violation needs severity, nec_article, violation_description, sheet_number, room_number, area_description, location_detail, recommendation.`;

  try {
    const result = await localIntegrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          violations: { type: "array" },
          missing_documents: { type: "array" },
        },
      },
    });
    return {
      violations: result.violations || [],
      missing_documents: result.missing_documents || [],
    };
  } catch {
    return {
      violations: [
        {
          id: newId("v"),
          severity: "major",
          nec_year: necYear,
          nec_article: "110.3",
          violation_description: `AI analysis is not configured, so ${fileName} could not be inspected automatically. Add VITE_OPENAI_API_KEY to enable blueprint review.`,
          sheet_number: "—",
          room_number: "—",
          area_description: "Entire set",
          location_detail: "Local self-hosted app",
          recommendation: "Configure an OpenAI API key, or review the drawings manually against NEC requirements.",
        },
      ],
      missing_documents: [
        {
          document_name: "Automated AI review",
          nec_article: "N/A",
          reason_required: "No LLM key is configured in this self-hosted copy.",
          severity: "minor",
        },
      ],
    };
  }
}

async function consolidateAnalysis({ analysisId, allViolations, allMissingDocs, necYear, projectName }) {
  const seenDocs = new Set();
  const uniqueMissingDocs = (allMissingDocs || []).filter((d) => {
    if (seenDocs.has(d.document_name)) return false;
    seenDocs.add(d.document_name);
    return true;
  });
  const violationsWithIds = (allViolations || []).map((v, i) => ({
    ...v,
    id: v.id || `V-${String(i + 1).padStart(3, "0")}`,
    nec_year: v.nec_year || necYear,
  }));
  const criticalCount = violationsWithIds.filter((v) => v.severity === "critical").length;
  const majorCount = violationsWithIds.filter((v) => v.severity === "major").length;
  const minorCount = violationsWithIds.filter((v) => v.severity === "minor").length;

  let summary = `${projectName} was reviewed against NEC ${necYear}. ${violationsWithIds.length} potential issues were flagged (${criticalCount} critical, ${majorCount} major, ${minorCount} minor) and ${uniqueMissingDocs.length} documents appear missing.`;
  try {
    const llmSummary = await localIntegrations.Core.InvokeLLM({
      prompt: `Write a concise 3-4 sentence professional NEC review summary for ${projectName} (NEC ${necYear}). Violations: ${violationsWithIds.length} (${criticalCount} critical, ${majorCount} major, ${minorCount} minor). Missing documents: ${uniqueMissingDocs.length}.`,
    });
    if (typeof llmSummary === "string" && llmSummary.trim()) summary = llmSummary.trim();
  } catch {
    // keep fallback summary
  }

  await localEntities.Analysis.update(analysisId, {
    status: "completed",
    violations: violationsWithIds,
    missing_documents: uniqueMissingDocs,
    total_violations: violationsWithIds.length,
    total_missing_docs: uniqueMissingDocs.length,
    summary,
  });

  return {
    success: true,
    total_violations: violationsWithIds.length,
    total_missing_docs: uniqueMissingDocs.length,
  };
}

async function seedArticleVerifications() {
  requireAdmin();
  const created = await localEntities.ArticleVerification.bulkCreate(ARTICLE_VERIFICATION_SEED);
  return {
    success: true,
    seeded: created.length,
    message: `Seeded ${created.length} ArticleVerification records for top 10 launch calculators`,
  };
}

async function seedArticleVerificationsComplete() {
  requireAdmin();
  const TOP_10 = [
    "dwelling_standard",
    "dwelling_optional",
    "service_sizing",
    "conductor_ampacity",
    "conduit_fill",
    "box_fill",
    "transformer_sizing",
    "motor_branch_circuit",
    "motor_feeder",
    "ev_charging",
  ];
  const NEC_YEARS = ["2017", "2020", "2023", "2026"];
  const records = [];
  for (const calc of CALCULATORS) {
    if (!TOP_10.includes(calc.id) || !calc.articles?.length) continue;
    for (const article of calc.articles) {
      for (const year of NEC_YEARS) {
        records.push({
          calculator_id: calc.id,
          article_ref: article.ref,
          nec_year: year,
          status: year === "2026" ? "pending_review" : "verified",
          notes: year === "2026" ? "2026 code not yet published" : null,
        });
      }
    }
  }
  for (const calcId of TOP_10) {
    await localEntities.ArticleVerification.deleteMany({ calculator_id: calcId });
  }
  if (records.length) await localEntities.ArticleVerification.bulkCreate(records);
  return { success: true, seeded: records.length };
}

const HANDLERS = {
  startAnalysis,
  analyzeBlueprintChunk,
  consolidateAnalysis,
  seedArticleVerifications,
  seedArticleVerificationsComplete,
};

export async function invokeFunction(name, payload = {}) {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown function: ${name}`);
  const result = await handler(payload);
  return wrapData(result);
}
