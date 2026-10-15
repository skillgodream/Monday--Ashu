/**
 * GURU COACH LMS - PHASE 4 MANAGER TEAM & ASSIGNMENT STUDIO
 *
 * Provides complete operational interface for Managers to:
 * 1. View & manage teams and team members within their organization.
 * 2. Select published learning assets available to the organization.
 * 3. Assign published learning journeys to frontline workers or teams with start/due date scheduling.
 * 4. Monitor assignment status and progress across teams.
 * 5. Update or cancel assignments cleanly without destroying audit history.
 * 6. Inspect organization team & assignment audit logs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Shield,
  Layers,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { getApiHeaders } from '../utils/apiHelper';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';
import { ManagerReportView } from './ReportingViews.js';

interface Team {
  id: string;
  name: string;
  department: string;
  manager_id: string | null;
  manager_name?: string;
  member_count?: number;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  job_title: string;
  badge_id?: string;
}

interface PublishedAsset {
  id: string;
  title: string;
  subtitle?: string;
  role_target: string;
  status: string;
  approved_at?: string;
}

interface Assignment {
  id: string;
  organization_id: string;
  learning_asset_id: string;
  user_id: string;
  assigned_by: string | null;
  user_name?: string;
  user_email?: string;
  user_job_title?: string;
  team_name?: string;
  asset_title?: string;
  asset_role_target?: string;
  status: string;
  progress_pct: number;
  start_date?: string;
  due_date?: string;
  assigned_at: string;
}

interface AuditEvent {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

export function ManagerTeamStudio() {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'teams' | 'assign' | 'monitor' | 'audit' | 'report'>('teams');

  // Data states
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamRoster, setTeamRoster] = useState<User[]>([]);
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [publishedAssets, setPublishedAssets] = useState<PublishedAsset[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Loading & Error states
  const [loading, setLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDept, setNewTeamDept] = useState('');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMemberUserId, setSelectedMemberUserId] = useState('');

  // Assignment creation form states
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignRecipientType, setAssignRecipientType] = useState<'user' | 'team'>('team');
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignDueDate, setAssignDueDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Filters
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Data Fetch
  const fetchAllData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const headers = getApiHeaders();

      // Fetch Teams
      const teamsRes = await fetch('/api/manager/teams', { headers });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
        if (teamsData.teams?.length > 0 && !selectedTeam) {
          setSelectedTeam(teamsData.teams[0]);
        }
      }

      // Fetch Org Users
      const usersRes = await fetch('/api/manager/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setOrgUsers(usersData.users || []);
      }

      // Fetch Published Assets
      const assetsRes = await fetch('/api/manager/published-assets', { headers });
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setPublishedAssets(assetsData.assets || []);
        if (assetsData.assets?.length > 0 && !assignAssetId) {
          setAssignAssetId(assetsData.assets[0].id);
        }
      }

      // Fetch Assignments
      const assignRes = await fetch('/api/manager/assignments', { headers });
      if (assignRes.ok) {
        const assignData = await assignRes.json();
        setAssignments(assignData.assignments || []);
      }

      // Fetch Audit Trail
      const auditRes = await fetch('/api/manager/audit-trail', { headers });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditEvents(auditData.events || []);
      }
    } catch (err: any) {
      setErrorNotice('Failed to connect to manager services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Team Roster when selected team changes
  useEffect(() => {
    if (!selectedTeam) return;
    const fetchRoster = async () => {
      try {
        const headers = getApiHeaders();
        const res = await fetch(`/api/manager/teams/${selectedTeam.id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setTeamRoster(data.roster || []);
        }
      } catch (err) {
        console.error('Failed to fetch team roster:', err);
      }
    };
    fetchRoster();
  }, [selectedTeam]);

  // Create Team Handler
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDept.trim()) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const headers = getApiHeaders();
      const res = await fetch('/api/manager/teams', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          department: newTeamDept.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create team');
      }

      sounds.playTap();
      setSuccessNotice(`Team "${data.team.name}" created successfully!`);
      setNewTeamName('');
      setNewTeamDept('');
      setIsCreateTeamOpen(false);
      fetchAllData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error creating team');
    }
  };

  // Add Member to Team Handler
  const handleAddMember = async () => {
    if (!selectedTeam || !selectedMemberUserId) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const headers = getApiHeaders();
      const res = await fetch(`/api/manager/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedMemberUserId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add member to team');
      }

      sounds.playTap();
      setSuccessNotice('Team member added successfully!');
      setIsAddMemberOpen(false);
      setSelectedMemberUserId('');

      // Refresh Roster
      const rosterRes = await fetch(`/api/manager/teams/${selectedTeam.id}`, { headers });
      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setTeamRoster(rosterData.roster || []);
      }
      fetchAllData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error adding team member');
    }
  };

  // Remove Member from Team Handler
  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const headers = getApiHeaders();
      const res = await fetch(`/api/manager/teams/${selectedTeam.id}/members/${userId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove member');
      }

      sounds.playTap();
      setSuccessNotice('Member removed from team.');
      setTeamRoster((prev) => prev.filter((u) => u.id !== userId));
      fetchAllData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error removing team member');
    }
  };

  // Validate Dates Order
  useEffect(() => {
    if (assignStartDate && assignDueDate) {
      const start = new Date(assignStartDate).getTime();
      const due = new Date(assignDueDate).getTime();
      if (due < start) {
        setDateError('Due date cannot be set before start date.');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [assignStartDate, assignDueDate]);

  // Create Assignment Handler
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignAssetId) return;
    if (dateError) return;

    setErrorNotice(null);
    setSuccessNotice(null);

    const payload: any = {
      learning_asset_id: assignAssetId,
      recipient_type: assignRecipientType,
      start_date: assignStartDate,
      due_date: assignDueDate || null,
    };

    if (assignRecipientType === 'team') {
      if (!assignTeamId) {
        setErrorNotice('Please select a target team.');
        return;
      }
      payload.team_id = assignTeamId;
    } else {
      if (!assignUserId) {
        setErrorNotice('Please select a target frontline worker.');
        return;
      }
      payload.user_id = assignUserId;
    }

    try {
      const headers = getApiHeaders();
      const res = await fetch('/api/manager/assignments', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create assignment');
      }

      sounds.playTap();
      setSuccessNotice(`Successfully created ${data.count || 1} assignment(s)!`);
      setActiveTab('monitor');
      fetchAllData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error creating assignment');
    }
  };

  // Cancel Assignment Handler
  const handleCancelAssignment = async (assignmentId: string) => {
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const headers = getApiHeaders();
      const res = await fetch(`/api/manager/assignments/${assignmentId}/cancel`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel assignment');
      }

      sounds.playTap();
      setSuccessNotice('Assignment cancelled safely.');
      fetchAllData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Error cancelling assignment');
    }
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchStatus =
        assignmentStatusFilter === 'all' || a.status === assignmentStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        a.user_name?.toLowerCase().includes(q) ||
        a.asset_title?.toLowerCase().includes(q) ||
        a.team_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [assignments, assignmentStatusFilter, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 text-white space-y-6 font-sans">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
              <Shield size={12} /> Manager Operations Center
            </span>
            <span className="text-xs text-slate-400 font-medium">Tenant-Scoped Workflow</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Team & Assignment Studio
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-1.5 rounded-2xl flex-wrap">
          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('teams');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={14} /> Teams ({teams.length})
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('assign');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'assign'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} /> Assign Content
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('monitor');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={14} /> Active Assignments ({assignments.length})
          </button>

          <button
            onClick={() => {
              sounds.playTap();
              setActiveTab('audit');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={14} /> Audit History
          </button>
        </div>
      </div>

      {/* Global Notices */}
      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-white cursor-pointer">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* TAB 1: TEAMS MANAGEMENT */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teams List Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} /> Organization Teams
              </h2>
              <button
                onClick={() => {
                  sounds.playTap();
                  setIsCreateTeamOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md cursor-pointer transition-all"
              >
                <Plus size={14} /> New Team
              </button>
            </div>

            <div className="space-y-2">
              {teams.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-slate-400 text-xs">
                  No teams created yet. Click "New Team" to create one.
                </div>
              ) : (
                teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      sounds.playTap();
                      setSelectedTeam(t);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      selectedTeam?.id === t.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-extrabold text-sm text-white">{t.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                        {t.member_count || 0} members
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.department}</p>
                    {t.manager_name && (
                      <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                        Manager: {t.manager_name}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Team Roster View */}
          <div className="md:col-span-2 space-y-4">
            {selectedTeam ? (
              <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 text-left space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 tracking-wider">
                      {selectedTeam.department} Department
                    </span>
                    <h2 className="text-xl font-black text-white">{selectedTeam.name} Roster</h2>
                  </div>
                  <button
                    onClick={() => {
                      sounds.playTap();
                      setIsAddMemberOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/10 cursor-pointer transition-all self-start sm:self-auto"
                  >
                    <UserPlus size={14} /> Add Team Member
                  </button>
                </div>

                {/* Member Roster List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Assigned Employees ({teamRoster.length})
                  </h3>

                  {teamRoster.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-slate-400 text-xs">
                      This team currently has no members. Click "Add Team Member" to add employees from your organization.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {teamRoster.map((member) => (
                        <div
                          key={member.id}
                          className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                        >
                          <div>
                            <p className="font-bold text-xs text-white">{member.full_name}</p>
                            <p className="text-[11px] text-slate-400">{member.job_title}</p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono uppercase mt-1 inline-block">
                              {member.role}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove from team"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border border-white/10 rounded-3xl bg-white/5 text-slate-400 text-xs">
                Select a team on the left to view its member roster.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGN CONTENT */}
      {activeTab === 'assign' && (
        <div className="max-w-2xl mx-auto bg-[#0D121F] border border-white/10 rounded-3xl p-6 text-left space-y-6">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 tracking-wider">
              Published Courseware Selection
            </span>
            <h2 className="text-xl font-black text-white">Create Learning Assignment</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an approved SOP and assign it to individual frontline workers or a full team with start and due dates.
            </p>
          </div>

          <form onSubmit={handleCreateAssignment} className="space-y-5">
            {/* 1. Select Published Asset */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                1. Select Published Learning Asset
              </label>
              {publishedAssets.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  No published SOP assets found for your organization. Please ask an Admin to approve and publish content first.
                </div>
              ) : (
                <select
                  value={assignAssetId}
                  onChange={(e) => setAssignAssetId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#121624] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  {publishedAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.role_target})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Recipient Type Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                2. Recipient Selection Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setAssignRecipientType('team');
                  }}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    assignRecipientType === 'team'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Users size={16} /> Assign Full Team
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setAssignRecipientType('user');
                  }}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    assignRecipientType === 'user'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <UserPlus size={16} /> Individual Worker
                </button>
              </div>
            </div>

            {/* Recipient Target Dropdown */}
            {assignRecipientType === 'team' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Target Team
                </label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#121624] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department} - {t.member_count || 0} members)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Target Frontline Worker
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#121624] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="">-- Choose Worker --</option>
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.job_title} - {u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Scheduling Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#121624] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className={`w-full h-11 px-3.5 bg-[#121624] border rounded-xl text-xs text-white focus:outline-none ${
                    dateError ? 'border-rose-500' : 'border-white/15 focus:border-emerald-400'
                  }`}
                />
              </div>
            </div>

            {dateError && (
              <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                <AlertCircle size={14} /> {dateError}
              </p>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!assignAssetId || !!dateError || publishedAssets.length === 0}
                className={`px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all ${
                  assignAssetId && !dateError && publishedAssets.length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                Create Assignment <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MONITOR & MANAGE ASSIGNMENTS */}
      {activeTab === 'monitor' && (
        <div className="space-y-4 text-left">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D121F] border border-white/10 p-4 rounded-2xl">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search worker name or SOP title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <select
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                className="h-9 px-3 bg-[#121624] border border-white/10 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="certified">Certified</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Assignments List */}
          <div className="space-y-3">
            {filteredAssignments.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 text-slate-400 text-xs">
                No active assignments match your search filter.
              </div>
            ) : (
              filteredAssignments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-2xl bg-[#0D121F] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all"
                >
                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{a.user_name}</span>
                      <span className="text-xs text-slate-400">• {a.user_job_title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                        Team: {a.team_name || 'Individual'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <BookOpen size={12} /> {a.asset_title}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Start: {a.start_date ? new Date(a.start_date).toLocaleDateString() : 'N/A'}</span>
                      <span>Due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No Due Date'}</span>
                      <span>Progress: <strong className="text-white">{a.progress_pct}%</strong></span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider ${
                        a.status === 'certified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : a.status === 'cancelled'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : a.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {a.status}
                    </span>

                    {a.status !== 'cancelled' && a.status !== 'certified' && (
                      <button
                        onClick={() => handleCancelAssignment(a.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT HISTORY */}
      {activeTab === 'audit' && (
        <div className="bg-[#0D121F] border border-white/10 rounded-3xl p-6 text-left space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <FileText size={18} className="text-emerald-400" /> Organization Audit Events
          </h2>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No audit events recorded yet.</p>
            ) : (
              auditEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-emerald-300 font-mono">{evt.action}</span>
                    <span className="text-slate-400 ml-2">[{evt.target_type}]</span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {JSON.stringify(evt.details)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evt.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'report' && <ManagerReportView />}

      {/* Create Team Modal */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D121F] border border-white/15 rounded-3xl p-6 text-white space-y-4 text-left">
            <h3 className="text-lg font-black">Create New Organization Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cold Chain Ops - Night Shift"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Cold Storage Logistics"
                  value={newTeamDept}
                  onChange={(e) => setNewTeamDept(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim() || !newTeamDept.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D121F] border border-white/15 rounded-3xl p-6 text-white space-y-4 text-left">
            <h3 className="text-lg font-black">Add Member to {selectedTeam.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Select Employee</label>
                <select
                  value={selectedMemberUserId}
                  onChange={(e) => setSelectedMemberUserId(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#121624] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 mt-1 cursor-pointer"
                >
                  <option value="">-- Choose Employee --</option>
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.job_title} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!selectedMemberUserId}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
