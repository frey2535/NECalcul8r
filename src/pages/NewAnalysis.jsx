import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Zap, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import NECYearSelector from "@/components/analysis/NECYearSelector";
import FileUploader from "@/components/analysis/FileUploader";
import AnalysisProgress from "@/components/analysis/AnalysisProgress";
import { useNECYear } from "@/context/NECYearContext";

// AI-powered blueprint analysis requires an OpenAI key in the self-hosted app.
const AI_ANALYSIS_UNAVAILABLE = !import.meta.env.VITE_OPENAI_API_KEY;

async function uploadWithRetry(file, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      if (attempt === maxRetries - 1) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

export default function NewAnalysis() {
  const navigate = useNavigate();
  const { year: globalYear } = useNECYear();
  const [projectName, setProjectName] = useState("");
  const [necYear, setNecYear] = useState(globalYear || "2017");
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [chunksDone, setChunksDone] = useState(0);
  const [liveViolations, setLiveViolations] = useState([]);
  const [liveMissingDocs, setLiveMissingDocs] = useState([]);
  const stoppedRef = useRef(false);

  const canSubmit = projectName.trim() && necYear && files.length > 0 && !analyzing && !AI_ANALYSIS_UNAVAILABLE;

  const handleStop = () => {
    stoppedRef.current = true;
    setProgressLabel("Stopping after current chunks finish...");
  };

  const handleAnalyze = async () => {
    try {
      stoppedRef.current = false;
      setAnalyzing(true);
      setChunksDone(0);
      setChunksTotal(0);
      setLiveViolations([]);
      setLiveMissingDocs([]);
      setProgressLabel("Uploading blueprints...");
      setProgressPct(5);

      // Upload all files
      const uploadedFiles = [];
      for (const file of files) {
        const file_url = await uploadWithRetry(file);
        uploadedFiles.push({ url: file_url, name: file.name });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (stoppedRef.current) { setAnalyzing(false); return; }
      setProgressLabel("Starting background analysis...");
      setProgressPct(15);

      // Start background analysis via backend function
      const startResult = await base44.functions.invoke("startAnalysis", {
        projectName,
        necYear,
        fileUrls: uploadedFiles.map(f => f.url),
        fileNames: uploadedFiles.map(f => f.name),
      });

      const analysisId = startResult.data.analysisId;
      setProgressPct(20);

      // Poll for progress every 3 seconds
      let isComplete = false;
      while (!isComplete && !stoppedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const analysis = await base44.entities.Analysis.filter({ id: analysisId });
        if (analysis[0]) {
          const current = analysis[0];
          setLiveViolations(current.violations || []);
          setLiveMissingDocs(current.missing_documents || []);
          setChunksDone((current.violations?.length || 0) + (current.missing_documents?.length || 0));

          if (current.status === "completed") {
            isComplete = true;
            setProgressPct(100);
            setProgressLabel("Analysis complete!");
            setTimeout(() => navigate(`/results?id=${analysisId}`), 600);
          } else if (current.status === "error") {
            isComplete = true;
            setProgressLabel("Analysis failed - check backend logs");
          } else {
            const pct = 20 + Math.min(70, ((current.violations?.length || 0) * 2));
            setProgressPct(pct);
            setProgressLabel(`Found ${current.violations?.length || 0} violations, ${current.missing_documents?.length || 0} missing docs...`);
          }
        }
      }

      setAnalyzing(false);
    } catch (error) {
      setAnalyzing(false);
      setProgressLabel(`Error: ${error.message}`);
      console.error('Analysis failed:', error);
    }
  };

  if (analyzing) {
    return (
      <AnalysisProgress
        label={progressLabel}
        progress={progressPct}
        chunksTotal={chunksTotal}
        chunksDone={chunksDone}
        violations={liveViolations}
        missingDocs={liveMissingDocs}
        onStop={handleStop}
        stopped={stoppedRef.current}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered NEC Compliance
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Analyze Electrical Blueprints
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Upload electrical plan sets and get a complete NEC code violation report with precise locations and recommended fixes.
        </p>
      </div>

      {AI_ANALYSIS_UNAVAILABLE && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">AI analysis is not configured</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">Add <code>VITE_OPENAI_API_KEY</code> to <code>.env.local</code> to enable blueprint analysis. All NEC calculators still work without it.</p>
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Project Name
          </label>
          <Input
            placeholder="e.g., Smith Residence Remodel"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-11"
          />
        </div>

        <NECYearSelector selected={necYear} onSelect={setNecYear} />
        <FileUploader files={files} setFiles={setFiles} />

        <Button
          className="w-full h-12 text-base gap-2"
          disabled={!canSubmit}
          onClick={handleAnalyze}
        >
          <ArrowRight className="w-5 h-5" />
          Analyze for NEC {necYear} Violations
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          All pages analyzed simultaneously — 60 pages in under 5 minutes.
        </p>
      </Card>
    </motion.div>
  );
}