import React, { useState } from 'react';
import { MessageCircle, FileText, ChevronUp, ChevronDown, ChevronRight, AlertCircle, Paperclip } from 'lucide-react';
import { DocumentViewerPopup } from './DocumentViewerPopup';

export function CommentsAndCommunication() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [expandedMsgs, setExpandedMsgs] = useState<Record<string, boolean>>({
    msg1: true,
    msg2: true,
    msg3: true,
  });

  const toggleMsg = (id: string) => {
    setExpandedMsgs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm flex flex-col min-h-[832px]">
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 shrink-0">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 inline-block">Comments & Communication</h3>
            <p className="text-sm text-gray-500">3 messages in this thread</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-6 top-8 bottom-8 w-px bg-gray-200 z-0"></div>

            {/* Message 1 */}
            <div className="relative z-10 w-full min-w-0">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer group w-full min-w-0"
                onClick={() => toggleMsg('msg1')}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold shadow-sm shrink-0">AB</div>
                  <div className="flex items-center gap-2 flex-nowrap min-w-0 overflow-hidden">
                    <span className="font-bold text-gray-900 whitespace-nowrap truncate">Abebe Bekele</span>
                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap truncate">Individual Farmer</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap shrink-0">Submission</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium shrink-0 ml-4">
                  <span className="whitespace-nowrap">10 Apr 2026, 14:53</span>
                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    {expandedMsgs['msg1'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedMsgs['msg1'] ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'}`}>
                <div className="ml-[60px] p-4 bg-gray-50 border border-gray-100 rounded-xl rounded-tl-none">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    I purchased 50 kg of certified maize seed from the cooperative input store in Bishoftu in March 2026. After planting, germination rate was less than 40%, causing significant crop failure on my 2-hectare plot. I raised this with the store manager but received no response.
                  </p>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedDoc('document_1.pdf'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition-colors"><Paperclip className="h-3 w-3" /> document_1.pdf</button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedDoc('document_2.pdf'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition-colors"><Paperclip className="h-3 w-3" /> document_2.pdf</button>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedDoc('document_3.pdf'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition-colors"><Paperclip className="h-3 w-3" /> document_3.pdf</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Message 2 */}
            <div className="relative z-10 w-full min-w-0">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer group w-full min-w-0"
                onClick={() => toggleMsg('msg2')}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold shadow-sm shrink-0">TA</div>
                  <div className="flex items-center gap-2 flex-nowrap min-w-0 overflow-hidden">
                    <span className="font-bold text-gray-900 whitespace-nowrap truncate shrink-0">Tigist Alemu</span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0"><FileText className="h-3 w-3 shrink-0" /> Dept Response #1</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-bold rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 truncate">Partially Resolved</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium shrink-0 ml-4">
                  <span className="whitespace-nowrap">28 Apr 2026, 19:40</span>
                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    {expandedMsgs['msg2'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedMsgs['msg2'] ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'}`}>
                <div className="ml-[60px] p-5 bg-green-50/50 border border-green-200/60 rounded-xl rounded-tl-none">
                  <div className="mb-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Action Taken</h4>
                    <p className="text-sm text-gray-800 font-medium">Seed batch samples sent to National Quality Control Laboratory for testing.</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Resolution Summary</h4>
                    <p className="text-sm text-gray-800 font-medium">Investigation is ongoing. Lab results expected by 5 May 2026. Farmer's plot has been documented.</p>
                  </div>
                  <div className="mt-4 text-xs font-medium text-gray-400">
                    Proposed closure: 2026-05-10
                  </div>
                </div>
                <div className="ml-[60px] mt-3 flex items-center gap-2 text-xs font-medium text-gray-500 flex-wrap">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><ChevronRight className="h-3 w-3 text-gray-400" /></div>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded whitespace-nowrap">Assigned</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded whitespace-nowrap">In Progress</span>
                  <span className="text-gray-400 ml-2 whitespace-nowrap">by Tigist Alemu</span>
                  <span className="text-gray-400 whitespace-nowrap">• 28 Apr 2026</span>
                </div>
              </div>
            </div>

            {/* Message 3 */}
            <div className="relative z-10 w-full min-w-0">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer group w-full min-w-0"
                onClick={() => toggleMsg('msg3')}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm shrink-0">TA</div>
                  <div className="flex items-center gap-2 flex-nowrap min-w-0 overflow-hidden">
                    <span className="font-bold text-gray-900 whitespace-nowrap truncate shrink-0">Tigist Alemu</span>
                    <span className="text-xs text-gray-500 font-medium whitespace-nowrap truncate">Inputs Officer</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase tracking-wider whitespace-nowrap shrink-0"><AlertCircle className="h-3 w-3 shrink-0" /> Internal Note</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium shrink-0 ml-4">
                  <span className="whitespace-nowrap">28 Apr 2026, 19:40</span>
                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    {expandedMsgs['msg3'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className={`transition-all duration-300 overflow-hidden ${expandedMsgs['msg3'] ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'}`}>
                <div className="ml-[60px] p-4 bg-[#FFF9E5] border border-amber-200/60 rounded-xl rounded-tl-none">
                  <p className="text-sm text-amber-900 font-medium leading-relaxed">
                    Batch number recorded. Coordinating with quality lab — results in 7 days.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {selectedDoc && (
        <DocumentViewerPopup
          documentName={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </>
  );
}
