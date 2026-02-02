import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import './CustomSelect.scss';

/**
 * CustomSelect - Dropdown estilizado para PC Fútbol Web
 * 
 * Props:
 * - value: valor seleccionado actual
 * - onChange: callback(value)
 * - options: array de { value, label, icon? } o { group, icon?, items: [{ value, label, icon? }] }
 * - placeholder: texto cuando no hay selección
 * - searchable: boolean, si permite buscar (default: false, auto si >10 opciones)
 * - searchPlaceholder: placeholder del input de búsqueda
 * - compact: boolean, tamaño más pequeño
 * - className: clase CSS adicional
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  searchable,
  searchPlaceholder = 'Buscar...',
  compact = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  // Normalizar opciones en formato plano con info de grupo
  const flatOptions = useMemo(() => {
    const flat = [];
    for (const opt of options) {
      if (opt.group) {
        for (const item of (opt.items || [])) {
          flat.push({ ...item, groupLabel: opt.group, groupIcon: opt.icon });
        }
      } else {
        flat.push(opt);
      }
    }
    return flat;
  }, [options]);

  // Auto-activar búsqueda si hay muchas opciones
  const showSearch = searchable !== undefined ? searchable : flatOptions.length > 10;

  // Encontrar la opción seleccionada actual
  const selectedOption = flatOptions.find(o => o.value === value);

  // Filtrar opciones por búsqueda
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    const result = [];

    for (const opt of options) {
      if (opt.group) {
        const filteredItems = q
          ? opt.items.filter(item => 
              item.label.toLowerCase().includes(q) ||
              (item.icon && item.icon.toLowerCase().includes(q)) ||
              opt.group.toLowerCase().includes(q)
            )
          : opt.items;
        if (filteredItems.length > 0) {
          result.push({ ...opt, items: filteredItems });
        }
      } else {
        if (!q || opt.label.toLowerCase().includes(q)) {
          result.push(opt);
        }
      }
    }
    return result;
  }, [options, search]);

  // Flat filtered para navegación con teclado
  const filteredFlat = useMemo(() => {
    const flat = [];
    for (const opt of filteredGroups) {
      if (opt.group) {
        for (const item of (opt.items || [])) {
          flat.push(item);
        }
      } else {
        flat.push(opt);
      }
    }
    return flat;
  }, [filteredGroups]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // Focus en búsqueda al abrir
  useEffect(() => {
    if (isOpen && showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Scroll al ítem seleccionado al abrir
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const activeItem = listRef.current.querySelector('.custom-select__option.active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, value]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIdx(filteredFlat.findIndex(o => o.value === value));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(prev => Math.min(prev + 1, filteredFlat.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < filteredFlat.length) {
          handleSelect(filteredFlat[highlightIdx].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightIdx >= 0) {
      const items = listRef.current.querySelectorAll('.custom-select__option');
      if (items[highlightIdx]) {
        items[highlightIdx].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIdx, isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
    setHighlightIdx(-1);
  };

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (isOpen) {
      setSearch('');
      setHighlightIdx(-1);
    }
  };

  let flatIdx = -1; // para tracking del highlight en la lista agrupada

  return (
    <div 
      ref={containerRef} 
      className={`custom-select ${isOpen ? 'open' : ''} ${compact ? 'compact' : ''} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger button */}
      <button 
        type="button"
        className="custom-select__trigger"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="custom-select__trigger-text">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="custom-select__icon">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : (
            <span className="custom-select__placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={compact ? 14 : 16} className="custom-select__chevron" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="custom-select__dropdown">
          {/* Search */}
          {showSearch && (
            <div className="custom-select__search">
              <Search size={14} />
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIdx(0);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options list */}
          <div ref={listRef} className="custom-select__list" role="listbox">
            {filteredGroups.length === 0 && (
              <div className="custom-select__empty">Sin resultados</div>
            )}
            {filteredGroups.map((opt, gIdx) => {
              if (opt.group) {
                return (
                  <div key={`g-${gIdx}`} className="custom-select__group">
                    <div className="custom-select__group-label">
                      {opt.icon && <span className="custom-select__group-icon">{opt.icon}</span>}
                      {opt.group}
                    </div>
                    {opt.items.map((item) => {
                      flatIdx++;
                      const curIdx = flatIdx;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="option"
                          aria-selected={item.value === value}
                          className={`custom-select__option ${item.value === value ? 'active' : ''} ${curIdx === highlightIdx ? 'highlighted' : ''}`}
                          onClick={() => handleSelect(item.value)}
                          onMouseEnter={() => setHighlightIdx(curIdx)}
                        >
                          {item.icon && <span className="custom-select__option-icon">{item.icon}</span>}
                          <span className="custom-select__option-label">{item.label}</span>
                          {item.value === value && <span className="custom-select__check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              } else {
                flatIdx++;
                const curIdx = flatIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    className={`custom-select__option ${opt.value === value ? 'active' : ''} ${curIdx === highlightIdx ? 'highlighted' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightIdx(curIdx)}
                  >
                    {opt.icon && <span className="custom-select__option-icon">{opt.icon}</span>}
                    <span className="custom-select__option-label">{opt.label}</span>
                    {opt.value === value && <span className="custom-select__check">✓</span>}
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}
