import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, fileName } = await req.json();

        // Fetch the PDF
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            return Response.json({ error: 'Failed to fetch PDF' }, { status: 400 });
        }

        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        const pageUrls = [];
        const baseName = fileName.replace(/\.pdf$/i, '');

        // Process pages in small batches to avoid memory spikes
        const BATCH = 5;
        for (let i = 0; i < totalPages; i += BATCH) {
            const end = Math.min(i + BATCH, totalPages);
            const batchPromises = [];

            for (let p = i; p < end; p++) {
                batchPromises.push((async (pageIndex) => {
                    const singleDoc = await PDFDocument.create();
                    const [copiedPage] = await singleDoc.copyPagesFrom(srcDoc, [pageIndex]);
                    singleDoc.addPage(copiedPage);
                    const pageBytes = await singleDoc.save();

                    const pageFile = new File(
                        [pageBytes],
                        `${baseName}_page_${pageIndex + 1}.pdf`,
                        { type: 'application/pdf' }
                    );

                    const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file: pageFile });
                    return { url: uploaded.file_url, pageNumber: pageIndex + 1 };
                })(p));
            }

            const batchResults = await Promise.all(batchPromises);
            pageUrls.push(...batchResults);
        }

        // Sort by page number
        pageUrls.sort((a, b) => a.pageNumber - b.pageNumber);

        return Response.json({ totalPages, pageUrls });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});