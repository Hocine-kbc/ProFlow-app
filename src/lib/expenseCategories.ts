import type { LucideIcon } from 'lucide-react';
import { Briefcase, Car, Coffee, Laptop, Shield, ShoppingBag, Train, Wrench } from 'lucide-react';
import { ExpenseCategory } from '../types/index.ts';

interface ExpenseCategoryConfig {
  value: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
  chartColor: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryConfig[] = [
  {
    value: 'fuel',
    label: 'Carburant',
    icon: Car,
    color: 'orange',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    chartColor: '#F97316',
  },
  {
    value: 'equipment',
    label: 'Matériel & équipement',
    icon: Wrench,
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    chartColor: '#3B82F6',
  },
  {
    value: 'subscription',
    label: 'Abonnements & logiciels',
    icon: Laptop,
    color: 'purple',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-600 dark:text-purple-400',
    chartColor: '#A855F7',
  },
  {
    value: 'meals',
    label: 'Repas & restauration',
    icon: Coffee,
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    chartColor: '#F59E0B',
  },
  {
    value: 'transport',
    label: 'Transport & déplacement',
    icon: Train,
    color: 'cyan',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    chartColor: '#06B6D4',
  },
  {
    value: 'office',
    label: 'Fournitures de bureau',
    icon: Briefcase,
    color: 'indigo',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    chartColor: '#6366F1',
  },
  {
    value: 'insurance',
    label: 'Assurance',
    icon: Shield,
    color: 'teal',
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    textClass: 'text-teal-600 dark:text-teal-400',
    chartColor: '#14B8A6',
  },
  {
    value: 'other',
    label: 'Autre',
    icon: ShoppingBag,
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-slate-800',
    textClass: 'text-gray-600 dark:text-gray-400',
    chartColor: '#6B7280',
  },
];

export function getExpenseCategoryConfig(category: string): ExpenseCategoryConfig {
  return EXPENSE_CATEGORIES.find((c) => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}
