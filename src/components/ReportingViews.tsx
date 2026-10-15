import React, { useState, useEffect } from 'react';
import { getApiHeaders } from '../utils/apiHelper';

export function ManagerReportView() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/manager/reports', { headers: getApiHeaders() })
      .then(res => res.json())
      .then(data => setReports(data.reports || []));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Team Reporting</h2>
      <div className="bg-[#12151E] p-4 rounded-xl border border-white/10">
        {reports.map(r => (
            <div key={r.id} className="border-b border-white/5 py-2 text-white">
                {r.asset_title} - {r.status} ({r.progress_pct}%)
            </div>
        ))}
      </div>
    </div>
  );
}

export function AdminReportView() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/reports', { headers: getApiHeaders() })
      .then(res => res.json())
      .then(data => setReports(data.reports || []));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Admin Reporting</h2>
      <div className="bg-[#12151E] p-4 rounded-xl border border-white/10">
        {reports.map(r => (
            <div key={r.id} className="border-b border-white/5 py-2 text-white">
                {r.asset_title} - {r.status}
            </div>
        ))}
      </div>
    </div>
  );
}
