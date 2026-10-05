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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="font-semibold text-sm tracking-wide text-gray-900 uppercase hidden sm:inline">
                {programInfo.programDisplayName}
              </span>
            </div>

            <span className="text-gray-300 hidden sm:inline">/</span>

            <div className="flex items-center gap-2 truncate">
              <FileSpreadsheet className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate" title={recapSheet.name}>
                {recapSheet.name}
              </span>
              {recapSheet.isNew && (
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
              title="Open spreadsheet in Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden md:inline">Open in Google Sheets</span>
              <span className="md:hidden">Sheets</span>
            </a>

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer"
              title="Clears loaded sheet and re-runs find-or-create search from Drive"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-semibold text-gray-700 leading-tight">{user.name || 'Branch Admin'}</p>
                <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{user.email}</p>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              Target Drive Folder: <strong className="text-gray-700">{programFolder.name}</strong>
            </span>
            <span className="text-gray-300 hidden md:inline">•</span>
            <span className="hidden md:inline">
              Certificates save to: <code className="text-gray-600 bg-gray-100 px-1 py-0.5 rounded">certificates/{"{Course} ({Date_start})"}</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              Filter: <code className="text-gray-600 bg-gray-100 px-1 py-0.5 rounded">Certif_status = siap cetak</code>
            </span>
          </div>
        </div>

        {fetchError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-700 mb-1">Failed to read Recap Sheet</h4>
              <p className="text-xs text-red-600">{fetchError}</p>
              <button
                onClick={loadPendingRows}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-xs font-medium rounded-lg text-red-700"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Read
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-100 text-gray-500">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Pending Certificates</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    {rows.length} {rows.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  All listed rows have status <span className="text-gray-600 font-mono">siap cetak</span> and are ready for bulk issuance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={loadPendingRows}
                disabled={isLoadingRows || isGenerating}
                className="p-2 text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-fetch recap rows"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRows ? 'animate-spin text-gray-500' : ''}`} />
              </button>

              <button
                onClick={handleBulkGenerate}
                disabled={rows.length === 0 || isGenerating || isLoadingRows}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors disabled:pointer-events-none cursor-pointer"
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
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span>
                  Processing <strong>{currentStudentName}</strong> ({currentStepIndex} of {rows.length})
                </span>
                <span>{Math.round((currentStepIndex / rows.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStepIndex / rows.length) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Duplicating template • Replacing tags • Exporting PDF • Writing cell in Recap • Logging audit...
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            {rows.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
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
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">{row.rowNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>{row.student}</div>
                        {row.studentId && (
                          <div className="text-[11px] text-gray-400 font-mono">{row.studentId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {row.dateStartFormatted || row.dateStartRaw || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {row.dateEndFormatted || row.dateEndRaw || '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                          {row.course}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          READY
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">No certificates pending</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                  There are no rows in this recap sheet with{' '}
                  <code className="text-gray-600 bg-gray-100 px-1 py-0.5 rounded">Certif_status = &quot;siap cetak&quot;</code>.
                  Update rows in Google Sheets and click the refresh button above.
                </p>
                <a
                  href={recapSheet.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Sheets to edit statuses</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {generationSummary && (
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-green-500" />
                  <span>Batch Generation Completed</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Processed {generationSummary.total} certificates: {generationSummary.succeeded} succeeded, {generationSummary.failed} failed.
                </p>
              </div>
              <button
                onClick={() => setGenerationSummary(null)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Dismiss
              </button>
            </div>

            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1 text-xs">
              {generationSummary.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-medium text-gray-700">{item.student}</span>
                      <span className="text-gray-400 ml-2">({item.course})</span>
                    </div>
                  </div>

                  <div>
                    {item.success && item.pdfUrl ? (
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium underline"
                      >
                        <span>View PDF</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-red-500 text-[11px]">{item.error || 'Failed'}</span>
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
