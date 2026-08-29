import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

const PAGES_PER_CHUNK = 1;

async function uploadWithRetry(file, maxRetries = 2) {
  const base44 = createClientFromRequest(new Request('http://localhost', { method: 'POST' }));
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      if (attempt === maxRetries - 1) throw new Error(`Failed to upload: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

async function splitPdfClientSide(file, pagesPerChunk) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, "");
  const chunks = [];

  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
    const newDoc = await PDFDocument.create();
    const copied = await newDoc.copyPages(srcDoc, pageIndices);
    copied.forEach(p => newDoc.addPage(p));
    const sliceBytes = await newDoc.save();
    const sliceFile = new File(
      [sliceBytes],
      `${baseName}_pages_${start + 1}-${end}.pdf`,
      { type: "application/pdf" }
    );
    chunks.push({ file: sliceFile, pageStart: start + 1, pageEnd: end });
  }

  return chunks;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { projectName, necYear, fileUrls, fileNames } = await req.json();

        // Create analysis record
        const analysis = await base44.asServiceRole.entities.Analysis.create({
            project_name: projectName,
            nec_year: necYear,
            status: "analyzing",
            file_urls: fileUrls,
            file_names: fileNames,
        });

        // Start background processing (fire and forget)
        processAnalysisInBackground(analysis.id, projectName, necYear, fileUrls, fileNames, base44);

        return Response.json({ analysisId: analysis.id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function processAnalysisInBackground(analysisId, projectName, necYear, fileUrls, fileNames, base44) {
    try {
        const allViolations = [];
        const allMissingDocs = [];

        // Process each file sequentially
        for (let i = 0; i < fileUrls.length; i++) {
            const fileUrl = fileUrls[i];
            const fileName = fileNames[i];

            // Check if it's a PDF (skip images)
            if (!fileName.toLowerCase().endsWith('.pdf')) {
                continue;
            }

            // Analyze the file
            try {
                const result = await base44.asServiceRole.functions.invoke("analyzeBlueprintChunk", {
                    analysisId,
                    fileUrl,
                    fileName,
                    necYear,
                    projectName,
                    pageStart: 1,
                    pageEnd: 1,
                });

                if (result.data?.violations) {
                    allViolations.push(...result.data.violations);
                }
                if (result.data?.missing_documents) {
                    allMissingDocs.push(...result.data.missing_documents);
                }

                // Update progress in database
                await base44.asServiceRole.entities.Analysis.update(analysisId, {
                    violations: allViolations,
                    missing_documents: allMissingDocs,
                    total_violations: allViolations.length,
                    total_missing_docs: allMissingDocs.length,
                });
            } catch (error) {
                console.error(`Failed to analyze ${fileName}:`, error.message);
            }

            // Delay between files to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Finalize with summary
        await base44.asServiceRole.functions.invoke("consolidateAnalysis", {
            analysisId,
            allViolations,
            allMissingDocs,
            necYear,
            projectName,
        });

    } catch (error) {
        console.error('Background analysis failed:', error);
        await base44.asServiceRole.entities.Analysis.update(analysisId, { status: "error" });
    }
}