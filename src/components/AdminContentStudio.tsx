import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  Edit3,
  Eye,
  Send,
  Plus,
  History,
  FileCheck,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Lock,
  ChevronRight,
  BookOpen,
  Info,
  Sparkles,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { AdminReportView } from './ReportingViews.js';

interface SourceDocumentItem {
  id: string;
  doc_code: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  version_count: number;
  latest_version?: {
    id: string;
    version_number: number;
    version_label: string;
    original_filename: string;
    word_count: number;
    page_count: number;
    is_active: boolean;
    created_at: string;
  };
  latest_asset?: {
    id: string;
    title: string;
    subtitle?: string;
    role_target: string;
    status: 'draft' | 'processing' | 'review' | 'approved' | 'published' | 'failed' | 'archived';
    approved_at?: string;
    approved_by?: string;
  };
}

interface LearningAssetDetail {
  id: string;
  title: string;
  subtitle?: string;
  role_target: string;
  status: 'draft' | 'processing' | 'review' | 'approved' | 'published' | 'failed' | 'archived';
  approved_at?: string;
  approved_by?: string;
  operational_blueprint?: any;
  canonical_task_model?: any;
  know_it_plan?: any;
  simulator_steps?: any[];
}

interface AuditLogItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
}

export const AdminContentStudio: React.FC = () => {
  const { currentUser, role, idToken, isDemo, activePersona } = useAuth();

  const [activeTab, setActiveTab] = useState<'documents' | 'ingest' | 'audit' | 'report'>('documents');
  const [documents, setDocuments] = useState<SourceDocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SourceDocumentItem | null>(null);
  const [docVersions, setDocVersions] = useState<any[]>([]);
  const [docAssets, setDocAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<LearningAssetDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Ingestion Form State
  const [ingestFilename, setIngestFilename] = useState('');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('General');
  const [ingestDocCode, setIngestDocCode] = useState('');
  const [ingestRoleTarget, setIngestRoleTarget] = useState('Frontline Operator');
  const [ingestRawText, setIngestRawText] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Editing Modal State
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editRoleTarget, setEditRoleTarget] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New Version Modal State
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [revisionFilename, setRevisionFilename] = useState('');
  const [revisionText, setRevisionText] = useState('');
  const [revisionChangeSummary, setRevisionChangeSummary] = useState('');

  // Fetch Headers
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    } else if (isDemo || role === 'admin') {
      headers['x-dev-persona'] = 'admin';
    }
    return headers;
  }, [idToken, isDemo, role]);

  // Load Source Documents
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/content/documents', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load content: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content/audit-trail?limit=25', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAuditLogs(data.events || []);
        }
      }
    } catch (_) {}
  }, [getAuthHeaders]);

  useEffect(() => {
    if (role === 'admin') {
      loadDocuments();
      loadAuditLogs();
    }
  }, [role, loadDocuments, loadAuditLogs]);

  // View Document Details
  const handleSelectDocument = async (doc: SourceDocumentItem) => {
    sounds.playTap();
    setSelectedDoc(doc);
    setSelectedAsset(null);
    try {
      const res = await fetch(`/api/admin/content/documents/${doc.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDocVersions(data.versions || []);
          setDocAssets(data.assets || []);
          if (data.assets && data.assets.length > 0) {
            setSelectedAsset(data.assets[0]);
          }
        }
      }
    } catch (err: any) {
      setError('Failed to fetch document details.');
    }
  };

  // Ingest SOP Document
  const handleIngestSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngestError(null);
    if (!ingestRawText.trim()) {
      setIngestError('Please paste or upload SOP text content.');
      return;
    }

    setIsIngesting(true);
    try {
      const res = await fetch('/api/admin/content/ingest', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filename: ingestFilename.trim() || 'SOP_Document.txt',
          rawText: ingestRawText.trim(),
          title: ingestTitle.trim() || undefined,
          category: ingestCategory,
          docCode: ingestDocCode.trim() || undefined,
          roleTarget: ingestRoleTarget.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === 'VALIDATION_FAILED') {
          setIngestError(`Source Validation Rejected (${data.errorCategory}): ${data.errorReason}`);
        } else {
          setIngestError(data.message || 'Ingestion failed.');
        }
        return;
      }

      sounds.playCorrect();
      setSuccessMsg(`Successfully ingested "${data.document.title}" (v1.0)! Courseware created in Draft mode.`);
      setIngestRawText('');
      setIngestFilename('');
      setIngestTitle('');
      setIngestDocCode('');
      loadDocuments();
      loadAuditLogs();
      setActiveTab('documents');
      if (data.document) {
        handleSelectDocument(data.document);
      }
    } catch (err: any) {
      setIngestError(err?.message || 'Server error during ingestion.');
    } finally {
      setIsIngesting(false);
    }
  };

  // Upload Revision (New Version)
  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!revisionText.trim()) {
      setError('Please provide revised SOP text.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content/documents/${selectedDoc.id}/new-version`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          filename: revisionFilename || `${selectedDoc.title}_revised.txt`,
          rawText: revisionText.trim(),
          changeSummary: revisionChangeSummary.trim() || 'Updated procedure steps',
          roleTarget: selectedAsset?.role_target || 'Operator',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to create new revision.');
        return;
      }

      sounds.playCorrect();
      setSuccessMsg(`Created Version ${data.version.version_label} for "${selectedDoc.title}". Previous version preserved.`);
      setIsNewVersionModalOpen(false);
      setRevisionText('');
      setRevisionFilename('');
      setRevisionChangeSummary('');
      handleSelectDocument(selectedDoc);
      loadDocuments();
    } catch (err: any) {
      setError(err?.message || 'Error creating revision.');
    } finally {
      setLoading(false);
    }
  };

  // Save Edited Metadata
  const handleSaveMetadata = async () => {
    if (!selectedAsset) return;
    try {
      const res = await fetch(`/api/admin/content/assets/${selectedAsset.id}/metadata`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editTitle,
          subtitle: editSubtitle,
          roleTarget: editRoleTarget,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sounds.playCorrect();
        setSuccessMsg('Asset metadata updated cleanly without modifying source text provenance.');
        setSelectedAsset(data.asset);
        setIsEditModalOpen(false);
        loadDocuments();
      }
    } catch (err: any) {
      setError('Failed to update metadata.');
    }
  };

  // Publish / Approve Asset
  const handlePublishAsset = async (assetId: string) => {
    sounds.playTap();
    try {
      const res = await fetch(`/api/admin/content/assets/${assetId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sounds.playCorrect();
        setSuccessMsg(`Published content "${data.asset.title}". Now live for training!`);
        if (selectedAsset?.id === assetId) {
          setSelectedAsset(data.asset);
        }
        if (selectedDoc) {
          handleSelectDocument(selectedDoc);
        }
        loadDocuments();
        loadAuditLogs();
      } else {
        setError(data.message || 'Failed to publish asset.');
      }
    } catch (err: any) {
      setError('Server error during publication.');
    }
  };

  // Role Protection Check
  if (role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto p-6 my-8 rounded-2xl bg-stone-900 border border-amber-500/30 text-stone-200 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-400 mb-3">
          <Shield className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Admin Privileges Required</h2>
            <p className="text-xs text-stone-400">
              Content Management operations are restricted strictly to authorized Administrators.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-black/40 border border-stone-800 text-xs text-stone-300">
          Current Role: <span className="font-semibold text-amber-300 uppercase">{role}</span>
          <p className="mt-2 text-stone-400">
            Switch persona to <strong>Rajesh Patel (Admin)</strong> in the top header widget to access Content Management.
          </p>
        </div>
      </div>
    );
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doc_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Published
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            In Review
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Failed
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-500/20 text-stone-400 border border-stone-600">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <FileText className="w-3 h-3 text-sky-400" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-stone-100 space-y-6">
      {/* Top Banner & Stats */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-stone-900/90 to-stone-900 border border-stone-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
                Enterprise Content Management
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Content Studio</h1>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              Ingest, review, approve, publish, and version SOP learning content with cryptographic source provenance and tenant boundary enforcement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('ingest');
                sounds.playTap();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ingest New SOP</span>
            </button>
            <button
              onClick={loadDocuments}
              title="Refresh Content"
              className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-800/80 text-xs">
          <div className="bg-black/30 p-3 rounded-xl border border-stone-800">
            <div className="text-stone-400 text-[11px]">Source Documents</div>
            <div className="text-lg font-bold text-white mt-0.5">{documents.length}</div>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-stone-800">
            <div className="text-stone-400 text-[11px]">Published Assets</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {documents.filter((d) => d.latest_asset?.status === 'approved' || d.latest_asset?.status === 'published').length}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-stone-800">
            <div className="text-stone-400 text-[11px]">Drafts in Review</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {documents.filter((d) => d.latest_asset?.status === 'draft' || d.latest_asset?.status === 'review').length}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded-xl border border-stone-800">
            <div className="text-stone-400 text-[11px]">Total Versions</div>
            <div className="text-lg font-bold text-sky-400 mt-0.5">
              {documents.reduce((acc, d) => acc + (d.version_count || 1), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => {
            setActiveTab('documents');
            sounds.playTap();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Organization SOP Library ({documents.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('ingest');
            sounds.playTap();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ingest'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Ingestion Pipeline</span>
        </button>

          <button
          onClick={() => {
            setActiveTab('audit');
            sounds.playTap();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Compliance Audit Log ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('report');
            sounds.playTap();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'report'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Admin Operational Reports</span>
        </button>
      </div>

      {/* TAB 1: DOCUMENTS & REVIEW WORKFLOW */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Document List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search code or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="General">General</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Logistics">Logistics</option>
                <option value="Safety">Safety</option>
              </select>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center bg-stone-900/50 rounded-2xl border border-stone-800 text-stone-500 text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No source documents found in organization.</p>
                  <button
                    onClick={() => setActiveTab('ingest')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  >
                    Ingest First SOP
                  </button>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  const latestVer = doc.latest_version;
                  const latestAsset = doc.latest_asset;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => handleSelectDocument(doc)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/40'
                          : 'bg-stone-900/80 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                            {doc.doc_code}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-1.5">{doc.title}</h3>
                        </div>
                        {getStatusBadge(latestAsset?.status)}
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-[11px] text-stone-400 border-t border-stone-800/80 pt-2.5">
                        <span className="bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                          {doc.category}
                        </span>
                        <span>
                          Ver: <strong className="text-white">{latestVer?.version_label || 'v1.0'}</strong>
                        </span>
                        <span>{latestVer?.word_count || 0} words</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detailed Document & Asset Inspector */}
          <div className="lg:col-span-7 bg-stone-900/90 border border-stone-800 rounded-2xl p-5 min-h-[500px]">
            {selectedDoc ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-stone-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{selectedDoc.doc_code}</span>
                      <span className="text-xs text-stone-500">• {selectedDoc.category}</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white mt-1">{selectedDoc.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsNewVersionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload Revision</span>
                    </button>

                    {selectedAsset && selectedAsset.status !== 'approved' && selectedAsset.status !== 'published' && (
                      <button
                        onClick={() => handlePublishAsset(selectedAsset.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish & Approve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Versions Lineage Section */}
                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>Revision History ({docVersions.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-2">
                    {docVersions.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          v.is_active
                            ? 'bg-amber-950/20 border-amber-500/40 text-stone-200'
                            : 'bg-stone-950/40 border-stone-800/80 text-stone-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/50">
                            {v.version_label}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{v.original_filename}</div>
                            <div className="text-[10px] text-stone-500">
                              {v.word_count} words • Hash: {v.content_hash.slice(0, 10)}...
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {v.is_active ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                              ACTIVE REVISION
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-500">Historical</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Courseware Asset Review */}
                {selectedAsset && (
                  <div className="space-y-4 pt-2 border-t border-stone-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Generated Courseware Asset</span>
                      </h4>

                      <button
                        onClick={() => {
                          setEditTitle(selectedAsset.title);
                          setEditSubtitle(selectedAsset.subtitle || '');
                          setEditRoleTarget(selectedAsset.role_target);
                          setIsEditModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Metadata</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-stone-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-white">{selectedAsset.title}</h3>
                        {getStatusBadge(selectedAsset.status)}
                      </div>

                      {selectedAsset.subtitle && (
                        <p className="text-xs text-stone-400">{selectedAsset.subtitle}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-stone-300 pt-2 border-t border-stone-800/60">
                        <div>
                          Target Role: <strong className="text-amber-300">{selectedAsset.role_target}</strong>
                        </div>
                        {selectedAsset.approved_at && (
                          <div className="text-stone-400">
                            Approved: {new Date(selectedAsset.approved_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Blueprint Details */}
                    {selectedAsset.operational_blueprint && (
                      <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-3 text-xs">
                        <div className="font-bold text-stone-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>DEAN Operational Blueprint Summary</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-stone-400">
                          <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                            Process Name: <span className="text-white font-semibold">{selectedAsset.operational_blueprint.process || 'N/A'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                            Operational Steps: <span className="text-white font-semibold">{selectedAsset.operational_blueprint.operational_steps?.length || 0}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                            Critical Controls: <span className="text-amber-300 font-semibold">{selectedAsset.operational_blueprint.critical_controls?.length || 0}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                            Decision Points: <span className="text-sky-300 font-semibold">{selectedAsset.operational_blueprint.decision_points?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 text-xs py-20">
                <FileText className="w-12 h-12 opacity-30 mb-2" />
                <p>Select a source document from the library to inspect versions and review courseware.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INGESTION PIPELINE */}
      {activeTab === 'ingest' && (
        <div className="max-w-3xl mx-auto bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-2xl">
          <div className="border-b border-stone-800 pb-4 mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>SOP Ingestion & Intelligence Pipeline</span>
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Upload or paste raw Standard Operating Procedure text. DEAN will validate source fidelity, extract operational steps, build the Knowledge Model, and generate draft 4-Stage courseware.
            </p>
          </div>

          <form onSubmit={handleIngestSop} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Document Filename *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SOP-HSK-501.txt"
                  value={ingestFilename}
                  onChange={(e) => setIngestFilename(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  SOP Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room Sanitization & Turnover"
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Document Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOP-HSK-501"
                  value={ingestDocCode}
                  onChange={(e) => setIngestDocCode(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Target Operator Role
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Guest Room Attendant"
                  value={ingestRoleTarget}
                  onChange={(e) => setIngestRoleTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Category
              </label>
              <select
                value={ingestCategory}
                onChange={(e) => setIngestCategory(e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-stone-300 focus:outline-none"
              >
                <option value="General">General Operations</option>
                <option value="Housekeeping">Housekeeping & Sanitization</option>
                <option value="Logistics">Warehouse & Logistics</option>
                <option value="Safety">Safety & Compliance</option>
                <option value="Inventory">Inventory Management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Raw SOP Text Content *
              </label>
              <textarea
                rows={10}
                required
                placeholder="Paste verbatim SOP content here (must include clear operational tasks, safety rules, or escalation steps)..."
                value={ingestRawText}
                onChange={(e) => setIngestRawText(e.target.value)}
                className="w-full p-3 bg-black/40 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {ingestError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{ingestError}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isIngesting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isIngesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing DEAN Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Ingest & Generate Courseware</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Compliance Audit Log</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Append-only log recording content creation, metadata updates, approvals, and revisions.
              </p>
            </div>

            <button
              onClick={loadAuditLogs}
              className="p-2 rounded-lg bg-stone-800 text-stone-300 text-xs hover:bg-stone-700"
            >
              Refresh Log
            </button>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs">No audit events recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-black/40 border border-stone-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      {log.action}
                    </span>
                    <div>
                      <span className="text-stone-300 font-semibold">{log.target_type}</span>
                      <span className="text-stone-500 ml-2 text-[11px]">({log.target_id.slice(0, 8)}...)</span>
                    </div>
                  </div>

                  <div className="text-stone-400 text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT METADATA */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 text-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Asset Metadata</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Role Target</label>
                <input
                  type="text"
                  value={editRoleTarget}
                  onChange={(e) => setEditRoleTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs font-medium text-stone-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMetadata}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD REVISION */}
      {isNewVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4 text-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Upload New Revision</h3>
                <p className="text-xs text-stone-400">Target: {selectedDoc.title}</p>
              </div>
              <button onClick={() => setIsNewVersionModalOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewVersion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Change Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Added heavy freight double-wrap rule"
                  value={revisionChangeSummary}
                  onChange={(e) => setRevisionChangeSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-black/40 border border-stone-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Revised SOP Text *</label>
                <textarea
                  rows={8}
                  required
                  placeholder="Paste revised SOP text..."
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                  className="w-full p-3 bg-black/40 border border-stone-800 rounded-xl text-xs text-stone-200 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 text-xs font-medium text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-bold text-stone-950 hover:bg-amber-400"
                >
                  {loading ? 'Processing...' : 'Create Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
