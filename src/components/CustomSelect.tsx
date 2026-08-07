import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

interface DropdownPosition {
  left: number;
  width: number;
  top: number;
  bottom: number;
  openUp: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Sélectionner...",
  required = false,
  disabled = false,
  className = "",
  label,
  error
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const DROPDOWN_ESTIMATED_HEIGHT = 260; // barre de recherche + liste (max-h-60)

  // Calcule la position du dropdown par rapport au bouton, en tenant compte
  // de l'espace disponible dans la fenêtre (pas seulement dans un conteneur scrollable parent)
  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < DROPDOWN_ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

    setDropdownPosition({
      left: rect.left,
      width: rect.width,
      top: rect.bottom,
      bottom: window.innerHeight - rect.top,
      openUp
    });
  }, []);

  // Fermer le dropdown quand on clique à l'extérieur (bouton ou menu flottant)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedButton = selectRef.current && selectRef.current.contains(target);
      const clickedMenu = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedButton && !clickedMenu) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus sur l'input de recherche quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Recalculer la position à l'ouverture et pendant le scroll/resize (le dropdown flotte
  // au-dessus de tout via un portail, il ne doit donc jamais être tronqué par un conteneur
  // au scroll interne comme le corps d'une modale)
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, updatePosition]);

  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div ref={selectRef} className="relative">
        {/* Bouton de sélection */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onMouseDown={(e) => {
            // Empêcher le focus automatique au clic
            if (className.includes('focus:ring-0')) {
              e.preventDefault();
            }
          }}
          disabled={disabled}
          className={`
            w-full px-3 py-2.5 sm:px-4 sm:py-3
            border border-gray-300 dark:border-gray-600
            rounded-full
            ${className.includes('focus:ring-0') ? '' : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
            transition-colors
            bg-white dark:bg-slate-800
            text-gray-900 dark:text-white
            text-sm sm:text-base
            flex items-center justify-between
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500'}
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className.includes('focus:ring-0') ? 'focus:ring-0 focus:ring-offset-0 focus:border-none outline-none focus-visible:ring-0 focus-visible:outline-none' : ''}
          `}
        >
          <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown - rendu via portail pour ne jamais être tronqué par une modale au scroll interne */}
        {isOpen && dropdownPosition && createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden"
            style={{
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              ...(dropdownPosition.openUp
                ? { bottom: dropdownPosition.bottom + 4, top: undefined }
                : { top: dropdownPosition.top + 4 })
            }}
          >
            {/* Barre de recherche */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
              />
            </div>

            {/* Liste des options */}
            <div className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-900">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`
                      w-full px-3 py-2 text-left text-sm
                      flex items-center justify-between
                      transition-colors
                      ${option.disabled
                        ? 'opacity-50 cursor-not-allowed text-gray-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white'
                      }
                      ${option.value === value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                    `}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Aucun résultat trouvé
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
