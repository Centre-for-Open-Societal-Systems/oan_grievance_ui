import React, { useState, useEffect } from 'react';
import { X, CalendarClock, ChevronDown, AlertTriangle, Send } from 'lucide-react';

interface DeferSLAPopupProps {
  onClose: () => void;
}

export function DeferSLAPopup({ onClose }: DeferSLAPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Start with Fikadu selected to match the screenshot
  const [selectedApprover, setSelectedApprover] = useState<{ name: string, role: string, email?: string, org?: string, initials?: string } | null>({
    name: 'Fikadu Negash',
    role: 'State Minister for Agricultural Services',
    email: 'fikadu.negash@moa.gov.et',
    org: 'Ministry of Agriculture (MoA)',
    initials: 'FN'
  });

  const approvers = [
    { name: 'Yonas Mekonnen', role: 'Director, Input Quality & Standards' },
    { name: 'Almaz Worku', role: 'Deputy Director, Market Governance' },
    { name: 'Mekdes Solomon', role: 'Head of Credit Policy, AFI' },
    { name: 'Fikadu Negash', role: 'State Minister for Agricultural Services', email: 'fikadu.negash@moa.gov.et', org: 'Ministry of Agriculture (MoA)', initials: 'FN' },
  ];

  // Trigger open animation on mount
  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 transform ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
              <h2 className="text-md font-bold text-gray-900">Defer SLA</h2>
            </div>
            <p className="text-sm text-gray-500">Requires approval from a Senior Nodal Officer (L2)</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Reason */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Reason for Deferral * <span className="text-gray-400 font-normal">(min. 20 characters)</span></label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why the SLA requires extension — e.g. awaiting lab results, pending inter-agency coordination, seasonal factor..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50 resize-none"
            />
            <div className={`text-[11px] font-bold ${reason.length < 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {reason.length} / 20 minimum characters
            </div>
          </div>

          {/* Days */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Defer by (additional days) *</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
            />
            <div className="text-[11px] text-gray-500">
              Maximum 30 additional days. Subject to approver discretion.
            </div>
          </div>

          {/* Approver Dropdown */}
          <div className="flex flex-col gap-2 relative">
            <label className="text-sm font-bold text-gray-700">Senior Nodal Officer (L2) Approver *</label>

            {/* Selected Value display */}
            {!selectedApprover ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-500 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
              >
                <span>Select Senior Nodal Officer</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                >
                  <span className="text-gray-500">Select Senior Nodal Officer</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {selectedApprover.initials || 'UN'}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-sm text-gray-700">
                      {selectedApprover.name} · {selectedApprover.org} · {selectedApprover.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropdown Options with Animation */}
            <div
              className={`absolute top-[70px] left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden transition-all duration-300 origin-top transform ${dropdownOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 pointer-events-none'}`}
            >
              <div className="max-h-60 overflow-y-auto">
                {approvers.map((approver, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedApprover(approver);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${selectedApprover?.name === approver.name ? 'bg-emerald-50/50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                  >
                    {approver.name} — {approver.role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-2 flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200/60 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              Deferral requests are logged in the audit trail. The approver will be notified and must explicitly approve or reject the request. SLA clock continues until approval is granted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white flex justify-center gap-4">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            className="px-6 py-2.5 bg-[#8ED1A1] text-white font-bold rounded-lg flex items-center gap-2 transition-colors cursor-default"
          >
            <Send className="h-4 w-4" />
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
