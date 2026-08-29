import { httpError, loadDb, newId, saveDb } from "./localDb";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function readLocalFile(fileUrl) {
  if (!fileUrl) return null;
  if (fileUrl.startsWith("data:")) return { dataUrl: fileUrl, name: "upload" };
  if (fileUrl.startsWith("local-file://")) {
    const id = fileUrl.replace("local-file://", "");
    const db = loadDb();
    return db.files[id] || null;
  }
  return { dataUrl: fileUrl, name: "remote" };
}

export const localIntegrations = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw httpError("No file provided");
      const dataUrl = await fileToDataUrl(file);
      const db = loadDb();
      const id = newId("file");
      db.files[id] = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        created_date: new Date().toISOString(),
      };
      saveDb(db);
      return { file_url: `local-file://${id}` };
    },

    async InvokeLLM({ prompt, file_urls, response_json_schema }) {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw httpError(
          "AI is not configured. Add VITE_OPENAI_API_KEY to .env.local to enable LLM features."
        );
      }

      const content = [{ type: "text", text: prompt }];
      if (Array.isArray(file_urls)) {
        for (const url of file_urls) {
          const stored = await readLocalFile(url);
          if (stored?.dataUrl?.startsWith("data:image/")) {
            content.push({ type: "image_url", image_url: { url: stored.dataUrl } });
          } else if (stored?.dataUrl) {
            content.push({
              type: "text",
              text: `\n[Attached file: ${stored.name || "upload"} — binary files are stored locally. Analyze based on the prompt and any extracted context.]`,
            });
          }
        }
      }

      if (response_json_schema) {
        content[0].text += `\n\nRespond with JSON only, matching this schema:\n${JSON.stringify(response_json_schema)}`;
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content }],
          temperature: 0.2,
          ...(response_json_schema ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw httpError(`AI request failed (${res.status}): ${text.slice(0, 200)}`, res.status);
      }

      const payload = await res.json();
      const text = payload.choices?.[0]?.message?.content || "";
      if (!response_json_schema) return text;
      try {
        return JSON.parse(text);
      } catch {
        return { result: "uncertain", explanation: text, confidence: 0 };
      }
    },
  },
};
