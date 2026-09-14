"use client";

import React, { useState } from 'react';
import { Zap, Bell, BellOff, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface Assignment {
  id: string;
  category: string;
  categoryColor: string;
  description: string;
  department: string;
  priority?: "High Priority";
  l1Officer: string;
  l2Officer: string;
  sla: string;
  autoEscalate: boolean;
  notifyOnSubmit: boolean;
}

interface AssignmentCardProps {
  assignment: Assignment;
  isInitiallyExpanded?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'Inputs', label: 'Inputs' },
  { value: 'Schemes', label: 'Schemes' },
  { value: 'Payments', label: 'Payments' },
  { value: 'Credit', label: 'Credit' },
  { value: 'Markets', label: 'Markets' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'MoA', label: 'Ministry of Agriculture (MoA)' },
  { value: 'ATI', label: 'Agricultural Transformation Institute (ATI)' },
  { value: 'EABC', label: 'Ethiopian Agricultural Business Corporation (EABC)' },
  { value: 'CPA', label: 'Cooperative Promotion Agency' },
  { value: 'AFI', label: 'Agricultural Finance Institute (AFI)' },
  { value: 'ISDA', label: 'Inputs Supply & Distribution Agency' },
  { value: 'MDTB', label: 'Market Development & Trade Bureau' },
  { value: 'RBA', label: 'Regional Bureau of Agriculture' },
  { value: 'WANRO', label: 'Woreda Agriculture & Natural Resource Office' },
  { value: 'ILDA', label: 'Irrigation & Lowlands Development Authority' },
];

const L1_OFFICER_OPTIONS = [
  { value: 'tigist', label: 'Tigist Alemu — Inputs Supply & Distribution Agency', displayLabel: 'Tigist Alemu' },
  { value: 'dawit', label: 'Dawit Haile — Market Development & Trade Bureau', displayLabel: 'Dawit Haile' },
  { value: 'selam', label: 'Selam Bekele — Agricultural Finance Institute (AFI)', displayLabel: 'Selam Bekele' },
  { value: 'hana', label: 'Hana Girma — Ministry of Agriculture (MoA)', displayLabel: 'Hana Girma' },
  { value: 'lemma', label: 'Lemma Kassa — Cooperative Promotion Agency', displayLabel: 'Lemma Kassa' },
  { value: 'biruk', label: 'Biruk Tesfaye — Agricultural Finance Institute (AFI)', displayLabel: 'Biruk Tesfaye' },
];

const L2_OFFICER_OPTIONS = [
  { value: 'none', label: 'None', displayLabel: 'None' },
  { value: 'yonas', label: 'Yonas Mekonnen — Inputs Supply & Distribution Agency', displayLabel: 'Yonas Mekonnen' },
  { value: 'almaz', label: 'Almaz Worku — Market Development & Trade Bureau', displayLabel: 'Almaz Worku' },
  { value: 'mekdes', label: 'Mekdes Solomon — Agricultural Finance Institute (AFI)', displayLabel: 'Mekdes Solomon' },
  { value: 'fikadu', label: 'Fikadu Negash — Ministry of Agriculture (MoA)', displayLabel: 'Fikadu Negash' },
];

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment, isInitiallyExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  // States for the form
  const [autoEscalate, setAutoEscalate] = useState(assignment.autoEscalate);
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(assignment.notifyOnSubmit);

  return (
    <div className={`rounded-xl bg-white duration-200 rounded-lg border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl ${isExpanded ? 'border-gray-200 shadow-sm' : 'border-gray-200'}`}>
      {/* Header (always visible) */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${assignment.categoryColor}`}></div>
            <span className="font-medium text-gray-900 text-base">{assignment.category}</span>
            <span className="text-gray-400 text-sm">— {assignment.description}</span>
            {assignment.priority && (
              <span className="ml-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {assignment.priority}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 font-medium pl-4">
            {assignment.department}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">L1 Officer</span>
            <span className="text-sm font-medium text-gray-900">{assignment.l1Officer}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">L2 Officer</span>
            <span className="text-sm font-medium text-gray-900">{assignment.l2Officer}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 mb-0.5">SLA</span>
            <span className="text-sm font-medium text-gray-900">{assignment.sla}</span>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Zap className={`w-4 h-4 ${assignment.autoEscalate ? 'text-orange-500' : 'text-gray-300'}`} fill={assignment.autoEscalate ? "currentColor" : "none"} />
            {assignment.notifyOnSubmit ? (
              <Bell className="w-4 h-4 text-blue-500" fill="currentColor" stroke="currentColor" strokeWidth={1} />
            ) : (
              <BellOff className="w-4 h-4 text-gray-300" strokeWidth={2} />
            )}
          </div>
          <button
            className="ml-2 p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          <div className="p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800">
                  Service Category <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={CATEGORY_OPTIONS}
                  defaultValue={CATEGORY_OPTIONS.find(o => o.label === assignment.category)?.value}
                  placeholder="Select Service Category"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800">
                  Department <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={DEPARTMENT_OPTIONS}
                  defaultValue={DEPARTMENT_OPTIONS.find(o => o.label === assignment.department)?.value}
                  placeholder="Select Department"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800">
                  L1 Nodal Officer <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={L1_OFFICER_OPTIONS}
                  defaultValue={L1_OFFICER_OPTIONS.find(o => o.displayLabel === assignment.l1Officer)?.value}
                  placeholder="Select L1 Nodal Officer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800">
                  L2 Senior Nodal Officer <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={L2_OFFICER_OPTIONS}
                  defaultValue={L2_OFFICER_OPTIONS.find(o => o.displayLabel === assignment.l2Officer)?.value}
                  placeholder="Select L2 Senior Nodal Officer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-800">
                  SLA Days <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter SLA Days"
                  defaultValue={assignment.sla.replace('d', '')}
                  className="w-full bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-start gap-12 justify-start pt-2 px-4">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[13px] font-medium text-gray-500">Auto-Escalate</span>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={autoEscalate}
                        onChange={() => setAutoEscalate(!autoEscalate)}
                      />
                      <div className={`block w-11 h-6 rounded-full transition-colors ${autoEscalate ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform transform shadow-sm ${autoEscalate ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-sm text-gray-500 w-6">{autoEscalate ? 'On' : 'Off'}</div>
                  </label>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <span className="text-[13px] font-medium text-gray-500">Notify on Submit</span>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={notifyOnSubmit}
                        onChange={() => setNotifyOnSubmit(!notifyOnSubmit)}
                      />
                      <div className={`block w-11 h-6 rounded-full transition-colors ${notifyOnSubmit ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform transform shadow-sm ${notifyOnSubmit ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-sm text-gray-500 w-6">{notifyOnSubmit ? 'On' : 'Off'}</div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white rounded-b-xl">
            <button
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </button>
            <button className="px-6 py-3 text-sm font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#10883c] transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
