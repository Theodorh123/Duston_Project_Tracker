"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Users,
  Sparkles,
  ArrowRight,
  Trash2,
  FileUp,
  Building,
  Briefcase,
  Layers,
} from "lucide-react";
import { cn, formatShortDate, isTbaDeadline, TBA_DEADLINE } from "@/lib/utils";
import { bulkCreateActionItems } from "@/lib/actions/action-items";
import { useRouter } from "next/navigation";

export interface StagingActionItem {
  id: string;
  selected: boolean;
  itemNumber?: number | string;
  sourceDocument?: string;
  title: string;
  rawResponsible: string;
  matchedUserId: string | null;
  matchedUserName: string | null;
  assigneeId: string;
  coAssignees?: Array<{ id: string; name: string }>;
  isExternal: boolean;
  needsInternalLead?: boolean;
  rawDeadline: string;
  deadline: string; // YYYY-MM-DD
  isDeadlineTBA: boolean;
  assumedTwoWeeks?: boolean;
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
  const [bulkUnassignedAssignee, setBulkUnassignedAssignee] = useState<string>(currentUserId);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Pop-up Modal for Assigning Owners Not in System
  const [showUnmatchedModal, setShowUnmatchedModal] = useState(false);
  const [unmatchedAssignments, setUnmatchedAssignments] = useState<
    Record<string, { assigneeId: string; coAssigneeIds: string[] }>
  >({});
  const [batchLeadOwner, setBatchLeadOwner] = useState<string>(currentUserId);
  const [batchSupportingOwner, setBatchSupportingOwner] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (defaultEntityId) {
        setSelectedEntityId(defaultEntityId);
      } else if (entities.length > 0 && !selectedEntityId) {
        setSelectedEntityId(entities[0].id);
      }
      if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
      }
    }
  }, [isOpen, defaultEntityId, defaultProjectId, entities]);

  // Split a joint deliverable (e.g. Elton / Desmond) into separate individual items
  const handleSplitItem = (idx: number) => {
    const item = items[idx];
    if (!item || !item.coAssignees || item.coAssignees.length === 0) return;

    const primaryItem: StagingActionItem = {
      ...item,
      id: `split-${Date.now()}-0`,
      itemNumber: `${item.itemNumber || idx + 1}.1`,
      coAssignees: [],
      notes: item.notes
        ? `${item.notes} | Split deliverable (Primary Lead)`
        : "Split deliverable (Primary Lead)",
    };

    const splitItems: StagingActionItem[] = item.coAssignees.map((co, cIdx) => ({
      ...item,
      id: `split-${Date.now()}-${cIdx + 1}`,
      itemNumber: `${item.itemNumber || idx + 1}.${cIdx + 2}`,
      assigneeId: co.id,
      coAssignees: [],
      notes: `Joint deliverable with ${item.rawResponsible} | Split to ${co.name}`,
    }));

    const newItems = [...items];
    newItems.splice(idx, 1, primaryItem, ...splitItems);
    setItems(newItems);
  };

  // Split all joint deliverables across the staging table in 1 click
  const handleSplitAllJoint = () => {
    const updated: StagingActionItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.coAssignees && it.coAssignees.length > 0) {
        const primaryItem: StagingActionItem = {
          ...it,
          id: `split-${Date.now()}-${i}-0`,
          itemNumber: `${it.itemNumber || i + 1}.1`,
          coAssignees: [],
          notes: it.notes
            ? `${it.notes} | Split deliverable (Primary Lead)`
            : "Split deliverable (Primary Lead)",
        };
        const splitItems: StagingActionItem[] = it.coAssignees.map((co, cIdx) => ({
          ...it,
          id: `split-${Date.now()}-${i}-${cIdx + 1}`,
          itemNumber: `${it.itemNumber || i + 1}.${cIdx + 2}`,
          assigneeId: co.id,
          coAssignees: [],
          notes: `Joint deliverable with ${it.rawResponsible} | Split to ${co.name}`,
        }));
        updated.push(primaryItem, ...splitItems);
      } else {
        updated.push(it);
      }
    }
    setItems(updated);
  };

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

    // Excel files only (.xlsx, .xls)
    const nonExcel = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext !== "xlsx" && ext !== "xls";
    });

    if (nonExcel.length > 0) {
      setExtractError(
        `Only Excel files (.xlsx, .xls) are allowed. Invalid: ${nonExcel.map((f) => f.name).join(", ")}`
      );
      return;
    }

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
            ? `${files.length} Excel Registers`
            : files[0].name.replace(/\.[^/.]+$/, ""))
      );
      setUploadedDocs(data.documents || []);
      setWarnings(data.warnings || []);

      const stagingList: StagingActionItem[] = (data.items || []).map((it: any) => {
        const isAssumed = Boolean(it.assumedTwoWeeks || it.isDeadlineTBA);
        return {
          id: it.id || Math.random().toString(),
          selected: true,
          itemNumber: it.itemNumber,
          sourceDocument: it.sourceDocument,
          title: it.title,
          rawResponsible: it.rawResponsible || "",
          matchedUserId: it.matchedUserId || null,
          matchedUserName: it.matchedUserName || null,
          assigneeId: it.matchedUserId || currentUserId,
          coAssignees: it.coAssignees || [],
          isExternal: it.isExternal || false,
          needsInternalLead: !it.matchedUserId,
          rawDeadline: it.rawDeadline || "",
          deadline: it.parsedDeadline || formatShortDate(new Date()),
          isDeadlineTBA: isAssumed,
          assumedTwoWeeks: isAssumed,
          priority: it.priority || "medium",
          status: "not_started",
          notes: it.notes,
        };
      });

      setItems(stagingList);

      // Check if any extracted items have owners not in the system
      const unmatched = stagingList.filter((it) => !it.matchedUserId);
      if (unmatched.length > 0) {
        const initialMap: Record<string, { assigneeId: string; coAssigneeIds: string[] }> = {};
        unmatched.forEach((it) => {
          initialMap[it.id] = {
            assigneeId: currentUserId,
            coAssigneeIds: (it.coAssignees || []).map((c) => c.id),
          };
        });
        setUnmatchedAssignments(initialMap);
        setShowUnmatchedModal(true);
      }

      setStep("review");
    } catch (err: any) {
      setExtractError(err.message || "Could not read Excel file. Please ensure it is a valid .xlsx or .xls file.");
    } finally {
      setIsExtracting(false);
    }
  };

  const unmatchedItems = useMemo(() => {
    return items.filter((it) => !it.matchedUserId || it.needsInternalLead);
  }, [items]);

  const handleConfirmUnmatchedOwners = () => {
    const updated = items.map((it) => {
      const assignment = unmatchedAssignments[it.id];
      if (assignment) {
        const coUsers = assignment.coAssigneeIds
          .map((id) => users.find((u) => u.id === id))
          .filter(Boolean) as Array<{ id: string; name: string }>;

        return {
          ...it,
          assigneeId: assignment.assigneeId,
          coAssignees: coUsers,
          needsInternalLead: false,
        };
      }
      return it;
    });
    setItems(updated);
    setShowUnmatchedModal(false);
  };

  const handleBatchApplyLeadToUnmatched = () => {
    setUnmatchedAssignments((prev) => {
      const next = { ...prev };
      unmatchedItems.forEach((it) => {
        next[it.id] = {
          assigneeId: batchLeadOwner,
          coAssigneeIds: next[it.id]?.coAssigneeIds || [],
        };
      });
      return next;
    });
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
          secondaryAssigneeIds: (it.coAssignees || []).map((c) => c.id),
          deadline: it.deadline,
          priority: it.priority,
          status: it.status,
          notes: (() => {
            const parts: string[] = [];
            if (it.notes) parts.push(it.notes);
            if (it.isExternal) {
              parts.push(`Counterparty: ${it.rawResponsible}. In-house follow-up lead assigned.`);
            }
            if (it.coAssignees && it.coAssignees.length > 0) {
              parts.push(`Supporting owners: ${it.coAssignees.map((c) => c.name).join(", ")}`);
            }
            if (it.rawDeadline && it.rawDeadline !== it.deadline) {
              parts.push(`Original timeline in Excel: ${it.rawDeadline}`);
            }
            return parts.length > 0 ? parts.join(" | ") : undefined;
          })(),
          tag: it.isExternal
            ? `Follow-up: ${it.rawResponsible}`
            : it.coAssignees && it.coAssignees.length > 0
            ? `Co-lead: ${it.coAssignees[0].name}`
            : undefined,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2.5 sm:p-5 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] flex flex-col shadow-2xl border border-duston-border overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-duston-border bg-duston-bg/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#023542] text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet size={16} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-duston-dark">
                Import Action Item Register
              </h2>
              <p className="text-[11px] text-duston-muted">
                Extract deliverables directly from Excel spreadsheets (.xlsx, .xls)
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

          {/* STEP 1: UPLOAD EXCEL ONLY */}
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
                  All extracted deliverables from the register will be registered directly under this subsidiary.
                </p>
              </div>

              {/* Excel File Dropzone */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
                    "border-2 border-dashed border-duston-border rounded-2xl p-8 sm:p-10 text-center hover:border-[#1BCECE] hover:bg-duston-bg/40 transition-all cursor-pointer space-y-3.5",
                    isExtracting && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#023542]/5 text-[#023542] flex items-center justify-center mx-auto">
                    <FileSpreadsheet size={28} strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="font-semibold text-duston-dark text-sm block">
                      {isExtracting
                        ? "Extracting action items from Excel..."
                        : "Upload Excel Register (.xlsx, .xls)"}
                    </span>
                    <p className="text-[11px] text-duston-muted mt-1">
                      Drag & drop your Excel workbook or click to browse.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-duston-border rounded-xl text-xs text-duston-dark font-medium shadow-2xs">
                    <Upload size={14} />
                    <span>Browse Excel files</span>
                  </div>
                </div>
              </div>

              {/* Informational Guidance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                    <Calendar size={13} className="text-amber-700" />
                    <span>2-Week Assumed Timeline</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Any action items with non-explicit deadlines (e.g. <strong>TBA</strong>, <strong>TBC</strong>, or blank) automatically assume a <strong>2-week (14 days)</strong> deadline.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[11px]">
                    <Users size={13} className="text-blue-700" />
                    <span>Owner Assignment Pop-up</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    If any action owner in Excel is not found in the system, an assignment pop-up will prompt you to designate the <strong>lead owner</strong> and <strong>supporting owners</strong>.
                  </p>
                </div>
              </div>
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
                      placeholder="Document title..."
                      className="w-full bg-white border border-duston-border rounded-lg px-3 py-2 text-xs text-duston-text outline-none focus:border-[#1BCECE] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-duston-muted font-medium mb-1">
                      Subsidiary
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
                    <span>Record meeting entry in directory</span>
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
                    <span>Batch Extracted across {uploadedDocs.length} documents ({items.length} items):</span>
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

              {/* Smart Batch Helpers Toolbar */}
              <div className="space-y-2">
                {/* 1. External Follow-Up Batch Helper */}
                {items.some((i) => i.isExternal) && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-purple-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center shrink-0">
                        <User size={13} />
                      </div>
                      <div>
                        <span className="font-semibold block">
                          External Deliverables Detected ({items.filter((i) => i.isExternal).length})
                        </span>
                        <p className="text-[11px] text-purple-700">
                          Assigned to external parties. Assign an in-house person to follow up:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <select
                        value={bulkExternalAssignee}
                        onChange={(e) => setBulkExternalAssignee(e.target.value)}
                        className="bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-xs text-duston-dark outline-none focus:border-purple-500 font-medium"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            Follow-up: {u.name}
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
                        Apply to all
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Joint Deliverables Helper */}
                {items.some((i) => i.coAssignees && i.coAssignees.length > 0) && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-200 text-blue-800 flex items-center justify-center shrink-0">
                        <Users size={13} />
                      </div>
                      <div>
                        <span className="font-semibold block">
                          Joint Deliverables Detected ({items.filter((i) => i.coAssignees && i.coAssignees.length > 0).length} items)
                        </span>
                        <p className="text-[11px] text-blue-700">
                          Assigned to multiple people in the minutes. Currently kept with Primary Lead + Co-lead tag, or you can split:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleSplitAllJoint}
                        className="px-3 py-1 bg-[#023542] hover:bg-[#034d61] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                      >
                        Split all joint items into individual tasks
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Unassigned Items Helper */}
                {items.some((i) => i.needsInternalLead && !i.isExternal) && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                        <AlertCircle size={13} />
                      </div>
                      <div>
                        <span className="font-semibold block">
                          Unassigned Deliverables ({items.filter((i) => i.needsInternalLead && !i.isExternal).length} items)
                        </span>
                        <p className="text-[11px] text-amber-700">
                          No explicit owner in minutes. Assign an internal accountable lead to own delivery:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <select
                        value={bulkUnassignedAssignee}
                        onChange={(e) => setBulkUnassignedAssignee(e.target.value)}
                        className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs text-duston-dark outline-none focus:border-amber-500 font-medium"
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
                              it.needsInternalLead && !it.isExternal
                                ? { ...it, assigneeId: bulkUnassignedAssignee, needsInternalLead: false }
                                : it
                            )
                          );
                        }}
                        className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Assign all
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-duston-dark">
                    Extracted Action Items ({items.length})
                  </span>
                  <span className="text-[11px] text-duston-muted">
                    • {selectedCount} selected for import
                  </span>
                  {unmatchedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const initialMap: Record<string, { assigneeId: string; coAssigneeIds: string[] }> = {};
                        unmatchedItems.forEach((it) => {
                          initialMap[it.id] = {
                            assigneeId: it.assigneeId || currentUserId,
                            coAssigneeIds: (it.coAssignees || []).map((c) => c.id),
                          };
                        });
                        setUnmatchedAssignments(initialMap);
                        setShowUnmatchedModal(true);
                      }}
                      className="ml-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Users size={12} className="text-amber-700" />
                      <span>Assign Owners ({unmatchedItems.length})</span>
                    </button>
                  )}
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
                      <th className="py-2.5 px-3">Action Item</th>
                      <th className="py-2.5 px-3 w-56">Assignee</th>
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
                        <td className="py-2 px-3 min-w-[210px]">
                          {item.isExternal ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-medium">
                                <Building size={11} className="shrink-0" />
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
                                Internal lead accountable for follow-up
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {item.needsInternalLead && (
                                <span className="inline-block text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                  Assign Internal Lead
                                </span>
                              )}
                              <select
                                value={item.assigneeId}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].assigneeId = e.target.value;
                                  updated[idx].needsInternalLead = false;
                                  setItems(updated);
                                }}
                                className={cn(
                                  "w-full rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#1BCECE]",
                                  item.needsInternalLead
                                    ? "bg-amber-50/40 border-amber-300 text-amber-900 font-medium"
                                    : "bg-white border-duston-border text-duston-text"
                                )}
                              >
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>

                              {/* Joint Assignees Badge & Split Option */}
                              {item.coAssignees && item.coAssignees.length > 0 && (
                                <div className="p-1.5 bg-blue-50/80 border border-blue-200 rounded-md text-[10px] text-blue-900 flex items-center justify-between gap-1">
                                  <span className="truncate">
                                    Co-lead: <strong>{item.coAssignees.map((c) => c.name).join(", ")}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSplitItem(idx)}
                                    className="text-[10px] font-semibold text-[#023542] hover:text-[#1BCECE] underline shrink-0 cursor-pointer"
                                    title="Split into individual tasks for each person"
                                  >
                                    Split ({item.coAssignees.length + 1})
                                  </button>
                                </div>
                              )}

                              {item.rawResponsible && (!item.coAssignees || item.coAssignees.length === 0) && (
                                <span className="text-[10px] text-duston-muted block truncate" title={`From minutes: ${item.rawResponsible}`}>
                                  From minutes: {item.rawResponsible}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Deadline Date Input */}
                        <td className="py-2 px-3 min-w-[155px]">
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={item.deadline}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].deadline = e.target.value;
                                updated[idx].assumedTwoWeeks = false;
                                updated[idx].isDeadlineTBA = false;
                                setItems(updated);
                              }}
                              className="w-full bg-white border border-duston-border rounded-lg px-2 py-1.5 text-xs text-duston-text outline-none focus:border-[#1BCECE]"
                            />
                            {item.assumedTwoWeeks && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                ⏱️ 2 weeks assumed
                              </span>
                            )}
                            {item.rawDeadline && item.rawDeadline !== item.deadline && (
                              <span
                                className="block text-[10px] text-duston-muted truncate max-w-[140px]"
                                title={item.rawDeadline}
                              >
                                Excel: {item.rawDeadline}
                              </span>
                            )}
                          </div>
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

      {/* Pop-up Modal for Assigning Owners Not in System */}
      {showUnmatchedModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-duston-border overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-duston-border bg-duston-bg/60 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-duston-dark">
                    Assign Action Item Owners
                  </h3>
                  <p className="text-[11px] text-duston-muted mt-0.5">
                    {unmatchedItems.length} {unmatchedItems.length === 1 ? "deliverable has an owner" : "deliverables have owners"} not currently in the system. Please designate the lead owner and any supporting owners.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnmatchedModal(false)}
                className="p-1.5 rounded-lg text-duston-muted hover:text-duston-dark hover:bg-duston-bg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Batch Assignment Helper */}
              {unmatchedItems.length > 1 && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-700" />
                      <span>Quick Batch Assign to All ({unmatchedItems.length} items)</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={batchLeadOwner}
                      onChange={(e) => setBatchLeadOwner(e.target.value)}
                      className="w-full sm:w-auto flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] font-medium"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          Set Lead: {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleBatchApplyLeadToUnmatched}
                      className="w-full sm:w-auto px-3.5 py-1.5 bg-[#023542] hover:bg-[#1BCECE] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs shrink-0 cursor-pointer"
                    >
                      Apply Lead to All
                    </button>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {unmatchedItems.map((item, idx) => {
                  const assignment = unmatchedAssignments[item.id] || {
                    assigneeId: currentUserId,
                    coAssigneeIds: [],
                  };

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-duston-border rounded-xl space-y-3 shadow-2xs hover:border-duston-border/80 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-duston-bg text-duston-dark font-semibold">
                            #{item.itemNumber || idx + 1}
                          </span>
                          <span className="font-medium text-duston-dark leading-snug">
                            {item.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                          <span>Owner from Excel:</span>
                          <strong className="underline bg-amber-100/70 px-1.5 py-0.2 rounded text-amber-900">
                            {item.rawResponsible || "(Unassigned / Blank)"}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-duston-border/60">
                        {/* Lead Owner Select */}
                        <div>
                          <label className="block text-[11px] font-semibold text-duston-dark mb-1">
                            Primary Lead Owner *
                          </label>
                          <select
                            value={assignment.assigneeId}
                            onChange={(e) => {
                              const newAssigneeId = e.target.value;
                              setUnmatchedAssignments((prev) => ({
                                ...prev,
                                [item.id]: {
                                  assigneeId: newAssigneeId,
                                  coAssigneeIds: (prev[item.id]?.coAssigneeIds || []).filter(
                                    (id) => id !== newAssigneeId
                                  ),
                                },
                              }));
                            }}
                            className="w-full bg-white border border-duston-border rounded-lg px-2.5 py-1.5 text-xs text-duston-dark outline-none focus:border-[#1BCECE] font-medium"
                          >
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Supporting Owners Multi-select Checkboxes */}
                        <div>
                          <label className="block text-[11px] font-semibold text-duston-dark mb-1">
                            Supporting Owner(s)
                            <span className="text-[10px] text-duston-muted font-normal ml-1">
                              ({assignment.coAssigneeIds.length} selected)
                            </span>
                          </label>
                          <div className="max-h-28 overflow-y-auto border border-duston-border rounded-lg p-1.5 space-y-1 bg-duston-bg/20">
                            {users
                              .filter((u) => u.id !== assignment.assigneeId)
                              .map((u) => {
                                const isChecked = assignment.coAssigneeIds.includes(u.id);
                                return (
                                  <label
                                    key={u.id}
                                    className="flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-white cursor-pointer select-none text-[11px] text-duston-text"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const newCoIds = e.target.checked
                                          ? [...assignment.coAssigneeIds, u.id]
                                          : assignment.coAssigneeIds.filter((id) => id !== u.id);
                                        setUnmatchedAssignments((prev) => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            coAssigneeIds: newCoIds,
                                          },
                                        }));
                                      }}
                                      className="rounded border-duston-border text-[#023542] focus:ring-0"
                                    />
                                    <span className="truncate">{u.name}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-duston-border bg-duston-bg/40 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowUnmatchedModal(false)}
                className="px-4 py-2 text-xs font-medium text-duston-muted hover:text-duston-dark hover:bg-duston-bg rounded-xl transition-colors cursor-pointer"
              >
                Skip / Adjust in table
              </button>
              <button
                type="button"
                onClick={handleConfirmUnmatchedOwners}
                className="px-5 py-2 text-xs font-semibold bg-[#023542] hover:bg-[#1BCECE] text-white rounded-xl transition-colors shadow-subtle flex items-center gap-2 cursor-pointer"
              >
                <span>Save Owners & Continue</span>
                <CheckCircle2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
