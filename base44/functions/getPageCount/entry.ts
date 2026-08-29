import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl } = await req.json();

        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            return Response.json({ error: 'Failed to fetch PDF' }, { status: 400 });
        }

        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const totalPages = pdfDoc.getPageCount();

        return Response.json({ totalPages });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});