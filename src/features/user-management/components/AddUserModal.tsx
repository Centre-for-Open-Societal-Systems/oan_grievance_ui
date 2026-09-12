"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Save, ChevronDown } from 'lucide-react';

const AnimatedSelect = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`border rounded-lg px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer flex justify-between items-center ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200 hover:border-gray-300'
          }`}
      >
        <span className={value ? 'text-gray-700' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full top-full mt-2 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-auto py-1">
            {options.map((opt: string) => (
              <li
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === opt
                  ? 'bg-[#16A34A]/10 text-[#16A34A] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Active');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [casesHandled, setCasesHandled] = useState('');

  const handleAddMember = () => {
    if (!fullName || !role) return;

    const roleColors: any = {
      'Case Officer': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      'Senior Investigator': { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
      'Finance Officer': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
      'Audit Officer': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      'HR Officer': { color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
      'Administrator': { color: 'text-gray-900', bg: 'bg-gray-100', border: 'border-gray-300' }
    };
    const rStyle = roleColors[role] || roleColors['Case Officer'];

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: fullName,
      email: email || '',
      initials: fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U',
      initialsBg: 'bg-[#d1fae5]',
      initialsColor: 'text-[#065f46]',
      role: role,
      roleColor: rStyle.color,
      roleBg: rStyle.bg,
      roleBorder: rStyle.border,
      region: region || '-',
      casesHandled: parseInt(casesHandled) || 0,
      status: status
    };

    window.dispatchEvent(new CustomEvent('addUser', { detail: newUser }));

    setFullName('');
    setEmail('');
    setRole('');
    setRegion('');
    setCasesHandled('');
    setStatus('Active');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-visible flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Add Team Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-all duration-300 p-1.5 rounded-full hover:bg-red-50 hover:rotate-90 hover:scale-110">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter Full Name"
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
              />
            </div>

            {/* Email ID */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Email ID <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email ID"
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
              />
            </div>

            {/* Role */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Role <span className="text-red-500">*</span></label>
              <AnimatedSelect
                options={["Case Officer", "Senior Investigator", "Finance Officer", "Audit Officer", "HR Officer", "Administrator"]}
                value={role}
                onChange={setRole}
                placeholder="Select Role"
              />
            </div>

            {/* Region */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Region</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Enter Region"
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
              />
            </div>

            {/* Cases Handled */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Cases Handled</label>
              <input
                type="text"
                value={casesHandled}
                onChange={(e) => setCasesHandled(e.target.value)}
                placeholder="Enter Cases Handled"
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] text-gray-700 placeholder:text-gray-400 transition-colors"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-900">Status <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setStatus(status === 'Active' ? 'Inactive' : 'Active')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-2 ${status === 'Active' ? 'bg-[#16A34A]' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${status === 'Active' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
                <span className={`text-sm font-medium ${status === 'Active' ? 'text-[#16A34A]' : 'text-gray-500'}`}>
                  {status}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex justify-end gap-4 mt-4 border-t border-gray-100 ">
          <button onClick={onClose} className="px-8 py-2.5 border border-[#1e293b] text-[#1e293b] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleAddMember} className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803d] text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
            <Save size={18} />
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
}
