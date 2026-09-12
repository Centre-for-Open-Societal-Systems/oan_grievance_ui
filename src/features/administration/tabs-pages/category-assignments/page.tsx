"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { AssignmentCard, Assignment } from './components/AssignmentCard';

const mockAssignments: Assignment[] = [
    {
        id: "1",
        category: "Inputs",
        categoryColor: "bg-orange-500",
        description: "all types",
        department: "Inputs Supply & Distribution Agency",
        priority: "High Priority",
        l1Officer: "Tigist Alemu",
        l2Officer: "Yonas Mekonnen",
        sla: "14d",
        autoEscalate: true,
        notifyOnSubmit: true,
    },
    {
        id: "2",
        category: "Markets",
        categoryColor: "bg-orange-500",
        description: "all types",
        department: "Market Development & Trade Bureau",
        priority: "High Priority",
        l1Officer: "Dawit Haile",
        l2Officer: "Almaz Worku",
        sla: "10d",
        autoEscalate: true,
        notifyOnSubmit: true,
    },
    {
        id: "3",
        category: "Credit",
        categoryColor: "bg-blue-500",
        description: "all types",
        department: "Agricultural Finance Institute (AFI)",
        l1Officer: "Selam Bekele",
        l2Officer: "Mekdes Solomon",
        sla: "14d",
        autoEscalate: true,
        notifyOnSubmit: true,
    },
    {
        id: "4",
        category: "Payments",
        categoryColor: "bg-orange-500",
        description: "all types",
        department: "Cooperative Promotion Agency",
        priority: "High Priority",
        l1Officer: "Lemma Kassa",
        l2Officer: "Almaz Worku",
        sla: "10d",
        autoEscalate: true,
        notifyOnSubmit: true,
    },
    {
        id: "5",
        category: "Schemes",
        categoryColor: "bg-blue-500",
        description: "all types",
        department: "Ministry of Agriculture (MoA)",
        l1Officer: "Hana Girma",
        l2Officer: "Fikadu Negash",
        sla: "14d",
        autoEscalate: true,
        notifyOnSubmit: false,
    }
];

export default function CategoryAssignmentsPage() {
    return (
        <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm h-[calc(100vh-230px)] flex flex-col overflow-hidden">
            {/* Top Header Section */}
            <div className="flex-none pt-6 pb-6 px-6 border-b border-gray-200 flex items-center justify-between">
                <p className="text-gray-500 text-sm font-medium">
                    Configure which officers handle each agriculture service category, SLA windows, and escalation rules.
                </p>
                <button className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#10883c] text-white px-5 py-3 rounded-lg font-bold transition-colors text-sm">
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Add Assignment
                </button>
            </div>

            {/* Assignments List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 [scrollbar-color:#16A34A_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#16A34A] [&::-webkit-scrollbar-thumb]:rounded-full">
                {mockAssignments.map((assignment, index) => (
                    <AssignmentCard
                        key={assignment.id}
                        assignment={assignment}
                        isInitiallyExpanded={index === 1}
                    />
                ))}
            </div>
        </div>
    );
}
