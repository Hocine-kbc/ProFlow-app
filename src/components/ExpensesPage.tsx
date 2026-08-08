import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Filter,
  Info,
  Plus,
  Receipt,
  Search,
  Trash,
  Trash2,
  X,
  Calendar,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../contexts/AppContext.tsx';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { createExpense, updateExpense as updateExpenseApi, deleteExpense as deleteExpenseApi } from '../lib/api.ts';
import { EXPENSE_CATEGORIES, getExpenseCategoryConfig } from '../lib/expenseCategories.ts';
import { Expense, ExpenseCategory } from '../types/index.ts';
import AlertModal from './AlertModal.tsx';
import AnimatedNumber from './AnimatedNumber.tsx';
import CustomSelect from './CustomSelect.tsx';

const ITEMS_PER_PAGE = 10;
const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

const todayIso = () => new Date().toISOString().split('T')[0];

const formatDateFR = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
};

interface ExpenseFormData {
  date: string;
  category: ExpenseCategory;
  amount: string;
  description: string;
}

const emptyFormData = (): ExpenseFormData => ({
  date: todayIso(),
  category: 'fuel',
  amount: '',
  description: '',
});

export default function ExpensesPage() {
  const { state, dispatch, showNotification } = useApp();
  const { expenses } = state;
  const { isDark } = useTheme();

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(emptyFormData());

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  const hasActiveFilters = Boolean(query || categoryFilter || sortBy !== 'date' || sortDir !== 'desc');

  const yearExpenses = useMemo(
    () => expenses.filter((expense) => new Date(expense.date).getFullYear() === selectedYear),
    [expenses, selectedYear]
  );

  const filteredExpenses = useMemo(() => {
    let list = [...yearExpenses];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((expense) => (expense.description || '').toLowerCase().includes(q));
    }

    if (categoryFilter) {
      list = list.filter((expense) => expense.category === categoryFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });

    return list;
  }, [yearExpenses, query, categoryFilter, sortBy, sortDir]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, query, categoryFilter, sortBy, sortDir]);

  const yearTotal = useMemo(() => yearExpenses.reduce((sum, expense) => sum + expense.amount, 0), [yearExpenses]);

  const categoryChartData = useMemo(() => {
    return EXPENSE_CATEGORIES
      .map((cat) => ({
        name: cat.label,
        value: yearExpenses.filter((expense) => expense.category === cat.value).reduce((sum, expense) => sum + expense.amount, 0),
        color: cat.chartColor,
      }))
      .filter((entry) => entry.value > 0);
  }, [yearExpenses]);

  const monthlyChartData = useMemo(() => {
    return MONTH_LABELS.map((label, index) => ({
      month: label,
      total: yearExpenses
        .filter((expense) => new Date(expense.date).getMonth() === index)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }));
  }, [yearExpenses]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentExpenses = filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const { monthlyTotal, yearlyTotal } = useMemo(() => {
    const now = new Date();
    let monthly = 0;
    let yearly = 0;
    expenses.forEach((expense) => {
      const d = new Date(expense.date);
      if (d.getFullYear() === now.getFullYear()) {
        yearly += expense.amount;
        if (d.getMonth() === now.getMonth()) {
          monthly += expense.amount;
        }
      }
    });
    return { monthlyTotal: monthly, yearlyTotal: yearly };
  }, [expenses]);

  const openNewModal = () => {
    setFormData(emptyFormData());
    setEditingExpense(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData(emptyFormData());
    setEditingExpense(null);
    setShowModal(false);
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      date: expense.date,
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description || '',
    });
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      showNotification('error', 'Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }

    const payload = {
      date: formData.date,
      category: formData.category,
      amount,
      description: formData.description.trim() || undefined,
    };

    try {
      if (editingExpense) {
        const updated = await updateExpenseApi(editingExpense.id, payload);
        dispatch({ type: 'UPDATE_EXPENSE', payload: updated });
        showNotification('success', 'Dépense modifiée', 'La dépense a été mise à jour avec succès');
      } else {
        const created = await createExpense(payload);
        dispatch({ type: 'ADD_EXPENSE', payload: created });
        showNotification('success', 'Dépense ajoutée', 'La dépense a été enregistrée avec succès');
      }
      resetForm();
    } catch (err) {
      console.error('Error saving expense:', err);
      showNotification('error', 'Erreur', "Une erreur est survenue lors de l'enregistrement de la dépense");
    }
  };

  const handleDelete = (id: string) => {
    setAlertModal({
      isOpen: true,
      title: 'Supprimer la dépense',
      message: 'Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteExpenseApi(id);
          dispatch({ type: 'DELETE_EXPENSE', payload: id });
          showNotification('success', 'Dépense supprimée', 'La dépense a été supprimée avec succès');
        } catch (err) {
          console.error('Error deleting expense:', err);
          showNotification('error', 'Erreur', 'Une erreur est survenue lors de la suppression');
        }
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev);
    setSelectedExpenses(new Set());
  };

  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedExpenses.size === 0) return;
    setAlertModal({
      isOpen: true,
      title: 'Supprimer les dépenses sélectionnées',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedExpenses.size} dépense${selectedExpenses.size !== 1 ? 's' : ''} ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const ids = Array.from(selectedExpenses);
          await Promise.all(ids.map((id) => deleteExpenseApi(id)));
          ids.forEach((id) => dispatch({ type: 'DELETE_EXPENSE', payload: id }));
          showNotification('success', 'Dépenses supprimées', `${ids.length} dépense(s) supprimée(s) avec succès`);
          setSelectedExpenses(new Set());
          setIsSelectionMode(false);
        } catch (err) {
          console.error('Error bulk deleting expenses:', err);
          showNotification('error', 'Erreur de suppression', 'Une erreur est survenue lors de la suppression');
        }
        setAlertModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 dark:from-rose-700 dark:via-red-700 dark:to-rose-800 text-white shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-12"></div>
          <div className="absolute bottom-4 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-12"></div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Dépenses</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Suivez vos dépenses professionnelles</p>
          </div>
          <div className="flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={openNewModal}
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur transition-colors border border-white/30 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle dépense</span>
              <span className="sm:hidden">Nouvelle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Note URSSAF */}
      <div className="flex items-start gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs sm:text-sm text-rose-700 dark:text-rose-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Les dépenses n'affectent pas vos cotisations URSSAF (calculées sur le chiffre d'affaires brut) — c'est un suivi personnel de votre bénéfice réel.</p>
      </div>

      {/* Cartes résumé */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Ce mois-ci</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={monthlyTotal} format={(v) => `${v.toFixed(2)}€`} />
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Cette année</p>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={yearlyTotal} format={(v) => `${v.toFixed(2)}€`} />
          </p>
        </div>
      </div>

      {/* Aperçu par période */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">Aperçu par période</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Total {selectedYear} : <span className="font-semibold text-gray-700 dark:text-gray-300">{yearTotal.toFixed(2)}€</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 sm:py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{selectedYear}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par catégorie */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Répartition par catégorie</p>
            {categoryChartData.length > 0 ? (
              <div className="h-[240px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                      isAnimationActive
                      animationDuration={700}
                    >
                      {categoryChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(2)}€`}
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`,
                        borderRadius: 12,
                        color: isDark ? '#f1f5f9' : '#111827',
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={9}
                      formatter={(value) => (
                        <span style={{ color: isDark ? '#cbd5e1' : '#374151', fontSize: 12 }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] sm:h-[280px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                Aucune dépense en {selectedYear}
              </div>
            )}
          </div>

          {/* Évolution mensuelle */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Évolution mensuelle</p>
            <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e5e7eb'} vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={26}
                    tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#6b7280' }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}€`}
                    cursor={{ fill: isDark ? 'rgba(244,63,94,0.08)' : 'rgba(244,63,94,0.06)' }}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: `1px solid ${isDark ? '#1e293b' : '#e5e7eb'}`,
                      borderRadius: 12,
                      color: isDark ? '#f1f5f9' : '#111827',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" name="Dépenses" fill="#F43F5E" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche - repliés par défaut */}
      {expenses.length > 0 && (
        <div className="bg-gradient-to-r from-white to-gray-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 sm:p-6 shadow-lg">
          <button
            type="button"
            onClick={() => setFiltersExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between"
            aria-expanded={filtersExpanded}
          >
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg mr-2 sm:mr-3">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">Filtres et recherche</h3>
                <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                  {hasActiveFilters
                    ? `${filteredExpenses.length} dépense${filteredExpenses.length !== 1 ? 's' : ''} · filtres actifs`
                    : 'Affinez vos résultats'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {hasActiveFilters && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery('');
                    setCategoryFilter('');
                    setSortBy('date');
                    setSortDir('desc');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      setQuery('');
                      setCategoryFilter('');
                      setSortBy('date');
                      setSortDir('desc');
                    }
                  }}
                  className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                  Réinitialiser
                </span>
              )}
              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-300 ${filtersExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <div className={`grid transition-all duration-300 ease-in-out ${filtersExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="flex flex-col md:flex-row md:flex-wrap gap-2.5 sm:gap-4 pt-3 sm:pt-6">
                <div className="space-y-1 sm:space-y-2 w-full md:w-auto md:flex-1 md:min-w-[220px] md:max-w-sm">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Recherche
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Description..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm sm:text-base transition-all duration-200"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2 w-full md:w-56">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie</label>
                  <CustomSelect
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value)}
                    placeholder="Toutes les catégories"
                    options={[{ value: '', label: 'Toutes les catégories' }, ...EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
                    className="w-full [&>div>button]:py-2 sm:[&>div>button]:py-3 [&>div>button]:text-sm [&>div>button]:rounded-full"
                  />
                </div>

                <div className="space-y-1 sm:space-y-2 w-full md:w-56">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Tri</label>
                  <CustomSelect
                    value={`${sortBy}-${sortDir}`}
                    onChange={(value) => {
                      const [newSortBy, newSortDir] = value.split('-');
                      setSortBy(newSortBy as 'date' | 'amount');
                      setSortDir(newSortDir as 'asc' | 'desc');
                    }}
                    placeholder="Trier par..."
                    options={[
                      { value: 'date-desc', label: '📅 Date (plus récente)' },
                      { value: 'date-asc', label: '📅 Date (plus ancienne)' },
                      { value: 'amount-desc', label: '💰 Montant (plus élevé)' },
                      { value: 'amount-asc', label: '💰 Montant (plus faible)' },
                    ]}
                    className="w-full [&>div>button]:py-2 sm:[&>div>button]:py-3 [&>div>button]:text-sm [&>div>button]:rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions de sélection à l'emplacement du bouton */}
      {expenses.length > 0 && (
        <div className="flex justify-end items-center">
          {!isSelectionMode ? (
            <button
              key="mode-selection"
              type="button"
              onClick={toggleSelectionMode}
              className="inline-flex items-center px-4 py-2 rounded-full text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/20 hover:bg-rose-200 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-700 transition-colors text-sm animate-in fade-in zoom-in-95 duration-300 ease-out"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mode sélection
            </button>
          ) : (
            <div key="selection-actions" className="flex items-center gap-3 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-300 ease-out">
              <span className="text-sm font-medium text-rose-700 dark:text-rose-300 whitespace-nowrap">
                {selectedExpenses.size} sélectionnée{selectedExpenses.size !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedExpenses.size === 0}
                className="inline-flex items-center px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer
              </button>
              <button
                type="button"
                onClick={toggleSelectionMode}
                className="inline-flex items-center px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm whitespace-nowrap"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden">
        {currentExpenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">Aucune dépense trouvée</p>
            <p className="text-sm mt-1">Ajoutez votre première dépense en cliquant sur "Nouvelle dépense"</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="block lg:hidden">
              {currentExpenses.map((expense) => {
                const cat = getExpenseCategoryConfig(expense.category);
                const CatIcon = cat.icon;
                return (
                  <div key={expense.id} className="border-b border-gray-100 dark:border-slate-800 p-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelectionMode && (
                          <input
                            type="checkbox"
                            checked={selectedExpenses.has(expense.id)}
                            onChange={() => toggleExpenseSelection(expense.id)}
                            className="flex-shrink-0"
                          />
                        )}
                        <div className={`w-8 h-8 rounded-full ${cat.bgClass} flex items-center justify-center flex-shrink-0`}>
                          <CatIcon className={`w-4 h-4 ${cat.textClass}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.description || cat.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateFR(expense.date)} · {cat.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{expense.amount.toFixed(2)}€</span>
                        {!isSelectionMode && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(expense)}
                              className="p-1.5 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(expense.id)}
                              className="p-1.5 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    {isSelectionMode && <th className="px-4 py-3 w-10"></th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Montant</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {currentExpenses.map((expense) => {
                    const cat = getExpenseCategoryConfig(expense.category);
                    const CatIcon = cat.icon;
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        {isSelectionMode && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedExpenses.has(expense.id)}
                              onChange={() => toggleExpenseSelection(expense.id)}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{formatDateFR(expense.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.bgClass} ${cat.textClass}`}>
                            <CatIcon className="w-3.5 h-3.5" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{expense.description || '-'}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">{expense.amount.toFixed(2)}€</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(expense)}
                              className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {currentPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Ajout/Modification */}
      {showModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center pt-4 pb-12 sm:p-4 sm:p-6 px-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[92vw] sm:max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="relative p-4 sm:p-6 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white overflow-hidden flex-shrink-0">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold">{editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
                    <p className="text-xs sm:text-sm text-white/80">{editingExpense ? 'Mettez à jour les informations' : 'Enregistrez une nouvelle dépense'}</p>
                  </div>
                </div>
                <button type="button" onClick={resetForm} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Catégorie *</label>
                  <CustomSelect
                    value={formData.category}
                    onChange={(value) => setFormData((prev) => ({ ...prev, category: value as ExpenseCategory }))}
                    placeholder="Sélectionner une catégorie"
                    options={EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-200 dark:border-gray-700 rounded-full focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:bg-gray-700 dark:text-white transition-all text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Montant (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Plein d'essence pour déplacement client"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-row gap-3 p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors text-sm sm:text-base font-medium shadow-md"
                >
                  {editingExpense ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
    </div>
  );
}
