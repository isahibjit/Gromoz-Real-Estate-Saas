import {
  FileWarning,
  GitMerge,
  ScanSearch,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";

import type {
  DuplicateGroup,
  DuplicateSource,
  DuplicateStat,
  DuplicateTip,
} from "./duplicateLeadsTypes";

export const duplicateStats: DuplicateStat[] = [
  {
    label: "Potential Duplicates",
    value: "98",
    helper: "Leads found",
    icon: UsersRound,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "High Match (90%+)",
    value: "32",
    helper: "Leads",
    icon: UserRoundX,
    tone: "bg-red-50 text-red-500",
  },
  {
    label: "Medium Match (70-90%)",
    value: "45",
    helper: "Leads",
    icon: FileWarning,
    tone: "bg-orange-50 text-primary",
  },
  {
    label: "Low Match (50-70%)",
    value: "21",
    helper: "Leads",
    icon: ScanSearch,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "Auto Merged (This Month)",
    value: "56",
    helper: "Leads",
    icon: UserRoundCheck,
    tone: "bg-green-50 text-success",
  },
];

export const duplicateTabs = [
  "All Duplicates (98)",
  "High Match (32)",
  "Medium Match (45)",
  "Low Match (21)",
  "Ignored (12)",
  "Merged (56)",
];

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}`;

export const duplicateGroups: DuplicateGroup[] = [
  {
    id: "DUP001",
    detectedOn: "20 May 2025",
    source: "MagicBricks",
    criteria: [
      { label: "Mobile", value: "9876543210", match: "Exact Match" },
      { label: "Email", value: "rahul.sharma@gmail.com", match: "Exact Match" },
      { label: "Name", value: "Rahul Sharma", match: "Exact Match" },
    ],
    score: 95,
    scoreLabel: "High Match",
    tone: "text-success border-success",
    existing: {
      name: "Rahul Sharma",
      id: "TR001245",
      mobile: "9876543210",
      email: "rahul.sharma@gmail.com",
      addedOn: "18 May 2025",
      avatarUrl: avatar("Rahul Sharma"),
    },
    duplicate: {
      name: "Rahul S.",
      id: "TR001678",
      mobile: "9876543210",
      email: "rahul.sharma@gmail.com",
      addedOn: "19 May 2025",
      avatarUrl: avatar("Rahul S"),
    },
  },
  {
    id: "DUP002",
    detectedOn: "20 May 2025",
    source: "99Acres",
    criteria: [
      { label: "Mobile", value: "9812345678", match: "Exact Match" },
      { label: "Email", value: "neha.kapoor@gmail.com", match: "Exact Match" },
      { label: "Name", value: "Neha Kapoor", match: "Exact Match" },
    ],
    score: 92,
    scoreLabel: "High Match",
    tone: "text-success border-success",
    existing: {
      name: "Neha Kapoor",
      id: "TR001122",
      mobile: "9812345678",
      email: "neha.kapoor@gmail.com",
      addedOn: "17 May 2025",
      avatarUrl: avatar("Neha Kapoor"),
    },
    duplicate: {
      name: "Neha K.",
      id: "TR001654",
      mobile: "9812345678",
      email: "neha.kapoor@gmail.com",
      addedOn: "18 May 2025",
      avatarUrl: avatar("Neha K"),
    },
  },
  {
    id: "DUP003",
    detectedOn: "20 May 2025",
    source: "Google Ads",
    criteria: [
      { label: "Mobile", value: "9823456789", match: "Exact Match" },
      { label: "Email", value: "vikram.singh@gmail.com", match: "Exact Match" },
      { label: "Name", value: "Vikram Singh", match: "Exact Match" },
    ],
    score: 89,
    scoreLabel: "Medium Match",
    tone: "text-primary border-primary",
    existing: {
      name: "Vikram Singh",
      id: "TR000987",
      mobile: "9823456789",
      email: "vikram.singh@gmail.com",
      addedOn: "16 May 2025",
      avatarUrl: avatar("Vikram Singh"),
    },
    duplicate: {
      name: "Vikram S.",
      id: "TR001543",
      mobile: "9823456789",
      email: "vikram.singh@gmail.com",
      addedOn: "18 May 2025",
      avatarUrl: avatar("Vikram S"),
    },
  },
  {
    id: "DUP004",
    detectedOn: "20 May 2025",
    source: "Website",
    criteria: [
      { label: "Mobile", value: "9834567890", match: "Partial Match" },
      { label: "Email", value: "anjali.mehta@gmail.com", match: "Exact Match" },
      { label: "Name", value: "Anjali Mehta", match: "Exact Match" },
    ],
    score: 72,
    scoreLabel: "Medium Match",
    tone: "text-primary border-primary",
    existing: {
      name: "Anjali Mehta",
      id: "TR001003",
      mobile: "9834567890",
      email: "anjali.mehta@gmail.com",
      addedOn: "15 May 2025",
      avatarUrl: avatar("Anjali Mehta"),
    },
    duplicate: {
      name: "Anjali M.",
      id: "TR001667",
      mobile: "9834567890",
      email: "anjali.mehta@gmail.com",
      addedOn: "17 May 2025",
      avatarUrl: avatar("Anjali M"),
    },
  },
  {
    id: "DUP005",
    detectedOn: "20 May 2025",
    source: "Justdial",
    criteria: [
      { label: "Mobile", value: "9871234567", match: "Partial Match" },
      { label: "Email", value: "karan.patel@gmail.com", match: "Exact Match" },
      { label: "Name", value: "Karan Patel", match: "Exact Match" },
    ],
    score: 65,
    scoreLabel: "Low Match",
    tone: "text-blue-700 border-blue-600",
    existing: {
      name: "Karan Patel",
      id: "TR000889",
      mobile: "9871234567",
      email: "karan.patel@gmail.com",
      addedOn: "14 May 2025",
      avatarUrl: avatar("Karan Patel"),
    },
    duplicate: {
      name: "Karan P.",
      id: "TR001345",
      mobile: "9871234567",
      email: "karan.patel@gmail.com",
      addedOn: "16 May 2025",
      avatarUrl: avatar("Karan P"),
    },
  },
];

export const duplicateSources: DuplicateSource[] = [
  { source: "MagicBricks", duplicates: 28 },
  { source: "99Acres", duplicates: 22 },
  { source: "Google Ads", duplicates: 18 },
  { source: "Website", duplicates: 12 },
  { source: "Justdial", duplicates: 8 },
  { source: "Meta Ads", duplicates: 6 },
  { source: "Referral", duplicates: 4 },
];

export const duplicateTips: DuplicateTip[] = [
  { text: "High match duplicates should be merged" },
  { text: "Medium match duplicates need review" },
  { text: "Low match duplicates can be ignored" },
  { text: "Keep your database clean and accurate" },
];

export const duplicateReportSegments = [
  { label: "High Match", value: "32 (33%)", color: "#ef4444" },
  { label: "Medium Match", value: "45 (46%)", color: "#f97316" },
  { label: "Low Match", value: "21 (21%)", color: "#2563eb" },
];

export const mergeIcon = GitMerge;
