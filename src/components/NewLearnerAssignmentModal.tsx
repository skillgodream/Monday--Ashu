import React, { useState } from 'react';
import { X, UserPlus, Check, BookOpen } from 'lucide-react';
import { ExperienceLevel } from '../types';
import { assignSopToLearner, PilotLearner } from '../utils/pilotManager';
import { FIXTURE_SOPS } from '../data/fixtureSops';
import { sounds } from '../utils/audio';

interface NewLearnerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLearnerAssigned: (newLearner: PilotLearner) => void;
}

export default function NewLearnerAssignmentModal({
  isOpen,
  onClose,
  onLearnerAssigned,
}: NewLearnerAssignmentModalProps) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [role, setRole] = useState('Frontline Operator');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('new');
  const [selectedSopId, setSelectedSopId] = useState('urban-housekeeping-501');

  const sops = [
    {
      id: 'urban-housekeeping-501',
      title: 'Housekeeping Gold Standard SOP (Urban-501)',
      domain: 'Housekeeping',
    },
    {
      id: 'SOP-COLD-808',
      title: 'Commercial Cold-Chain Storage & Temperature Logging (SOP-808)',
      domain: 'Cold-Chain Logistics',
    },
    {
      id: 'SOP-HTL-201',
      title: 'Hotel Guest Room Sanitization & Hygiene (SOP-201)',
      domain: 'Hospitality',
    },
  ];

  const handleAssign = () => {
    if (!name.trim()) return;
    sounds.playTap();

    const sop = sops.find((s) => s.id === selectedSopId) || sops[0];
    const newLearner = assignSopToLearner(
      name.trim(),
      role.trim() || 'Frontline Operator',
      experienceLevel,
      sop.id,
      sop.title,
      sop.domain
    );

    onLearnerAssigned(newLearner);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D121F] border border-white/15 rounded-3xl p-6 text-white space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
              <UserPlus size={14} /> Assign SOP to Frontline Learner
            </div>
            <h2 className="text-lg font-black text-white">New Pilot Registration</h2>
          </div>
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-left">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Learner Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Job Title / Role
            </label>
            <input
              type="text"
              placeholder="e.g. Housekeeping Trainee"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Prior Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['new', 'some', 'experienced'] as ExperienceLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setExperienceLevel(lvl);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                    experienceLevel === lvl
                      ? 'bg-indigo-500 text-white border-indigo-400 shadow-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* SOP Selection */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Select Approved Operational SOP
            </label>
            <select
              value={selectedSopId}
              onChange={(e) => setSelectedSopId(e.target.value)}
              className="w-full h-11 px-3.5 bg-[#121624] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              {sops.map((sop) => (
                <option key={sop.id} value={sop.id}>
                  {sop.title} ({sop.domain})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
          <button
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!name.trim()}
            className={`px-6 py-2.5 rounded-full font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all ${
              name.trim()
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            Assign SOP & Start Pilot <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
