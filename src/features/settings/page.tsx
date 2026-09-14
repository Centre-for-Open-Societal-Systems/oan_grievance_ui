"use client";

import React from 'react';
import { TopHeader } from './components/TopHeader';
import { SettingsCard } from './components/SettingsCard';
import {
    User,
    Bell,
    ShieldCheck,
    Globe,
    Palette,
    FileDown
} from 'lucide-react';


export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 font-sans pb-0 ">
            {/* Header */}
            <TopHeader />


        </div>
    );
}
