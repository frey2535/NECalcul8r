import React from "react";
import {
  Wrench, Building2, ShieldCheck, ClipboardCheck, Calculator,
  Briefcase, HardHat as Helmet, GraduationCap, School, BookOpen, User,
  Factory, Anchor, Sun, Zap as ZapIcon, Car,
} from "lucide-react";

export const PROFESSIONS = [
  { label: "Electrical Engineers", icon: Calculator },
  { label: "Electrical Designers", icon: Building2 },
  { label: "Electrical Contractors", icon: Briefcase },
  { label: "Master Electricians", icon: ShieldCheck },
  { label: "Journeyman Electricians", icon: Wrench },
  { label: "Electrical Inspectors", icon: ClipboardCheck },
  { label: "Plan Reviewers", icon: ClipboardCheck },
  { label: "Estimators", icon: Calculator },
  { label: "Project Managers", icon: Briefcase },
  { label: "Superintendents", icon: Helmet },
  { label: "Electrical Instructors", icon: GraduationCap },
  { label: "Trade Schools", icon: School },
  { label: "Students", icon: BookOpen },
  { label: "Apprentices", icon: User },
  { label: "Industrial Electricians", icon: Factory },
  { label: "Marine Electricians", icon: Anchor },
  { label: "Solar Contractors", icon: Sun },
  { label: "Generator Installers", icon: ZapIcon },
  { label: "EV Infrastructure Pros", icon: Car },
];

export function ProfessionCard({ profession, index }) {
  const Icon = profession.icon;
  return (
    <div
      className="group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border border-border bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
      </div>
      <p className="text-[11px] sm:text-xs font-bold text-foreground text-center leading-tight">
        {profession.label}
      </p>
    </div>
  );
}