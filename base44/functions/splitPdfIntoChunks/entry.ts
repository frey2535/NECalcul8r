import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fileUrl, fileName, pagesPerChunk = 10 } = await req.json();

        // Validate fileUrl to prevent SSRF: only allow https URLs to the platform's own storage host
        let parsedUrl;
        try {
            parsedUrl = new URL(fileUrl);
        } catch {
            return Response.json({ error: 'Invalid fileUrl' }, { status: 400 });
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        const isLocalOrPrivate = (
            parsedUrl.protocol !== 'https:' ||
            hostname === 'localhost' ||
            hostname === '0.0.0.0' ||
            /^127\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^192\.168\./.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
            /^169\.254\./.test(hostname) ||
            hostname === '::1' ||
            !hostname.endsWith('.base44.com')
        );
        if (isLocalOrPrivate) {
            return Response.json({ error: 'fileUrl host not allowed' }, { status: 400 });
        }

        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) throw new Error('Failed to fetch PDF');

        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const totalPages = srcDoc.getPageCount();

        const baseName = fileName.replace(/\.pdf$/i, '');
        const chunks = [];

        for (let start = 0; start < totalPages; start += pagesPerChunk) {
            const end = Math.min(start + pagesPerChunk, totalPages);
            const pageIndices = [];
            for (let i = start; i < end; i++) pageIndices.push(i);

            const newDoc = await PDFDocument.create();
            const copied = await newDoc.copyPagesFrom(srcDoc, pageIndices);
            copied.forEach(p => newDoc.addPage(p));
            const sliceBytes = await newDoc.save();

            const sliceFile = new File(
                [sliceBytes],
                `${baseName}_pages_${start + 1}-${end}.pdf`,
                { type: 'application/pdf' }
            );

            const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: sliceFile });

            chunks.push({
                url: file_url,
                pageStart: start + 1,
                pageEnd: end,
                totalPages,
            });
        }

        return Response.json({ chunks, totalPages });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});