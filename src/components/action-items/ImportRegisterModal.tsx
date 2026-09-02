"use client";

import { useState, useRef, useMemo } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Sparkles,
  ArrowRight,
  Trash2,
  FileUp,
  Building,
  Briefcase,
  Layers,
} from "lucide-react";
import { cn, formatShortDate } from "@/lib/utils";
import { bulkCreateActionItems } from "@/lib/actions/action-items";
import { useRouter } from "next/navigation";

export interface StagingActionItem {
  id: string;
  selected: boolean;
  itemNumber?: number | string;
  sourceDocument?: string;
  title: string;
  rawResponsible: string;
  assigneeId: string;
  isExternal: boolean;
  rawDeadline: string;
  deadline: string; // YYYY-MM-DD
  isDeadlineTBA: boolean;
  priority: "low" | "medium" | "high" | "critical";
  status: "not_started" | "in_progress" | "done";
  notes?: string;
}

interface ImportRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Array<{ id: string; name: string; brandPrimaryColor?: string }>;
  projects: Array<{ id: string; name: string; entityId: string; entityName?: string }>;
  users: Array<{ id: string; name: string }>;
  currentUserId: string;
  defaultEntityId?: string | null;
  defaultProjectId?: string | null;
}

export function ImportRegisterModal({
  isOpen,
  onClose,
  entities,
  projects,
  users,
  currentUserId,
  defaultEntityId,
  defaultProjectId,
}: ImportRegisterModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow step: "upload" -> "review"
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");

  // Target assignment
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    defaultEntityId || entities[0]?.id || ""
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || ""
  );

  // Extracted metadata
  const [meetingSubject, setMeetingSubject] = useState("");
  const [recordMeeting, setRecordMeeting] = useState(true);

  // Staging items & batch document metadata
  const [items, setItems] = useState<StagingActionItem[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; title: string; count: number }>>([]);
  const [uploadFileCount, setUploadFileCount] = useState<number>(1);
  const [bulkExternalAssignee, setBulkExternalAssignee] = useState<string>(currentUserId);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Filter projects by selected entity
  const availableProjects = useMemo(() => {
    if (!selectedEntityId) return projects;
    return projects.filter((p) => p.entityId === selectedEntityId);
  }, [projects, selectedEntityId]);

  // Set default project if current project is invalid
  useMemo(() => {
    if (availableProjects.length > 0) {
      if (!selectedProjectId || !availableProjects.some((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(availableProjects[0].id);
      }
    }
  }, [availableProjects, selectedProjectId]);

  if (!isOpen) return null;

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsExtracting(true);
    setExtractError(null);
    setWarnings([]);
    setUploadFileCount(files.length);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/action-items/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract action items.");
      }

      setMeetingSubject(
        data.documentTitle ||
          (files.length > 1
            ? `${files.length} Minutes Documents`
            : files[0].name.replace(/\.[^/.]+$/, ""))
      );
      setUploadedDocs(data.documents || []);
      setWarnings(data.warnings || []);

      const stagingList: StagingActionItem[] = (data.items || []).map((it: any) => ({
        id: it.id || Math.random().toString(),
        selected: true,
        itemNumber: it.itemNumber,
        sourceDocument: it.sourceDocument,
        title: it.title,
        rawResponsible: it.rawResponsible || "",
        assigneeId: it.matchedUserId || currentUserId,
        isExternal: it.isExternal || false,
        rawDeadline: it.rawDeadline || "",
        deadline: it.parsedDeadline || new Date().toISOString().split("T")[0],
        isDeadlineTBA: it.isDeadlineTBA || false,
        priority: it.priority || "medium",
        status: "not_started",
        notes: it.notes,
      }));

      setItems(stagingList);
      setStep("review");
    } catch (err: any) {
      setExtractError(err.message || "Could not read files. Please verify file format.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasteExtract = async () => {
    if (!pasteText.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setWarnings([]);

    try {
      const formData = new FormData();
      formData.append("text", pasteText.trim());

      const res = await fetch("/api/action-items/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to extract items.");
      }

      setMeetingSubject(data.documentTitle || "Imported Action Register");
      setWarnings(data.warnings || []);

      const stagingList: StagingActionItem[] = (data.items || []).map((it: any) => ({
        id: it.id,
        selected: true,
        itemNumber: it.itemNumber,
        title: it.title,
        rawResponsible: it.rawResponsible || "",
        assigneeId: it.matchedUserId || currentUserId,
        isExternal: it.isExternal || false,
        rawDeadline: it.rawDeadline || "",
        deadline: it.parsedDeadline,
        isDeadlineTBA: it.isDeadlineTBA || false,
        priority: it.priority || "medium",
        status: it.status || "not_started",
        notes: it.notes,
      }));

      setItems(stagingList);
      setStep("review");
    } catch (err: any) {
      setExtractError(err.message || "Failed to extract table text.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmImport = async () => {
    const selectedItems = items.filter((it) => it.selected && it.title.trim());
    if (selectedItems.length === 0) {
      setExtractError("Please select at least one action item to import.");
      return;
    }
    if (!selectedEntityId) {
      setExtractError("Please select a target Subsidiary for these action items.");
      return;
    }

    setIsImporting(true);
    setExtractError(null);

    try {
      const res = await bulkCreateActionItems({
        entityId: selectedEntityId,
        projectId: selectedProjectId || undefined,
        createdBy: currentUserId,
        meetingSubject: meetingSubject.trim() || undefined,
        createMeetingRecord: recordMeeting,
        items: selectedItems.map((it) => ({
          title: it.title.trim(),
          assigneeId: it.assigneeId,
          deadline: it.deadline,
          priority: it.priority,
          status: it.status,
          notes: it.isExternal
            ? `Outsider / Counterparty Deliverable: ${it.rawResponsible}. Assigned to in-house lead to follow up.${it.rawDeadline ? ` Original deadline: ${it.rawDeadline}` : ""}`
            : it.rawDeadline && it.rawDeadline !== it.deadline
            ? `Original deadline: ${it.rawDeadline}`
            : undefined,
          tag: it.isExternal ? `Follow-up: ${it.rawResponsible}` : undefined,
        })),
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to import items.");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setExtractError(err.message || "Failed to save action items to database.");
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-duston-border overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-duston-border bg-duston-bg/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#023542] text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-duston-dark">
                Import Action Register
              </h2>
              <p className="text-[11px] text-duston-muted">
                Extract deliverables from Excel (.xlsx, .csv), PDF minutes, or tabular text
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {extractError && (
            <div className="p-3 bg-duston-orange/10 border border-duston-orange/20 text-duston-orange rounded-xl flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{extractError}</span>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>Notice</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: UPLOAD / PASTE */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Target Subsidiary Picker */}
              <div className="p-4 rounded-xl bg-duston-bg/40 border border-duston-border">
                <label className="block text-duston-dark font-medium mb-1.5 flex items-center gap-1.5 text-xs">
                  <Building size={14} className="text-[#023542]" />
                  <span>Target Subsidiary *</span>
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-white border border-duston-border rounded-xl px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                >
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-duston-muted mt-1.5">
                  All extracted deliverables from the minutes will be registered directly under this subsidiary.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex border-b border-duston-border text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={cn(
                    "px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
                    inputMode === "file"
                      ? "border-[#023542] text-[#023542]"
                      : "border-transparent text-duston-muted hover:text-duston-dark"
                  )}
                >
                  <FileUp size={14} />
                  <span>Upload Document (.xlsx, .pdf, .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={cn(
                    "px-4 py-2 font-medium border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
                    inputMode === "paste"
                      ? "border-[#023542] text-[#023542]"
                      : "border-transparent text-duston-muted hover:text-duston-dark"
                  )}
                >
                  <FileText size={14} />
                  <span>Paste Action Register Text</span>
                </button>
              </div>

              {/* File Dropzone */}
              {inputMode === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleFilesUpload(files);
                    }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) handleFilesUpload(files);
                    }}
                    className={cn(
                      "border-2 border-dashed border-duston-border rounded-2xl p-8 sm:p-10 text-center hover:border-[#1BCECE] hover:bg-duston-bg/40 transition-all cursor-pointer space-y-3",
                      isExtracting && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#023542]/5 text-[#023542] flex items-center justify-center mx-auto">
                      <Upload size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="font-semibold text-duston-dark text-sm block">
                        {isExtracting
                          ? `Extracting action register from ${uploadFileCount} document(s)...`
                          : "Choose or drag and drop minutes / registers"}
                      </span>
                      <p className="text-[11px] text-duston-muted mt-1">
                        Upload one or multiple PDF minutes (.pdf), Microsoft Excel (.xlsx), or CSV files at once
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-duston-border rounded-xl text-[11px] text-duston-dark font-medium shadow-2xs">
                      <span>Browse local files (multi-file supported)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Paste Area */}
              {inputMode === "paste" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-duston-muted text-[11px]">
                      Paste table rows (e.g. copied directly from Excel, Word, or minutes email):
                    </label>
                    <span className="text-[10px] text-duston-muted font-mono">
                      Format: Item | Responsible | Deadline
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Contact Standard Bank to progress escrow | Desmond | After the meeting\nReconfirm TOTSA credit limit | TOTSA | TBA\nShare historical SAR cargo volumes with TOTSA | Eugene | TBA`}
                    className="w-full bg-white border border-duston-border rounded-xl p-3 text-duston-text outline-none focus:border-[#1BCECE] font-mono text-[11px] leading-relaxed resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isExtracting || !pasteText.trim()}
                      onClick={handlePasteExtract}
                      className="px-4 py-2 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl text-xs font-medium transition-colors shadow-subtle disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>{isExtracting ? "Extracting..." : "Parse & Review Register"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: STAGING & VERIFICATION TABLE */}
          {step === "review" && (
            <div className="space-y-4">
              {/* Meeting & Project Association Bar */}
              <div className="bg-duston-bg/60 border border-duston-border rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-duston-muted font-medium mb-1">
                      Meeting / Document Title
                    </label>
                    <input
                      type="text"
                      value={meetingSubject}
                      onChange={(e) => setMeetingSubject(e.target.value)}
                      placeholder="e.g. MOSL & TOTSA Strategic Working Session"
                      className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-duston-muted font-medium mb-1">
                      Target Subsidiary
                    </label>
                    <select
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
                      className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                    >
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-duston-dark">
                    <input
                      type="checkbox"
                      checked={recordMeeting}
                      onChange={(e) => setRecordMeeting(e.target.checked)}
                      className="rounded border-duston-border text-[#023542] focus:ring-0"
                    />
                    <span>Also record as a Meeting entry in Meetings directory</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setStep("upload")}
                    className="text-[11px] text-duston-muted hover:text-duston-dark underline"
                  >
                    Upload different file(s)
                  </button>
                </div>
              </div>

              {/* Batch Upload Documents Summary */}
              {uploadedDocs.length > 1 && (
                <div className="p-3 bg-[#023542]/5 border border-[#023542]/15 rounded-xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#023542]">
                    <Layers size={14} className="text-[#1BCECE]" />
                    <span>Batch Extracted across {uploadedDocs.length} minutes documents ({items.length} total deliverables):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {uploadedDocs.map((doc, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white border border-duston-border text-duston-dark text-[11px] font-medium inline-flex items-center gap-1 shadow-2xs"
                      >
                        <FileText size={11} className="text-duston-muted" />
                        <span className="truncate max-w-[200px]">{doc.name}</span>
                        <strong className="text-[#023542] ml-1">({doc.count} items)</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Outsider Follow-Up Batch Helper */}
              {items.some((i) => i.isExternal) && (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center shrink-0">
                      <User size={13} />
                    </div>
                    <div>
                      <span className="font-semibold block">
                        Outsider / Counterparty Deliverables Detected
                      </span>
                      <p className="text-[11px] text-purple-700">
                        {items.filter((i) => i.isExternal).length} deliverables belong to external parties (e.g. TOTSA, Eugene). Assign an in-house person to follow up:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <select
                      value={bulkExternalAssignee}
                      onChange={(e) => setBulkExternalAssignee(e.target.value)}
                      className="bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-xs text-duston-dark outline-none focus:border-purple-500"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setItems(
                          items.map((it) =>
                            it.isExternal ? { ...it, assigneeId: bulkExternalAssignee } : it
                          )
                        );
                      }}
                      className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Apply to all outsiders
                    </button>
                  </div>
                </div>
              )}

              {/* Table Action Controls */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-duston-dark">
                    Extracted Action Items ({items.length})
                  </span>
                  <span className="text-[11px] text-duston-muted">
                    • {selectedCount} selected for import
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allSelected = items.every((i) => i.selected);
                    setItems(items.map((i) => ({ ...i, selected: !allSelected })));
                  }}
                  className="text-[11px] text-[#023542] hover:underline font-medium cursor-pointer"
                >
                  {items.every((i) => i.selected) ? "Deselect all" : "Select all"}
                </button>
              </div>

              {/* Staging Table */}
              <div className="border border-duston-border rounded-xl overflow-hidden bg-white shadow-2xs max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-duston-bg/80 text-[11px] text-duston-muted font-medium border-b border-duston-border sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center"></th>
                      <th className="py-2.5 px-2 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Action Item Description</th>
                      <th className="py-2.5 px-3 w-56">Responsible / Follow-Up Lead</th>
                      <th className="py-2.5 px-3 w-36">Deadline</th>
                      <th className="py-2.5 px-3 w-28">Priority</th>
                      <th className="py-2.5 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-duston-border/60 text-xs">
                    {items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "hover:bg-duston-bg/30 transition-colors",
                          !item.selected && "opacity-50 bg-duston-bg/10"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].selected = e.target.checked;
                              setItems(updated);
                            }}
                            className="rounded border-duston-border text-[#023542] focus:ring-0"
                          />
                        </td>

                        {/* Number */}
                        <td className="py-2.5 px-2 text-center text-duston-muted font-medium text-[11px]">
                          {item.itemNumber || idx + 1}
                        </td>

                        {/* Action Item Title */}
                        <td className="py-2 px-3">
                          <textarea
                            rows={2}
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].title = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-transparent border border-transparent hover:border-duston-border focus:border-[#1BCECE] focus:bg-white rounded-lg p-1.5 text-xs text-duston-dark outline-none transition-all resize-none leading-snug"
                          />
                          {item.sourceDocument && uploadedDocs.length > 1 && (
                            <div className="text-[10px] text-duston-muted mt-0.5 flex items-center gap-1 font-medium">
                              <span className="px-1.5 py-0.2 rounded bg-duston-bg border border-duston-border truncate max-w-[240px]">
                                Doc: {item.sourceDocument}
                              </span>
                            </div>
                          )}
                          {item.rawResponsible && item.isExternal && (
                            <div className="text-[10px] text-purple-700 mt-0.5 flex items-center gap-1 font-medium">
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 border border-purple-200">
                                External: {item.rawResponsible}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Assignee / In-House Follow-up Lead */}
                        <td className="py-2 px-3">
                          {item.isExternal ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                                <span className="truncate">Outsider: <strong>{item.rawResponsible}</strong></span>
                              </div>
                              <select
                                value={item.assigneeId}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].assigneeId = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-purple-50/70 border border-purple-200 rounded-lg px-2 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE]"
                                title={`Assign in-house follower for ${item.rawResponsible}`}
                              >
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    Follow-up: {u.name}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[9px] text-purple-600 block truncate">
                                In-house person to chase {item.rawResponsible}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <select
                                value={item.assigneeId}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].assigneeId = e.target.value;
                                  setItems(updated);
                                }}
                                className="w-full bg-white border border-duston-border rounded-lg px-2 py-1.5 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                              >
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                              {item.rawResponsible && (
                                <span className="text-[10px] text-duston-muted block mt-0.5 truncate" title={`From minutes: ${item.rawResponsible}`}>
                                  File: {item.rawResponsible}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Deadline Date Input */}
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={item.deadline}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].deadline = e.target.value;
                              setItems(updated);
                            }}
                            className="w-full bg-white border border-duston-border rounded-lg px-2 py-1.5 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                          />
                          {item.rawDeadline && item.rawDeadline !== item.deadline && (
                            <span
                              className={cn(
                                "inline-block text-[10px] px-1.5 py-0.5 rounded mt-0.5 truncate max-w-[130px] font-medium",
                                item.isDeadlineTBA
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              )}
                              title={item.rawDeadline}
                            >
                              {item.rawDeadline}
                            </span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-2 px-3">
                          <select
                            value={item.priority}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].priority = e.target.value as any;
                              setItems(updated);
                            }}
                            className="w-full bg-white border border-duston-border rounded-lg px-2 py-1.5 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setItems(items.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded text-duston-muted hover:text-duston-orange hover:bg-duston-bg transition-colors"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-duston-border bg-duston-bg/40 flex items-center justify-between shrink-0">
          <div>
            {step === "review" && (
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="px-3 py-1.5 text-xs font-medium text-duston-muted hover:text-duston-dark"
              >
                &larr; Back to upload
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === "review" && (
              <button
                type="button"
                disabled={isImporting || selectedCount === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-xs font-medium bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl transition-colors shadow-subtle disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <span>Importing items...</span>
                ) : (
                  <>
                    <span>Import {selectedCount} Action {selectedCount === 1 ? "Item" : "Items"}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
