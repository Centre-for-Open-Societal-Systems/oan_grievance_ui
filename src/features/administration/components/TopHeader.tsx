import React from 'react';

export function TopHeader() {
  return (
    <div className="bg-white rounded-xl p-6 font-sans border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Administration</h1>
      <p className="text-[15px] text-gray-500 font-medium">
        Manage nodal officers, category assignments, notification templates, and standard response templates.
      </p>
    </div>
  );
}
