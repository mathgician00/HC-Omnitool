'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  RotateCcw,
  RefreshCw,
  Award,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  LogOut,
  FolderOpen,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { RecapRowData } from '@/lib/drive-service';

interface DashboardProps {
  accessToken: string;
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
  recapSheet: {
    id: string;
    name: string;
    webViewLink: string;
    isNew: boolean;
  };
  programFolder: {
    id: string;
    name: string;
  };
  programInfo: {
    batchCode: string;
    programName: string;
    programDisplayName: string;
  };
  isDemo?: boolean;
  onReset: () => void;
  onSignOut: () => void;
}

interface GenerationSummary {
  total: number;
  succeeded: number;
  failed: number;
  items: Array<{
    student: string;
    course: string;
    success: boolean;
    pdfUrl?: string;
    error?: string;
  }>;
}

export default function Dashboard({
  accessToken,
  user,
  recapSheet,
  programFolder,
  programInfo,
  isDemo = false,
  onReset,
  onSignOut,
}: DashboardProps) {
  const [rows, setRows] = useState<RecapRowData[]>([]);
  const [sheetTitle, setSheetTitle] = useState('Sheet1');
  const [certifColLetter, setCertifColLetter] = useState('M');
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentStudentName, setCurrentStudentName] = useState('');
  const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      setFetchError(null);

      if (isDemo) {
        await new Promise((r) => setTimeout(r, 400));
        if (isCancelled) return;
        setRows([
          {
            rowNumber: 2,
            studentId: '261201-JS-001',
            student: 'John Smith',
            course: 'Robotics Adventure',
            batch: '2612',
            session: 'Session 1',
            teacher: 'Mr. David',
            room: 'Lab A',
            dateStartRaw: '2026-12-01',
            dateStartFormatted: '01 Dec 2026',
            dateEndRaw: '2026-12-05',
            dateEndFormatted: '05 Dec 2026',
            score: '95',
            link: 'https://scratch.mit.edu',
            certifStatus: 'siap cetak',
            certif: '',
          },
          {
            rowNumber: 3,
            studentId: '261201-AL-002',
            student: 'Amanda Lee',
            course: 'Robotics Adventure',
            batch: '2612',
            session: 'Session 1',
            teacher: 'Mr. David',
            room: 'Lab A',
            dateStartRaw: '2026-12-01',
            dateStartFormatted: '01 Dec 2026',
            dateEndRaw: '2026-12-05',
            dateEndFormatted: '05 Dec 2026',
            score: '98',
            link: 'https://scratch.mit.edu',
            certifStatus: 'siap cetak',
            certif: '',
          },
          {
            rowNumber: 4,
            studentId: '261202-RK-003',
            student: 'Rian Kurniawan',
            course: 'Python Game Developer',
            batch: '2612',
            session: 'Session 2',
            teacher: 'Ms. Sarah',
            room: 'Lab B',
            dateStartRaw: '2026-12-08',
            dateStartFormatted: '08 Dec 2026',
            dateEndRaw: '2026-12-12',
            dateEndFormatted: '12 Dec 2026',
            score: '92',
            link: 'https://replit.com',
            certifStatus: 'siap cetak',
            certif: '',
          },
        ]);
        setSheetTitle('Sheet1');
        setCertifColLetter('M');
        setIsLoadingRows(false);
        return;
      }

      try {
        const res = await fetch(`/api/recap/pending?fileId=${encodeURIComponent(recapSheet.id)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await res.json();
        if (isCancelled) return;

        if (!res.ok) {
          throw new Error(data.error || 'Failed to read sheet data');
        }

        setRows(data.pendingRows || []);
        setSheetTitle(data.sheetTitle || 'Sheet1');
        setCertifColLetter(data.certifColLetter || 'M');
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error fetching recap data:', err);
          setFetchError(err?.message || 'Failed to load spreadsheet records');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRows(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, isDemo, recapSheet.id, refreshCount]);

  const loadPendingRows = () => {
    setIsLoadingRows(true);
    setRefreshCount((prev) => prev + 1);
  };

  const handleBulkGenerate = async () => {
    if (rows.length === 0 || isGenerating) return;

    setIsGenerating(true);
    setGenerationSummary(null);
    setCurrentStepIndex(0);

    const results: GenerationSummary['items'] = [];
    let succeededCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowItem = rows[i];
      setCurrentStepIndex(i + 1);
      setCurrentStudentName(rowItem.student);

      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        succeededCount++;
        results.push({
          student: rowItem.student,
          course: rowItem.course,
          success: true,
          pdfUrl: `https://drive.google.com/file/d/demo_pdf_${i + 1}/view`,
        });
        continue;
      }

      try {
        const res = await fetch('/api/certificates/generate-row', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            rowData: rowItem,
            recapFileId: recapSheet.id,
            programFolderId: programFolder.id,
            sheetTitle,
            certifColLetter,
            userEmail: user.email,
          }),
        });

        const data = await res.json();
        if (data.success) {
          succeededCount++;
          results.push({
            student: rowItem.student,
            course: rowItem.course,
            success: true,
            pdfUrl: data.pdfUrl,
          });
        } else {
          failedCount++;
          results.push({
            student: rowItem.student,
            course: rowItem.course,
            success: false,
            error: data.error || 'Generation failed',
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          student: rowItem.student,
          course: rowItem.course,
          success: false,
          error: err?.message || 'Network or execution error',
        });
      }
    }

    setIsGenerating(false);
    setGenerationSummary({
      total: rows.length,
      succeeded: succeededCount,
      failed: failedCount,
      items: results,
    });

    loadPendingRows();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-sm tracking-wide text-white uppercase hidden sm:inline">
                {programInfo.programDisplayName}
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">/</span>

            <div className="flex items-center gap-2 truncate">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-200 truncate" title={recapSheet.name}>
                {recapSheet.name}
              </span>
              {recapSheet.isNew && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex-shrink-0">
                  New Copy
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <a
              href={recapSheet.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700/60"
              title="Open spreadsheet in Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Open in Google Sheets</span>
              <span className="md:hidden">Sheets</span>
            </a>

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 rounded-lg transition-colors border border-amber-800/60 cursor-pointer"
              title="Clears loaded sheet and re-runs find-or-create search from Drive"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user.name || 'Branch Admin'}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</p>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              Target Drive Folder: <strong className="text-slate-200">{programFolder.name}</strong>
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="hidden md:inline">
              Certificates save to: <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded">certificates/{"{Course} ({Date_start})"}</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">
              Filter: <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">Certif_status = siap cetak</code>
            </span>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-300 mb-1">Failed to read Recap Sheet</h4>
              <p className="text-xs text-red-200">{fetchError}</p>
              <button
                onClick={loadPendingRows}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/60 hover:bg-red-900 text-xs font-medium rounded-lg text-white"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Read
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-800 text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">Pending Certificates</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                    {rows.length} {rows.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  All listed rows have status <span className="text-indigo-300 font-mono">siap cetak</span> and are ready for bulk issuance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={loadPendingRows}
                disabled={isLoadingRows || isGenerating}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-fetch recap rows"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRows ? 'animate-spin text-indigo-400' : ''}`} />
              </button>

              <button
                onClick={handleBulkGenerate}
                disabled={rows.length === 0 || isGenerating || isLoadingRows}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:pointer-events-none cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating ({currentStepIndex}/{rows.length})...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Generate Certificates</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="px-6 py-4 bg-indigo-950/40 border-b border-indigo-900/60">
              <div className="flex items-center justify-between text-xs text-indigo-300 mb-2">
                <span>
                  Processing <strong>{currentStudentName}</strong> ({currentStepIndex} of {rows.length})
                </span>
                <span>{Math.round((currentStepIndex / rows.length) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStepIndex / rows.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-400/80 mt-1.5">
                Duplicating template • Replacing tags • Exporting PDF • Writing cell in Recap • Logging audit...
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            {rows.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th scope="col" className="px-6 py-3.5 w-16">
                      ROW
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      NAME
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      DATE_START
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      DATE_END
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      COURSE
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {row.rowNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-100">
                        <div>{row.student}</div>
                        {row.studentId && (
                          <div className="text-[11px] text-slate-500 font-mono">{row.studentId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {row.dateStartFormatted || row.dateStartRaw || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {row.dateEndFormatted || row.dateEndRaw || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-200">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                          {row.course}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          READY
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  No certificates pending
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  There are no rows in this recap sheet with <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Certif_status = &quot;siap cetak&quot;</code>.
                  Update rows in Google Sheets and click the refresh button above.
                </p>
                <a
                  href={recapSheet.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Sheets to edit statuses</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {generationSummary && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  <span>Batch Generation Completed</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Processed {generationSummary.total} certificates: {generationSummary.succeeded} succeeded, {generationSummary.failed} failed.
                </p>
              </div>
              <button
                onClick={() => setGenerationSummary(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 bg-slate-800 rounded-lg"
              >
                Dismiss
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto pr-1 text-xs">
              {generationSummary.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-medium text-slate-200">{item.student}</span>
                      <span className="text-slate-500 ml-2">({item.course})</span>
                    </div>
                  </div>

                  <div>
                    {item.success && item.pdfUrl ? (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium underline"
                      >
                        <span>View PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-red-400 text-[11px]">{item.error || 'Failed'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
