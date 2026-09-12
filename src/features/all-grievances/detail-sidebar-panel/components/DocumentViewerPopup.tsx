import React from 'react';
import { X, Download, Maximize, FileText } from 'lucide-react';

interface DocumentViewerPopupProps {
  documentName: string;
  onClose: () => void;
}

export function DocumentViewerPopup({ documentName, onClose }: DocumentViewerPopupProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{documentName}</h3>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">PDF Document • 2.4 MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
              <Download className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
              <Maximize className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content Placeholder */}
        <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex items-center justify-center min-h-[500px]">
          <div className="bg-white w-full max-w-2xl h-[800px] shadow-sm border border-gray-200 rounded flex flex-col items-center justify-center text-gray-400">
            <FileText className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Document Preview</p>
            <p className="text-sm">{documentName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
