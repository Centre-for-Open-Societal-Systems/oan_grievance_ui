import React, { useState } from 'react';
import { Clock, AlertCircle, CalendarClock, Timer } from 'lucide-react';
import { DeferSLAPopup } from './DeferSLAPopup';

export function SLATracker() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-5 border-b border-red-100">
          <div className="flex items-center gap-2.5">
            <Timer className="h-6 w-6 text-red-500" />
            <h3 className="text-md font-bold text-gray-900">SLA Tracker</h3>
          </div>
          <span className="px-3 py-1 bg-red-50 text-red-500 border border-red-200 text-sm font-bold rounded-full flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> Overdue</span>
        </div>

        <div className="p-5 flex flex-col">
          <div className="flex justify-between text-base font-medium text-gray-500 mb-2">
            <span>SLA Consumed</span>
            <span className="text-red-500 font-bold">100%</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full w-full"></div>
          </div>
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Submitted</div>
              <div className="text-base font-bold text-gray-900">10 Jul 2026</div>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg px-3 py-2 text-center border border-red-100">
              <div className="text-sm font-medium text-red-400">Due Date</div>
              <div className="text-base font-bold text-red-500">14 Jul 2026</div>
            </div>
          </div>
          <button
            onClick={() => setShowPopup(true)}
            className="w-full py-3 bg-[#1ca848] hover:bg-[#1a9c42] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-base"
          >
            <CalendarClock className="h-5 w-5" /> Defer SLA
          </button>
        </div>
      </div>

      {showPopup && <DeferSLAPopup onClose={() => setShowPopup(false)} />}
    </>
  );
}
