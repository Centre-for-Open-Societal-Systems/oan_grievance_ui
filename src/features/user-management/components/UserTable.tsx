"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Pencil, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';
import { EditRoleModal } from './EditRoleModal';

const AnimatedPaginationSelect = ({ value, onChange, options }: any) => {
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
        className={`border rounded-md px-3 py-1 text-sm bg-white transition-all duration-200 cursor-pointer flex justify-between items-center min-w-[64px] ${isOpen ? 'border-[#16A34A] ring-1 ring-[#16A34A]' : 'border-gray-200 hover:border-gray-300'
          }`}
      >
        <span className="text-gray-700 font-medium">{value}</span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 bottom-full mb-1 w-full left-0 bg-white border border-gray-100 rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom">
          <ul className="max-h-40 overflow-auto py-1">
            {options.map((opt: number) => (
              <li
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`px-3 py-1.5 text-sm cursor-pointer transition-colors text-center ${value === opt
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

type UserStatus = 'Active' | 'Inactive';

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  initialsBg: string;
  initialsColor: string;
  role: string;
  roleColor: string;
  roleBg: string;
  roleBorder: string;
  region: string;
  casesHandled: number;
  status: UserStatus;
}

const users: User[] = [
  { id: '1', name: 'Tigist Alemu', email: 'tigist.alemu@oan.gov.et', initials: 'TA', initialsBg: 'bg-[#d1fae5]', initialsColor: 'text-[#065f46]', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'Addis Ababa', casesHandled: 24, status: 'Active' },
  { id: '2', name: 'Dawit Haile', email: 'dawit.haile@oan.gov.et', initials: 'DH', initialsBg: 'bg-blue-100', initialsColor: 'text-blue-700', role: 'Senior Investigator', roleColor: 'text-yellow-700', roleBg: 'bg-yellow-50', roleBorder: 'border-yellow-200', region: 'Oromia', casesHandled: 18, status: 'Active' },
  { id: '3', name: 'Selam Bekele', email: 'selam.bekele@oan.gov.et', initials: 'SB', initialsBg: 'bg-orange-100', initialsColor: 'text-orange-700', role: 'Finance Officer', roleColor: 'text-purple-600', roleBg: 'bg-purple-50', roleBorder: 'border-purple-200', region: 'SNNPR', casesHandled: 12, status: 'Active' },
  { id: '4', name: 'Biruk Tesfaye', email: 'biruk.tesfaye@oan.gov.et', initials: 'BT', initialsBg: 'bg-purple-100', initialsColor: 'text-purple-700', role: 'Audit Officer', roleColor: 'text-orange-600', roleBg: 'bg-orange-50', roleBorder: 'border-orange-200', region: 'Somali', casesHandled: 9, status: 'Active' },
  { id: '5', name: 'Lemma Kassa', email: 'lemma.kassa@oan.gov.et', initials: 'LK', initialsBg: 'bg-blue-100', initialsColor: 'text-blue-700', role: 'HR Officer', roleColor: 'text-teal-600', roleBg: 'bg-teal-50', roleBorder: 'border-teal-200', region: 'Amhara', casesHandled: 5, status: 'Inactive' },
  { id: '6', name: 'Abeba Yohannes', email: 'abeba.yohannes@oan.gov.et', initials: 'AY', initialsBg: 'bg-pink-100', initialsColor: 'text-pink-700', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'Tigray', casesHandled: 31, status: 'Active' },
  { id: '7', name: 'Chala Dida', email: 'chala.dida@oan.gov.et', initials: 'CD', initialsBg: 'bg-gray-100', initialsColor: 'text-gray-700', role: 'Senior Investigator', roleColor: 'text-yellow-700', roleBg: 'bg-yellow-50', roleBorder: 'border-yellow-200', region: 'Oromia', casesHandled: 42, status: 'Active' },
  { id: '8', name: 'Mekdes Tadesse', email: 'mekdes.tadesse@oan.gov.et', initials: 'MT', initialsBg: 'bg-yellow-100', initialsColor: 'text-yellow-700', role: 'Legal Advisor', roleColor: 'text-indigo-600', roleBg: 'bg-indigo-50', roleBorder: 'border-indigo-200', region: 'Addis Ababa', casesHandled: 15, status: 'Active' },
  { id: '9', name: 'Bereket Woldemariam', email: 'bereket.woldemariam@oan.gov.et', initials: 'BW', initialsBg: 'bg-red-100', initialsColor: 'text-red-700', role: 'IT Support', roleColor: 'text-gray-600', roleBg: 'bg-gray-50', roleBorder: 'border-gray-200', region: 'Dire Dawa', casesHandled: 58, status: 'Active' },
  { id: '10', name: 'Hanna Gebre', email: 'hanna.gebre@oan.gov.et', initials: 'HG', initialsBg: 'bg-green-100', initialsColor: 'text-green-700', role: 'Finance Officer', roleColor: 'text-purple-600', roleBg: 'bg-purple-50', roleBorder: 'border-purple-200', region: 'Sidama', casesHandled: 8, status: 'Inactive' },
  { id: '11', name: 'Samuel Assefa', email: 'samuel.assefa@oan.gov.et', initials: 'SA', initialsBg: 'bg-[#d1fae5]', initialsColor: 'text-[#065f46]', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'Amhara', casesHandled: 22, status: 'Active' },
  { id: '12', name: 'Eden Getachew', email: 'eden.getachew@oan.gov.et', initials: 'EG', initialsBg: 'bg-purple-100', initialsColor: 'text-purple-700', role: 'HR Officer', roleColor: 'text-teal-600', roleBg: 'bg-teal-50', roleBorder: 'border-teal-200', region: 'Addis Ababa', casesHandled: 4, status: 'Active' },
  { id: '13', name: 'Yared Melese', email: 'yared.melese@oan.gov.et', initials: 'YM', initialsBg: 'bg-blue-100', initialsColor: 'text-blue-700', role: 'Senior Investigator', roleColor: 'text-yellow-700', roleBg: 'bg-yellow-50', roleBorder: 'border-yellow-200', region: 'Harari', casesHandled: 29, status: 'Active' },
  { id: '14', name: 'Fikirte Girma', email: 'fikirte.girma@oan.gov.et', initials: 'FG', initialsBg: 'bg-orange-100', initialsColor: 'text-orange-700', role: 'Audit Officer', roleColor: 'text-orange-600', roleBg: 'bg-orange-50', roleBorder: 'border-orange-200', region: 'Benishangul-Gumuz', casesHandled: 11, status: 'Active' },
  { id: '15', name: 'Tesfaye Belay', email: 'tesfaye.belay@oan.gov.et', initials: 'TB', initialsBg: 'bg-pink-100', initialsColor: 'text-pink-700', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'Afar', casesHandled: 19, status: 'Inactive' },
  { id: '16', name: 'Kidist Abera', email: 'kidist.abera@oan.gov.et', initials: 'KA', initialsBg: 'bg-gray-100', initialsColor: 'text-gray-700', role: 'Legal Advisor', roleColor: 'text-indigo-600', roleBg: 'bg-indigo-50', roleBorder: 'border-indigo-200', region: 'Oromia', casesHandled: 27, status: 'Active' },
  { id: '17', name: 'Elias Tadesse', email: 'elias.tadesse@oan.gov.et', initials: 'ET', initialsBg: 'bg-yellow-100', initialsColor: 'text-yellow-700', role: 'IT Support', roleColor: 'text-gray-600', roleBg: 'bg-gray-50', roleBorder: 'border-gray-200', region: 'Addis Ababa', casesHandled: 64, status: 'Active' },
  { id: '18', name: 'Helen Kebede', email: 'helen.kebede@oan.gov.et', initials: 'HK', initialsBg: 'bg-red-100', initialsColor: 'text-red-700', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'SNNPR', casesHandled: 16, status: 'Active' },
  { id: '19', name: 'Amanuel Desta', email: 'amanuel.desta@oan.gov.et', initials: 'AD', initialsBg: 'bg-green-100', initialsColor: 'text-green-700', role: 'Senior Investigator', roleColor: 'text-yellow-700', roleBg: 'bg-yellow-50', roleBorder: 'border-yellow-200', region: 'Tigray', casesHandled: 35, status: 'Active' },
  { id: '20', name: 'Makeda Worku', email: 'makeda.worku@oan.gov.et', initials: 'MW', initialsBg: 'bg-blue-100', initialsColor: 'text-blue-700', role: 'Finance Officer', roleColor: 'text-purple-600', roleBg: 'bg-purple-50', roleBorder: 'border-purple-200', region: 'Gambela', casesHandled: 7, status: 'Inactive' },
  { id: '21', name: 'Henok Tilahun', email: 'henok.tilahun@oan.gov.et', initials: 'HT', initialsBg: 'bg-[#d1fae5]', initialsColor: 'text-[#065f46]', role: 'Audit Officer', roleColor: 'text-orange-600', roleBg: 'bg-orange-50', roleBorder: 'border-orange-200', region: 'Amhara', casesHandled: 14, status: 'Active' },
  { id: '22', name: 'Ruth Dereje', email: 'ruth.dereje@oan.gov.et', initials: 'RD', initialsBg: 'bg-purple-100', initialsColor: 'text-purple-700', role: 'Case Officer', roleColor: 'text-blue-600', roleBg: 'bg-blue-50', roleBorder: 'border-blue-200', region: 'Oromia', casesHandled: 21, status: 'Active' },
  { id: '23', name: 'Abel Mulugeta', email: 'abel.mulugeta@oan.gov.et', initials: 'AM', initialsBg: 'bg-orange-100', initialsColor: 'text-orange-700', role: 'Senior Investigator', roleColor: 'text-yellow-700', roleBg: 'bg-yellow-50', roleBorder: 'border-yellow-200', region: 'Addis Ababa', casesHandled: 48, status: 'Active' },
  { id: '24', name: 'Meseret Hailu', email: 'meseret.hailu@oan.gov.et', initials: 'MH', initialsBg: 'bg-pink-100', initialsColor: 'text-pink-700', role: 'HR Officer', roleColor: 'text-teal-600', roleBg: 'bg-teal-50', roleBorder: 'border-teal-200', region: 'Dire Dawa', casesHandled: 6, status: 'Active' },
  { id: '25', name: 'Zelalem Bekele', email: 'zelalem.bekele@oan.gov.et', initials: 'ZB', initialsBg: 'bg-gray-100', initialsColor: 'text-gray-700', role: 'Legal Advisor', roleColor: 'text-indigo-600', roleBg: 'bg-indigo-50', roleBorder: 'border-indigo-200', region: 'Somali', casesHandled: 22, status: 'Inactive' },
];

export function UserTable() {
  const [userList, setUserList] = useState<User[]>(users);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const handleAddUser = (e: any) => {
      setUserList(prev => [e.detail, ...prev]);
    };
    const handleUpdateUser = (e: any) => {
      setUserList(prev => prev.map(user => user.id === e.detail.id ? e.detail : user));
    };
    window.addEventListener('addUser', handleAddUser);
    window.addEventListener('updateUser', handleUpdateUser);
    return () => {
      window.removeEventListener('addUser', handleAddUser);
      window.removeEventListener('updateUser', handleUpdateUser);
    };
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const totalPages = Math.ceil(userList.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, userList.length);
  const paginatedUsers = userList.slice(startIndex, endIndex);

  const toggleUserStatus = (id: string) => {
    setUserList(prev => prev.map(user =>
      user.id === id
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
        : user
    ));
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
      </div>

      <div className="overflow-x-auto overflow-y-auto h-[620px] [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User Name</th>
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Role</th>
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Region</th>
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Cases Handled</th>
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.initialsBg} ${user.initialsColor}`}>
                      {user.initials}
                    </div>
                    <div>
                      <div className="font-bold text-gray-700">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${user.roleBg} ${user.roleColor} ${user.roleBorder}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-center text-sm font-medium text-gray-600">
                  {user.region}
                </td>
                <td className="px-5 py-4 text-center text-sm font-medium text-gray-600">
                  {user.casesHandled}
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${user.status === 'Active'
                      ? 'text-[#16A34A] border-[#16A34A]/30 bg-[#10883c]/5'
                      : 'text-red-500 border-red-200 bg-red-50/50'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-[#10b981]' : 'bg-red-500'}`}></span>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setIsEditModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <Pencil size={12} />
                      Edit Role
                    </button>
                    {user.status === 'Active' ? (
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className="inline-flex justify-center items-center px-3 py-1.5 w-[90px] text-xs font-medium text-red-500 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className="inline-flex justify-center items-center px-3 py-1.5 w-[90px] text-xs font-medium text-[#16A34A] bg-white border border-[#10b981]/30 rounded-md hover:bg-[#10b981]/5 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <AnimatedPaginationSelect
              value={rowsPerPage}
              onChange={(val: number) => {
                setRowsPerPage(val);
                setCurrentPage(1);
              }}
              options={[10, 25, 50]}
            />
          </div>
          <span>
            Showing <span className="font-semibold text-gray-900">{userList.length === 0 ? 0 : startIndex + 1}-{endIndex}</span> of <span className="font-semibold text-gray-900">{userList.length}</span> results
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
          >
            <ChevronsLeft size={18} />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
          >
            <ChevronLeft size={18} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded font-medium transition-colors ${currentPage === page
                ? 'bg-[#16A34A] text-white'
                : 'hover:bg-gray-100 text-gray-600'
                }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </div>

      <EditRoleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
      />
    </div>
  );
}
