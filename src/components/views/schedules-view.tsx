'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, extractArray } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Trash2,
  Upload,
  Zap,
  Users,
  Layers,
  ChevronRight,
  UserCircle,
  Search,
  Download,
  Loader2,
  Filter,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import { formatTime12, formatSpecialization } from '@/lib/utils'
import { canPerformAction } from '@/lib/roles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// --- Types ---
interface ScheduleVersion {
  id: string
  name: string
  description?: string
  semester: string
  academicYear: string
  status: string
  publishedAt?: string
  createdAt: string
  _count?: { schedules: number }
  publisher?: { id: string; name: string; uid: string }
}

interface ScheduleItem {
  id: string
  day: string
  startTime: string
  endTime: string
  subjectId: string
  facultyId: string
  sectionId: string
  scheduleVersionId: string
  status: string
  subject: { id: string; subjectCode: string; subjectName: string; units: number; subjectType: string }
  faculty: { id: string; name: string; uid: string; specialization?: string; facultyType?: string }
  section: { id: string; sectionName: string; yearLevel: number; program?: { code: string; name: string } }
}

interface FacultyItem {
  id: string
  name: string
  uid: string
  specialization?: string
  facultyType?: string
  department?: { name: string; code: string }
}

interface SectionItem {
  id: string
  sectionName: string
  yearLevel: number
  program?: { code: string; name: string }
}

// --- Constants ---
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_LABELS: Record<string, string> = {
  Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT',
}
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
}

// 30-min interval rows from 7:00 AM to 9:00 PM
const TIME_ROWS: string[] = []
for (let h = 7; h <= 20; h++) {
  TIME_ROWS.push(`${h.toString().padStart(2, '0')}:00`)
  TIME_ROWS.push(`${h.toString().padStart(2, '0')}:30`)
}
TIME_ROWS.push('21:00')

// Helper: find the TIME_ROWS index for a given "HH:MM" time string
// Returns -1 if not found exactly; falls back to computed index from time value
function timeToRowIndex(time: string): number {
  const exact = TIME_ROWS.indexOf(time)
  if (exact !== -1) return exact
  // Fallback: compute from hours/minutes
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return -1
  // TIME_ROWS[0] = 07:00, each index = 30 min
  const startHour = 7
  const idx = (h - startHour) * 2 + (m >= 30 ? 1 : 0)
  return idx >= 0 && idx < TIME_ROWS.length ? idx : -1
}

// Helper: compute rowspan from start/end time strings
function computeRowspan(startTime: string, endTime: string): number {
  const startIdx = timeToRowIndex(startTime)
  const endIdx = timeToRowIndex(endTime)
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) return endIdx - startIdx
  // Fallback: parse duration in minutes
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const durationMin = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(1, Math.round(durationMin / 30))
}

// Subject type color system
const TYPE_STYLES: Record<string, { card: string; header: string; dot: string; label: string }> = {
  lecture: {
    card: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    header: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    label: 'text-emerald-700 dark:text-emerald-300',
  },
  lab: {
    card: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800',
    header: 'bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
    label: 'text-sky-700 dark:text-sky-300',
  },
  lecture_and_lab: {
    card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    header: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    label: 'text-amber-700 dark:text-amber-300',
  },
}


const DEFAULT_STYLE = TYPE_STYLES.lecture

function getTypeStyle(type: string) {
  return TYPE_STYLES[type] || DEFAULT_STYLE
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, type = 'version' }: { status: string; type?: 'version' | 'schedule' }) {
  const versionMap: Record<string, { cls: string; label: string }> = {
    draft: { cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Draft' },
    published: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Finalized' },
    archived: { cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', label: 'Archived' },
  }
  const scheduleMap: Record<string, { cls: string; label: string }> = {
    initial: { cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Initial Schedule' },
    finalized: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Finalized Schedule' },
  }
  const map = type === 'version' ? versionMap : scheduleMap
  const entry = map[status] || (type === 'version' ? versionMap.draft : scheduleMap.initial)
  return <Badge className={`${entry.cls} border text-[10px] uppercase tracking-wider`}>{entry.label}</Badge>
}

// ─── Schedule Block Card ──────────────────────────────────────────────────────
function ScheduleBlock({ item, rows }: { item: ScheduleItem; rows: number }) {
  const style = getTypeStyle(item.subject.subjectType)
  // rows = number of 30-min slots this card spans
  // Compact: 1-2 rows (30-60 min) — show header + subject code + time
  // Standard: 3+ rows (90+ min) — show all details including subject name, faculty, time
  const isCompact = rows <= 2

  return (
    <div className={`h-full flex flex-col rounded-md border ${style.card} transition-shadow hover:shadow-md relative`}>
      <div className={`px-2 py-0.5 border-b ${style.header} shrink-0`}>
        <p className="font-bold text-[11px] leading-tight tracking-wide uppercase truncate">
          {item.section.sectionName}
        </p>
        <p className="font-semibold text-[10px] leading-tight opacity-75 truncate">
          {item.subject.subjectCode}
        </p>
      </div>
      <div className="px-1.5 py-0.5 flex-1 flex flex-col justify-center gap-0.5 min-h-0">
        {isCompact ? (
          <>
            <p className="text-[9px] text-muted-foreground text-center font-mono truncate">
              {formatTime12(item.startTime)}–{formatTime12(item.endTime)}
            </p>
          </>
        ) : (
          <>
            <p className={`text-[10px] font-bold leading-snug text-center ${style.label} line-clamp-2`}>
              {item.subject.subjectName}
            </p>
            <div className="flex items-center justify-center gap-1">
              <UserCircle className="size-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">{item.faculty.name}</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 text-center font-mono truncate">
              {formatTime12(item.startTime)} – {formatTime12(item.endTime)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Grid (CSS Grid layout with fixed row heights) ──────────────────
function ScheduleGrid({
  schedules,
  filterFn,
  entityName,
  entitySub,
  onExportPdf,
  isExporting,
}: {
  schedules: ScheduleItem[]
  filterFn?: (s: ScheduleItem) => boolean
  entityName: string
  entitySub?: string
  onExportPdf?: () => void
  isExporting?: boolean
}) {
  const ROW_H = 36 // px per 30-min slot

  // Map schedule items by day+time key
  const scheduleMap = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {}
    schedules.forEach(s => {
      if (filterFn && !filterFn(s)) return
      const key = `${s.day}-${s.startTime}-${s.endTime}`
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [schedules, filterFn])

  // Compute card placements using absolute positioning offsets
  const cardPlacements = useMemo(() => {
    const placements: Array<{
      dayIdx: number   // 0-5 column index for the day
      startRow: number // 0-based row index (matches TIME_ROWS)
      rowspan: number  // number of 30-min rows this card spans
      items: ScheduleItem[]
    }> = []
    const occupied = new Set<string>()

    for (const [key, items] of Object.entries(scheduleMap)) {
      if (!items?.length) continue
      const parts = key.split('-')
      const day = parts[0]
      const startTime = parts[1]
      const endTime = parts.slice(2).join('-')

      const startIdx = timeToRowIndex(startTime)
      if (startIdx === -1) continue

      const rowspan = computeRowspan(startTime, endTime)
      const dayIdx = DAYS.indexOf(day as typeof DAYS[number])
      if (dayIdx === -1) continue

      // Check if this position is already occupied by a previous card
      const posKey = `${day}-${startIdx}`
      const existing = placements.find(p => p.dayIdx === dayIdx && p.startRow === startIdx)
      if (existing) {
        existing.items.push(...items)
        existing.rowspan = Math.max(existing.rowspan, rowspan)
      } else {
        placements.push({ dayIdx, startRow: startIdx, rowspan, items: [...items] })
      }

      // Mark rows occupied by this card
      for (let r = 1; r < rowspan; r++) {
        occupied.add(`${dayIdx}-${startIdx + r}`)
      }
    }
    return { placements, occupied }
  }, [scheduleMap])

  const dayTotals = useMemo(() => {
    const m: Record<string, number> = {}
    schedules.forEach(s => { if (!filterFn || filterFn(s)) m[s.day] = (m[s.day] || 0) + 1 })
    return m
  }, [schedules, filterFn])

  const total = Object.values(dayTotals).reduce((a, b) => a + b, 0)
  const totalRows = TIME_ROWS.length - 1 // exclude the trailing 21:00

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
      {/* Title bar */}
      <div className="bg-muted/40 border-b border-border px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground">{entityName}</h2>
          {entitySub && <p className="text-xs text-muted-foreground mt-0.5">{entitySub}</p>}
        </div>
        <div className="flex items-center gap-5">
          <Legend />
          <div className="text-xs text-muted-foreground font-mono border-l border-border pl-5">
            {total} class{total !== 1 ? 'es' : ''}/week
          </div>
          {onExportPdf && (
            <Button
              onClick={onExportPdf}
              disabled={isExporting}
              size="sm"
              className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_12px_-3px_rgba(5,150,105,0.4)] hover:shadow-[0_0_16px_-3px_rgba(5,150,105,0.6)] transition-all h-8 text-xs gap-1.5"
            >
              {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          )}
        </div>
      </div>

      {/* Desktop grid — CSS Grid for pixel-perfect alignment */}
      <div className="hidden lg:block flex-1 min-h-0 overflow-auto custom-scrollbar">
        <div
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `72px repeat(${DAYS.length}, 1fr)`,
            gridTemplateRows: `auto repeat(${totalRows}, ${ROW_H}px)`,
          }}
        >
          {/* ── Header row (sticky top) ── */}
          <div
            className="sticky top-0 z-20 bg-muted border border-border text-center px-2 py-2.5 font-bold text-muted-foreground text-xs uppercase tracking-widest"
            style={{ gridColumn: '1', gridRow: '1' }}
          >
            Time
          </div>
          {DAYS.map((day, di) => (
            <div
              key={day}
              className="sticky top-0 z-20 bg-muted border border-border text-center px-2 py-2.5"
              style={{ gridColumn: `${di + 2}`, gridRow: '1' }}
            >
              <span className="font-heading font-bold text-xs text-foreground uppercase tracking-widest">
                {DAY_LABELS[day]}
              </span>
              {dayTotals[day] > 0 && (
                <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{dayTotals[day]}</span>
              )}
            </div>
          ))}

          {/* ── Time label cells ── */}
          {TIME_ROWS.slice(0, -1).map((time, ri) => {
            const hr = time.endsWith(':00')
            const label = hr ? formatTime12(time) : ''
            return (
              <div
                key={`time-${ri}`}
                className={`sticky left-0 z-10 ${hr ? 'bg-muted' : 'bg-muted/80'} border border-border text-center px-2 py-1 font-mono text-xs text-muted-foreground whitespace-nowrap flex items-center justify-center`}
                style={{ gridColumn: '1', gridRow: `${ri + 2}` }}
              >
                {label}
              </div>
            )
          })}

          {/* ── Empty grid cells (background + borders) ── */}
          {TIME_ROWS.slice(0, -1).map((time, ri) => {
            const hr = time.endsWith(':00')
            return DAYS.map((day, di) => {
              const k = `${di}-${ri}`
              // Skip cells occupied by a card's span
              if (cardPlacements.occupied.has(k)) return null
              // Skip cells that have a card starting in them (rendered below)
              const hasCard = cardPlacements.placements.some(p => p.dayIdx === di && p.startRow === ri)
              if (hasCard) return null
              return (
                <div
                  key={`cell-${day}-${ri}`}
                  className={`border border-border ${hr ? 'bg-background' : 'bg-muted/5'}`}
                  style={{ gridColumn: `${di + 2}`, gridRow: `${ri + 2}` }}
                />
              )
            })
          })}

          {/* ── Schedule cards ── */}
          {cardPlacements.placements.map((placement, idx) => (
            <div
              key={`card-${idx}`}
              className="border border-border p-0.5"
              style={{
                gridColumn: `${placement.dayIdx + 2}`,
                gridRow: `${placement.startRow + 2} / span ${placement.rowspan}`,
              }}
            >
              {placement.items.length === 1
                ? <ScheduleBlock item={placement.items[0]} rows={placement.rowspan} />
                : <div className="h-full flex flex-col gap-0.5">{placement.items.map(i => <ScheduleBlock key={i.id} item={i} rows={Math.max(2, Math.floor(placement.rowspan / placement.items.length))} />)}</div>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden p-4">
        <MobileView schedules={schedules} filterFn={filterFn} />
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  const TYPE_LABELS: Record<string, string> = {
    lecture: 'Lecture',
    lab: 'Laboratory',
    lecture_and_lab: 'Lecture & Lab',
  }
  return (
    <div className="flex items-center gap-3">
      {Object.entries(TYPE_STYLES).map(([type, s]) => (
        <div key={type} className="flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.dot}`} />
          <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[type] || type}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Mobile Day View ──────────────────────────────────────────────────────────
function MobileView({ schedules, filterFn }: { schedules: ScheduleItem[]; filterFn?: (s: ScheduleItem) => boolean }) {
  const [day, setDay] = useState<string>('Mon')
  const items = useMemo(() => schedules.filter(s => (!filterFn || filterFn(s)) && s.day === day), [schedules, filterFn, day])
  const grouped = useMemo(() => {
    // Group by unique startTime-endTime pairs from actual schedule data
    const map = new Map<string, { start: string; end: string; items: ScheduleItem[] }>()
    for (const s of items) {
      const key = `${s.startTime}-${s.endTime}`
      if (!map.has(key)) map.set(key, { start: s.startTime, end: s.endTime, items: [] })
      map.get(key)!.items.push(s)
    }
    // Sort by start time
    return Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start))
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {DAYS.map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
              day === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {DAY_FULL[d]}
          </button>
        ))}
      </div>
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No classes on {DAY_FULL[day]}</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ start, end, items }) => (
            <div key={start} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">{formatTime12(start)} – {formatTime12(end)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{items.length} class{items.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="divide-y divide-border">
                {items.map(i => <div key={i.id} className="p-3"><ScheduleBlock item={i} rows={4} /></div>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar Entity Card ──────────────────────────────────────────────────────
function EntityCard({ name, sub, badge, isSelected, onClick }: {
  name: string; sub?: string; badge?: string; isSelected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        isSelected
          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-transparent hover:bg-muted/50 hover:border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
            {name}
          </p>
          {sub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub}</p>}
        </div>
        {badge && (
          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
            isSelected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SchedulesView() {
  const queryClient = useQueryClient()
  const { user, selectedScheduleVersionId, setSelectedScheduleVersionId, setCurrentView } = useAppStore()
  const [viewMode, setViewMode] = useState<'faculty' | 'section'>('faculty')
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Role-based permission flags
  const canFinalize = canPerformAction(user?.role, 'finalizeSchedule')
  const canDelete = canPerformAction(user?.role, 'deleteSchedule')
  const canExport = canPerformAction(user?.role, 'exportReport')
  const canGenerate = canPerformAction(user?.role, 'generateSchedule')

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['schedule-versions'],
    queryFn: async () => { const r = await api.get<{ data: ScheduleVersion[]; pagination: { total: number } }>('/schedule-versions'); return r.data },
  })
  const versions: ScheduleVersion[] = extractArray<ScheduleVersion>(versionsData)
  const currentVersionId = selectedScheduleVersionId || (versions.length > 0 ? versions[0].id : '')
  const currentVersion = versions.find(v => v.id === currentVersionId)

  useEffect(() => { if (versions.length > 0 && !selectedScheduleVersionId) setSelectedScheduleVersionId(versions[0].id) }, [versions, selectedScheduleVersionId, setSelectedScheduleVersionId])

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', currentVersionId],
    queryFn: async () => { if (!currentVersionId) return null; const r = await api.get<{ data: ScheduleItem[]; pagination: { total: number } }>(`/schedules?scheduleVersionId=${currentVersionId}&limit=500`); return r.data },
    enabled: !!currentVersionId,
  })
  const schedules: ScheduleItem[] = extractArray<ScheduleItem>(schedulesData)

  const { data: facultyData } = useQuery({
    queryKey: ['faculty-list', classFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ role: 'faculty', limit: '100' })
      if (classFilter === 'regular') params.set('facultyType', 'regular')
      else if (classFilter === 'executive') params.set('facultyType', 'masteral')
      const r = await api.get<{ data: FacultyItem[] }>(`/users?${params.toString()}`)
      return r.data
    },
  })
  const facultyList: FacultyItem[] = extractArray<FacultyItem>(facultyData)

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-list'],
    queryFn: async () => { const r = await api.get<{ data: SectionItem[] }>('/sections?limit=100'); return r.data },
  })
  const sectionList: SectionItem[] = extractArray<SectionItem>(sectionsData)

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => api.put(`/schedule-versions/${id}`, { status }),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['schedule-versions'] }) },
    onError: (error: Error) => { console.error('Status update failed:', error); setError(error.message || 'An unexpected error occurred') },
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/schedule-versions/${id}`),
    onSuccess: () => { setError(null); setShowDeleteConfirm(false); setSelectedScheduleVersionId(null); queryClient.invalidateQueries({ queryKey: ['schedule-versions'] }) },
    onError: (error: Error) => { console.error('Delete schedule version failed:', error); setShowDeleteConfirm(false); setError(error.message || 'An unexpected error occurred') },
  })

  // Filter schedules by class type (faculty type of the assigned professor)
  const classFilteredSchedules = useMemo(() => {
    if (classFilter === 'all') return schedules
    if (classFilter === 'regular') return schedules.filter(s => s.faculty.facultyType === 'regular')
    if (classFilter === 'executive') return schedules.filter(s => s.faculty.facultyType === 'masteral')
    return schedules
  }, [schedules, classFilter])

  const facultyStats = useMemo(() => {
    const s: Record<string, { count: number; units: number }> = {}
    classFilteredSchedules.forEach(sc => { if (!s[sc.facultyId]) s[sc.facultyId] = { count: 0, units: 0 }; s[sc.facultyId].count++; s[sc.facultyId].units += sc.subject?.units || 0 })
    return s
  }, [classFilteredSchedules])

  const sectionStats = useMemo(() => {
    const s: Record<string, number> = {}
    classFilteredSchedules.forEach(sc => { s[sc.sectionId] = (s[sc.sectionId] || 0) + 1 })
    return s
  }, [classFilteredSchedules])

  const facultyFilter = useMemo(() => selectedFacultyId ? ((s: ScheduleItem) => s.facultyId === selectedFacultyId) : undefined, [selectedFacultyId])
  const sectionFilter = useMemo(() => selectedSectionId ? ((s: ScheduleItem) => s.sectionId === selectedSectionId) : undefined, [selectedSectionId])

  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId)
  const selectedSection = sectionList.find(s => s.id === selectedSectionId)

  const sortedFaculty = useMemo(() => {
    const q = search.toLowerCase()
    return [...facultyList]
      .filter(f => !q || f.name.toLowerCase().includes(q) || formatSpecialization(f.specialization).toLowerCase().includes(q))
      .sort((a, b) => {
        const ac = facultyStats[a.id]?.count || 0, bc = facultyStats[b.id]?.count || 0
        return bc - ac || a.name.localeCompare(b.name)
      })
  }, [facultyList, facultyStats, search])

  const sortedSections = useMemo(() => {
    const q = search.toLowerCase()
    return [...sectionList]
      .filter(s => !q || s.sectionName.toLowerCase().includes(q) || (s.program && s.program.code.toLowerCase().includes(q)))
      .sort((a, b) => (sectionStats[b.id] || 0) - (sectionStats[a.id] || 0) || a.sectionName.localeCompare(b.sectionName))
  }, [sectionList, sectionStats, search])

  const hasSelection = (viewMode === 'faculty' && selectedFacultyId) || (viewMode === 'section' && selectedSectionId)

  const handleExportPdf = async () => {
    if (!selectedFacultyId || !currentVersionId) return
    setIsExporting(true)
    try {
      const url = `/api/export/faculty-schedule?facultyId=${selectedFacultyId}&scheduleVersionId=${currentVersionId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')

      // Get the PDF blob and trigger automatic download
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      // Use filename from Content-Disposition header, or fallback
      const contentDisposition = res.headers.get('Content-Disposition')
      const match = contentDisposition?.match(/filename="?(.+?)"?$/)
      a.download = match?.[1] || 'schedule.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)]">
      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center mb-4">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#10B981]/10">
            <Calendar className="size-5 text-[#10B981]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground leading-tight">Schedules</h1>
            {currentVersion && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StatusBadge status={currentVersion.status} />
                <span className="text-xs text-muted-foreground">Sem: <span className="font-mono text-foreground">{currentVersion.semester}</span></span>
                <span className="text-xs text-muted-foreground">AY: <span className="font-mono text-foreground">{currentVersion.academicYear}</span></span>
                <span className="text-xs text-muted-foreground">Schedules: <span className="font-mono text-[#10B981]">{currentVersion._count?.schedules || schedules.length}</span></span>
              </div>
            )}
            {!currentVersion && (
              <p className="text-sm text-muted-foreground">Faculty &amp; section weekly timetables</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={currentVersionId} onValueChange={setSelectedScheduleVersionId}>
            <SelectTrigger className="w-[260px] bg-card border-border text-foreground">
              <SelectValue placeholder="Select schedule version" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {versions.map(v => (
                <SelectItem key={v.id} value={v.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                  <div className="flex items-center gap-2"><span>{v.name}</span><StatusBadge status={v.status} /></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentVersion && canFinalize && (
            <Button
              onClick={() => {
                const nextStatus = currentVersion.status === 'draft' ? 'published' : 'draft'
                statusMutation.mutate({ id: currentVersionId, status: nextStatus })
              }}
              disabled={statusMutation.isPending}
              className={`${
                currentVersion.status === 'draft'
                  ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)]'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.7)]'
              } font-bold rounded-full transition-all`}
            >
              {currentVersion.status === 'draft' ? (
                <><Upload className="size-4" />Finalize</>
              ) : (
                <><Zap className="size-4" />Revert to Draft</>
              )}
            </Button>
          )}
          {currentVersion && canDelete && (
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-full">
              <Trash2 className="size-4" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!currentVersionId && !versionsLoading && (
        <div className="flex flex-col items-center justify-center py-20 flex-1">
          <div className="p-4 rounded-2xl bg-[#10B981]/10 mb-4"><Calendar className="size-10 text-[#10B981]" /></div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Schedule Version Selected</h3>
          <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">Generate a new schedule to get started, or select an existing version.</p>
          {canGenerate && (
            <Button onClick={() => setCurrentView('generate')}
              className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all">
              <Zap className="size-4" />Generate Schedule<ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* Loading */}
      {(versionsLoading || schedulesLoading) && currentVersionId && (
        <div className="bg-card border border-border rounded-2xl p-12 flex items-center justify-center flex-1">
          <div className="flex items-center gap-3">
            <div className="size-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading schedules...</span>
          </div>
        </div>
      )}

      {/* ─── Main Layout: Sidebar + Grid ─── */}
      {currentVersionId && !schedulesLoading && (
        <div className="flex gap-4 flex-1 min-h-0 mt-4">
          {/* Sidebar */}
          <div className="w-[280px] shrink-0 hidden lg:block h-full">
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">

              {/* Filter controls at top */}
              <div className="p-3 border-b border-border space-y-2.5">
                {/* View Mode: Faculty / Section dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">View By</label>
                  <Select value={viewMode} onValueChange={(v: 'faculty' | 'section') => { setViewMode(v); setSearch(''); if (v === 'faculty') setSelectedSectionId(''); else setSelectedFacultyId('') }}>
                    <SelectTrigger className="w-full bg-secondary border-border text-foreground h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="faculty" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Users className="size-3" /> Faculty</div>
                      </SelectItem>
                      <SelectItem value="section" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Layers className="size-3" /> Sections</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Class Type: All / Regular / Executive dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Class Type</label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="w-full bg-secondary border-border text-foreground h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Filter className="size-3" /> All Classes</div>
                      </SelectItem>
                      <SelectItem value="regular" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><GraduationCap className="size-3" /> Regular</div>
                      </SelectItem>
                      <SelectItem value="executive" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Briefcase className="size-3" /> Executive</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={viewMode === 'faculty' ? 'Search faculty...' : 'Search sections...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-2 space-y-0.5">
                {viewMode === 'faculty' ? sortedFaculty.map(f => (
                  <EntityCard
                    key={f.id}
                    name={f.name}
                    sub={formatSpecialization(f.specialization) || (f.facultyType === 'masteral' ? 'Masteral' : 'Regular')}
                    badge={facultyStats[f.id]?.count ? `${facultyStats[f.id].count}` : undefined}
                    isSelected={selectedFacultyId === f.id}
                    onClick={() => setSelectedFacultyId(f.id)}
                  />
                )) : sortedSections.map(s => (
                  <EntityCard
                    key={s.id}
                    name={s.sectionName}
                    sub={s.program ? `${s.program.code} · Year ${s.yearLevel}` : undefined}
                    badge={sectionStats[s.id] ? `${sectionStats[s.id]}` : undefined}
                    isSelected={selectedSectionId === s.id}
                    onClick={() => setSelectedSectionId(s.id)}
                  />
                ))}
              </div>

              {/* Footer stat */}
              <div className="px-3 py-2.5 border-t border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground font-mono text-center">
                  {viewMode === 'faculty' ? sortedFaculty.length : sortedSections.length} {viewMode === 'faculty' ? 'faculty' : 'sections'}
                  {classFilter !== 'all' && <span className="ml-1 text-emerald-500">({classFilter === 'executive' ? 'Executive' : 'Regular'})</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="lg:hidden w-full space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Select value={viewMode} onValueChange={(v: 'faculty' | 'section') => { setViewMode(v); setSearch(''); if (v === 'faculty') setSelectedSectionId(''); else setSelectedFacultyId('') }}>
                <SelectTrigger className="w-[120px] bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="section">Sections</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[140px] bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === 'faculty' ? (
                <Select value={selectedFacultyId || undefined} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="flex-1 bg-card border-border text-foreground"><SelectValue placeholder="Select faculty..." /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {sortedFaculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedSectionId || undefined} onValueChange={setSelectedSectionId}>
                  <SelectTrigger className="flex-1 bg-card border-border text-foreground"><SelectValue placeholder="Select section..." /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {sortedSections.map(s => <SelectItem key={s.id} value={s.id}>{s.sectionName} {s.program ? `— ${s.program.code}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Main grid area */}
          <div className="flex-1 min-w-0 h-full">
            {viewMode === 'faculty' && selectedFacultyId && selectedFaculty ? (
              <ScheduleGrid
                schedules={classFilteredSchedules}
                filterFn={facultyFilter}
                entityName={selectedFaculty.name}
                entitySub={`${formatSpecialization(selectedFaculty.specialization) || (selectedFaculty.facultyType === 'masteral' ? 'Masteral' : 'Regular')} · ${facultyStats[selectedFacultyId]?.units || 0} units · ${currentVersion?.academicYear} · ${currentVersion?.semester}`}
                onExportPdf={canExport ? handleExportPdf : undefined}
                isExporting={isExporting}
              />
            ) : viewMode === 'section' && selectedSectionId && selectedSection ? (
              <ScheduleGrid
                schedules={classFilteredSchedules}
                filterFn={sectionFilter}
                entityName={selectedSection.sectionName}
                entitySub={`${selectedSection.program?.code || 'Section'} · Year ${selectedSection.yearLevel} · ${currentVersion?.academicYear} · ${currentVersion?.semester}`}
              />
            ) : (
              <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-24 shadow-sm">
                <div className="p-5 rounded-2xl bg-muted/50 mb-5">
                  {viewMode === 'faculty'
                    ? <Users className="size-9 text-muted-foreground/50" />
                    : <Layers className="size-9 text-muted-foreground/50" />
                  }
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">
                  {viewMode === 'faculty' ? 'Select a Faculty Member' : 'Select a Section'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {viewMode === 'faculty'
                    ? 'Choose a faculty member from the sidebar to view their individual weekly schedule.'
                    : 'Choose a section from the sidebar to view their weekly class schedule.'}
                </p>
                {classFilter !== 'all' && (
                  <Badge className="mt-3 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 border text-xs">
                    {classFilter === 'executive' ? 'Executive' : 'Regular'} class filter active
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Schedule Version</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete this schedule version and all its schedules. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-secondary/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteMutation.mutate(currentVersionId); setShowDeleteConfirm(false) }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
