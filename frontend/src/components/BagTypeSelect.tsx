import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { Order } from '../types'
import { bagTypeSuggestions, bagTypes } from '../lib/bagTypes'

export function BagTypeSelect({ orders, defaultValue = '' }: { orders: Pick<Order, 'bagType'>[]; defaultValue?: string }) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState(defaultValue)
  const [query, setQuery] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [active, setActive] = useState(-1)
  const search = selected ? '' : query
  const matches = bagTypeSuggestions(search, orders, defaultValue)
  const options = search.trim() || showAll ? matches : matches.slice(0, 5)
  const openMenu = () => {
    const rect = input.current?.getBoundingClientRect()
    const bottomClearance = window.innerWidth < 1024 ? 80 : 16
    setAbove(Boolean(rect && window.innerHeight - rect.bottom - bottomClearance < 288 && rect.top > 288))
    setOpen(true)
  }
  const choose = (value: string) => {
    setSelected(value)
    setQuery(value)
    setOpen(false)
    setActive(-1)
    input.current?.setCustomValidity('')
    input.current?.focus()
    // Focusing the input opens the menu; close it after that focus event.
    setOpen(false)
  }
  useEffect(() => {
    input.current?.setCustomValidity(selected ? '' : 'Select a bag type from the dropdown.')
  }, [selected])
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, id])
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])
  return (
    <div ref={root} className="min-w-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <label className="label mt-4" htmlFor={`${id}-input`}>Type of bag *</label>
      <input type="hidden" name="bagType" value={selected} />
      <div className="relative">
        <input ref={input} id={`${id}-input`} className="field pr-12" role="combobox" aria-autocomplete="list"
          aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 && active < options.length ? `${id}-option-${active}` : undefined}
          aria-describedby={`${id}-help`} autoComplete="off" required value={query} placeholder="Search or select a bag type"
          onFocus={openMenu}
          onChange={event => { setQuery(event.target.value); setSelected(''); openMenu(); setShowAll(false); setActive(-1) }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false) }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); openMenu()
              setActive(event.key === 'ArrowDown' ? Math.min(active + 1, options.length - 1) : active <= 0 ? options.length - 1 : active - 1)
            }
            if (event.key === 'Enter' && open && (active >= 0 || !selected)) {
              event.preventDefault()
              const value = options[active >= 0 ? active : 0]
              if (value) choose(value)
            }
          }} />
        <button type="button" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Show bag types" aria-expanded={open} onClick={() => { if (open) setOpen(false); else openMenu(); setActive(-1) }}><ChevronDown className="size-5" /></button>
        {open && <div className={`absolute z-30 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg ${above ? 'bottom-full mb-2' : 'mt-2'}`}>
          <div id={`${id}-list`} role="listbox" aria-label="Bag types" className="max-h-60 overflow-y-auto">
            {options.map((value, index) => <button type="button" role="option" id={`${id}-option-${index}`} aria-selected={value === selected} key={value}
              className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-navy-900 hover:bg-sky-50 focus:bg-sky-50 ${active === index ? 'bg-sky-50' : ''}`}
              onClick={() => choose(value)}>
              <span className="min-w-0 break-words">{value}{!bagTypes.some(type => type === value) && <span className="block text-xs font-normal text-slate-500">Existing order type</span>}</span>
              {selected === value && <Check className="size-4 shrink-0 text-emerald-600" />}
            </button>)}
            {!options.length && <p className="px-3 py-3 text-sm text-slate-500">No matching bag type. Choose Other for a different type.</p>}
          </div>
          {!options.length && <button type="button" className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-bold text-brand hover:bg-sky-50" onClick={() => choose('Other')}>Use Other</button>}
          {!search.trim() && !showAll && matches.length > options.length && <button type="button" className="min-h-11 w-full border-t border-slate-100 px-3 text-left text-sm font-bold text-brand" onClick={() => setShowAll(true)}>Show all bag types</button>}
        </div>}
      </div>
      <p id={`${id}-help`} className="mt-2 text-xs text-slate-500">Most-used types appear first. Type a few letters or words, then select a type.</p>
    </div>
  )
}
