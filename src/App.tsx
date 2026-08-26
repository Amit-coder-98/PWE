import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Bell, Boxes, CheckCircle2, ChevronRight, ClipboardList,
  Factory, HelpCircle, LayoutDashboard, LogOut, Menu, PackageCheck,
  RotateCcw, Search, Settings, ShieldCheck, Users, X,
} from 'lucide-react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { StatusBadge } from './components/StatusBadge'
import { WorkflowMap } from './components/WorkflowMap'
import { ToastHost } from './components/ToastHost'
import { canManageStage, nextInstruction, productionStages, stageInfo, statusLabel } from './lib/workflow'
import { useApp } from './state/AppContext'
import type { Order, Role, StageKey } from './types'

const roleLabels: Record<Role, string> = {
  admin: 'Administrator', order_manager: 'Order / CRM Manager', inventory_manager: 'Material Manager',
  designer: 'Designer', cutting_manager: 'Cutting Manager', plate_operator: 'Plate Operator',
  printing_operator: 'Printing Operator', stitching_manager: 'Stitching Manager', packing_manager: 'Packing & D.C. Manager',
  accountant: 'Accountant', dispatch_manager: 'Dispatch & Delivery Manager',
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
const formatDate = (date?: string) => date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Not recorded'
const formatDateTime = (date?: string) => date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date)) : 'Not recorded'

function LoginPage() {
  const { login, users } = useApp()
  const [email, setEmail] = useState('admin@demo.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setSubmitting(true); setError(await login(email, password) ?? ''); setSubmitting(false) }
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9efff,transparent_38%),linear-gradient(145deg,#f8fafc,#eef3f9)] p-4 sm:p-7">
    <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden p-6 lg:block"><div className="inline-flex items-center gap-3"><span className="grid size-14 place-items-center rounded-2xl bg-brand text-xl font-black text-white">PB</span><div><p className="text-xl font-extrabold text-navy-900">Prabodhan Bag</p><p className="text-sm text-slate-500">Production Operations</p></div></div><h1 className="mt-12 max-w-xl text-5xl font-extrabold leading-[1.08] tracking-tight text-navy-900">Every order. Every department. One clear story.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">A simple workspace that tells each team member what needs attention now—and lets administrators understand the complete order without visiting ten screens.</p><div className="mt-8 grid max-w-xl grid-cols-3 gap-3"><Feature icon={<ClipboardList />} label="Clear work queue" /><Feature icon={<ShieldCheck />} label="Safe confirmations" /><Feature icon={<Factory />} label="Live workflow" /></div></section>
      <section className="surface mx-auto w-full max-w-lg overflow-hidden"><div className="bg-navy-900 p-5 text-white sm:p-7"><div className="flex items-center gap-3 lg:hidden"><span className="grid size-12 place-items-center rounded-xl bg-brand text-lg font-black">PB</span><div><p className="font-extrabold">Prabodhan Bag</p><p className="text-xs text-slate-300">Production Operations</p></div></div><p className="eyebrow mt-6 !text-orange-300 lg:mt-0">Secure workspace</p><h1 className="mt-2 text-2xl font-bold">Welcome back</h1><p className="mt-1 text-sm text-slate-300">Choose your role and sign in to see today’s work.</p></div>
        <form className="p-5 sm:p-7" onSubmit={submit} noValidate>
          <label className="label" htmlFor="demo-role">Demo role</label><select id="demo-role" className="field" value={email} onChange={(event) => { setEmail(event.target.value); setPassword('admin123'); setError('') }}>{users.map((user) => <option value={user.email} key={user.id}>{roleLabels[user.role]} — {user.name}</option>)}</select>
          <label className="label mt-4" htmlFor="email">Email</label><input id="email" className="field" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="label mt-4" htmlFor="password">Password</label><input id="password" className="field" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{error}</p>}
          <button className="primary-button mt-6 w-full" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to workspace'} <ChevronRight className="size-5" /></button>
          <p className="mt-4 rounded-xl bg-sky-50 p-3 text-center text-sm text-sky-800"><strong>Demo password:</strong> admin123</p>
        </form>
      </section>
    </div>
  </main>
}

function Feature({ icon, label }: { icon: ReactNode; label: string }) { return <div className="rounded-xl border border-white bg-white/70 p-3 text-sm font-semibold text-navy-800 shadow-sm">{icon}<span className="mt-2 block">{label}</span></div> }

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/queue', label: 'My Work', icon: Factory }, { to: '/team', label: 'Team & Roles', icon: Users },
  { to: '/more', label: 'More', icon: Menu },
]

function Shell({ children }: { children: ReactNode }) {
  const { currentUser, orders } = useApp()
  const [mobileMenu, setMobileMenu] = useState(false)
  if (!currentUser) return null
  const issues = orders.filter((order) => Object.values(order.stages).some((stage) => ['blocked', 'issue'].includes(stage.status))).length
  return <div className="min-h-screen bg-[#f4f7fb] pb-20 md:pb-0">
    <ToastHost />
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 p-4 text-white md:flex">
      <Link to="/" className="flex min-h-14 items-center gap-3 rounded-xl px-2"><span className="grid size-11 place-items-center rounded-xl bg-brand font-black">PB</span><span><strong className="block">Prabodhan Bag</strong><small className="text-slate-400">Production Operations</small></span></Link>
      <nav className="mt-8 space-y-1" aria-label="Main navigation">{nav.slice(0, 4).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-white text-navy-900' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="size-5" />{label}</NavLink>)}</nav>
      <div className="mt-auto rounded-xl bg-white/8 p-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-sky-500 font-bold">{currentUser.initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{currentUser.name}</p><p className="truncate text-xs text-slate-400">{roleLabels[currentUser.role]}</p></div></div><Link to="/more" className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-300 hover:bg-white/10"><Settings className="size-4" />Settings & help</Link></div>
    </aside>
    <div className="md:pl-64"><header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7"><button className="grid size-11 place-items-center rounded-xl border border-slate-200 md:hidden" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu className="size-5" /></button><div className="hidden md:block"><p className="text-xs font-semibold text-slate-500">{currentUser.department}</p><p className="font-bold text-navy-900">Good day, {currentUser.name.split(' ')[0]}</p></div><div className="ml-auto flex items-center gap-2"><Link to="/orders?filter=issues" className="relative grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={`${issues} urgent alerts`}><Bell className="size-5" />{issues > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full border-2 border-white bg-red-500" />}</Link><span className="hidden rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 sm:inline">{roleLabels[currentUser.role]}</span></div></header><main id="main-content" className="mx-auto max-w-[1440px] p-4 md:p-7">{children}</main></div>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(15,23,42,.08)] md:hidden" aria-label="Mobile navigation">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold ${isActive ? 'text-brand' : 'text-slate-500'}`}><Icon className="size-5" />{label}</NavLink>)}</nav>
    {mobileMenu && <div className="fixed inset-0 z-50 bg-navy-950/50 md:hidden" onClick={() => setMobileMenu(false)}><div className="h-full w-[86%] max-w-xs bg-white p-4" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><strong className="text-navy-900">Navigation</strong><button className="grid size-11 place-items-center rounded-xl" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X /></button></div><nav className="mt-4 space-y-2">{nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileMenu(false)} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 font-semibold text-slate-700"><Icon className="size-5" />{label}</NavLink>)}</nav></div></div>}
  </div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{eyebrow}</p><h1 className="page-title mt-1">{title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</header> }

function DashboardPage() {
  const { currentUser, orders } = useApp()
  if (!currentUser) return null
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'order_manager'
  const relevantStage = Object.entries(stageInfo).find(([, info]) => info.role === currentUser.role)?.[0] as StageKey | undefined
  const queue = isAdmin ? orders : orders.filter((order) => relevantStage && ['ready', 'in_progress', 'blocked', 'issue'].includes(order.stages[relevantStage].status))
  const active = orders.filter((order) => order.stages.delivery.status !== 'completed').length
  const issues = orders.filter((order) => Object.values(order.stages).some((state) => ['blocked', 'issue'].includes(state.status))).length
  const dueSoon = orders.filter((order) => order.expectedDelivery <= '2026-08-29' && order.stages.delivery.status !== 'completed').length
  return <><PageHeading eyebrow="Today’s overview" title={isAdmin ? 'Production at a glance' : `${currentUser.department} workspace`} description={isAdmin ? 'See urgent work first, then open any order to understand its complete journey.' : `Only the orders that need attention from ${currentUser.department} are shown here.`} action={<Link to="/orders" className="primary-button">View all orders <ChevronRight className="size-4" /></Link>} />
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi label="Total orders" value={orders.length} helper="All customer orders" icon={<ClipboardList />} /><Kpi label="Active now" value={active} helper="Still in process" icon={<Factory />} /><Kpi label="Need attention" value={issues} helper="Blocked or issue" icon={<AlertTriangle />} danger={issues > 0} /><Kpi label="Due soon" value={dueSoon} helper="By 29 Aug" icon={<PackageCheck />} /></section>
    {isAdmin && <section className="surface mt-5 p-4 md:p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-navy-900">Where orders are now</h2><p className="text-sm text-slate-500">Tap a stage to view matching orders.</p></div><Boxes className="size-6 text-slate-400" /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{productionStages.slice(0, 12).map((stage) => { const count = orders.filter((order) => order.currentStage === stage).length; return <Link to={`/orders?stage=${stage}`} key={stage} className="rounded-xl border border-slate-200 p-3 transition hover:border-sky-400 hover:bg-sky-50"><span className="text-2xl font-extrabold text-navy-900">{count}</span><span className="mt-1 block text-xs font-semibold text-slate-600">{stageInfo[stage].short}</span></Link> })}</div></section>}
    <section className="mt-5"><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold text-navy-900">{isAdmin ? 'Priority orders' : 'My work queue'}</h2><p className="text-sm text-slate-500">Open an order for the next clear action.</p></div><Link to="/queue" className="text-sm font-bold text-brand">See queue</Link></div><div className="grid gap-3 xl:grid-cols-2">{queue.slice(0, 4).map((order) => <OrderCard order={order} key={order.id} />)}{queue.length === 0 && <EmptyState />}</div></section>
  </>
}

function Kpi({ label, value, helper, icon, danger = false }: { label: string; value: number; helper: string; icon: ReactNode; danger?: boolean }) { return <div className="surface min-w-0 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-3xl font-extrabold ${danger ? 'text-red-600' : 'text-navy-900'}`}>{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${danger ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-700'}`}>{icon}</span></div><p className="mt-2 truncate text-xs text-slate-500">{helper}</p></div> }

function OrdersPage({ queueOnly = false }: { queueOnly?: boolean }) {
  const { orders, currentUser } = useApp()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('all')
  const relevantStage = currentUser && Object.entries(stageInfo).find(([, info]) => info.role === currentUser.role)?.[0] as StageKey | undefined
  const source = queueOnly && currentUser?.role !== 'admin' ? orders.filter((order) => relevantStage && ['ready', 'in_progress', 'blocked', 'issue'].includes(order.stages[relevantStage].status)) : orders
  const filtered = source.filter((order) => `${order.orderNumber} ${order.customer} ${order.product} ${order.phone}`.toLowerCase().includes(query.toLowerCase()) && (stage === 'all' || order.currentStage === stage))
  return <><PageHeading eyebrow={queueOnly ? 'Focused work' : 'Order register'} title={queueOnly ? 'My work queue' : 'All orders'} description={queueOnly ? 'This list contains only work relevant to your department.' : 'Search by order number, customer, phone, or product. Open any order to see the complete process.'} />
    <section className="surface mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_220px]"><label className="relative"><span className="sr-only">Search orders</span><Search className="absolute left-3.5 top-3.5 size-5 text-slate-400" /><input className="field pl-11" placeholder="Search order, customer, phone…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="sr-only">Filter by current stage</span><select className="field" value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">All production stages</option>{productionStages.map((key) => <option key={key} value={key}>{stageInfo[key].short}</option>)}</select></label></section>
    <div className="grid gap-3 xl:grid-cols-2">{filtered.map((order) => <OrderCard order={order} key={order.id} />)}{filtered.length === 0 && <EmptyState />}</div>
  </>
}

function OrderCard({ order }: { order: Order }) { const state = order.stages[order.currentStage]; return <Link to={`/orders/${order.id}`} className="surface group block p-4 transition hover:border-sky-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-extrabold text-brand">{order.orderNumber}</p><h2 className="mt-1 truncate text-lg font-bold text-navy-900">{order.customer}</h2><p className="truncate text-sm text-slate-600">{order.product} · {order.quantity.toLocaleString('en-IN')} bags</p></div><ChevronRight className="mt-1 size-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand" /></div><div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge status={state.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{stageInfo[order.currentStage].short}</span>{order.priority !== 'normal' && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{order.priority === 'urgent' ? 'Urgent' : 'High priority'}</span>}</div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs"><span><b className="block text-slate-500">Expected delivery</b><span className="font-semibold text-slate-800">{formatDate(order.expectedDelivery)}</span></span><span><b className="block text-slate-500">Order value</b><span className="font-semibold text-slate-800">{formatCurrency(order.amount)}</span></span></div></Link> }
function EmptyState() { return <div className="surface col-span-full p-8 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-500" /><h2 className="mt-3 font-bold text-navy-900">No work needs attention</h2><p className="mt-1 text-sm text-slate-500">Try changing the search or filter.</p></div> }

function OrderDetailPage() {
  const { id } = useParams()
  const { orders, currentUser, updateStage } = useApp()
  const navigate = useNavigate()
  const order = orders.find((item) => item.id === id)
  const [selected, setSelected] = useState<StageKey | null>(null)
  const [quantity, setQuantity] = useState<number | ''>('')
  const [pending, setPending] = useState<{ action: 'start' | 'complete' | 'progress' | 'resolve'; title: string; message: string } | null>(null)
  if (!order || !currentUser) return <Navigate to="/orders" replace />
  const current = order.stages[order.currentStage]
  const selectedState = selected ? order.stages[selected] : null
  const manage = selected ? canManageStage(currentUser.role, selected) : false
  const ask = (action: 'start' | 'complete' | 'progress' | 'resolve') => {
    if (!selected) return
    const label = stageInfo[selected].short
    const messages = {
      start: `Start ${label} for ${order.orderNumber}? The order will appear as “In progress” for all departments.`,
      complete: `Mark ${label} complete for ${order.orderNumber}? This may make the next department’s work ready to start.`,
      progress: `Save ${quantity || 0} of ${order.quantity} completed for ${label}? Everyone viewing this order will see the new quantity.`,
      resolve: `Confirm that the ${label} issue is resolved? The responsible team will be able to continue work.`,
    }
    setPending({ action, title: `${action === 'complete' ? 'Complete' : action === 'resolve' ? 'Resolve' : action === 'progress' ? 'Update' : 'Start'} ${label}?`, message: messages[action] })
  }
  return <><button className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-slate-600 hover:bg-white" onClick={() => navigate(-1)}><ArrowLeft className="size-5" />Back to orders</button>
    <section className="surface overflow-hidden"><div className="bg-navy-900 p-5 text-white md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-orange-300">{order.orderNumber}</p><h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{order.customer}</h1><p className="mt-2 text-sm text-slate-300">{order.product} · {order.quantity.toLocaleString('en-IN')} bags</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-xs font-semibold text-slate-300">Current responsibility</p><p className="mt-1 font-bold">{stageInfo[order.currentStage].label}</p><p className="text-sm text-slate-300">{current.owner}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 md:grid-cols-4"><Summary label="Order value" value={formatCurrency(order.amount)} /><Summary label="Expected delivery" value={formatDate(order.expectedDelivery)} /><Summary label="Priority" value={order.priority.toUpperCase()} /><Summary label="Current status" value={statusLabel(current.status)} /></div></div></section>
    <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_.6fr]"><div className="rounded-2xl border border-sky-200 bg-sky-50 p-5"><p className="eyebrow">What should happen next?</p><h2 className="mt-2 text-lg font-bold text-navy-900">{nextInstruction(order)}</h2><p className="mt-2 text-sm leading-6 text-sky-900">Responsible: <strong>{current.owner}</strong>. Open the highlighted workflow step for actions and full details.</p><button className="primary-button mt-4" onClick={() => setSelected(order.currentStage)}>Open next action <ChevronRight className="size-4" /></button></div><div className="surface p-5"><p className="text-sm font-bold text-slate-500">Overall completion</p><p className="mt-1 text-3xl font-extrabold text-navy-900">{Math.round(productionStages.filter((key) => order.stages[key].status === 'completed').length / productionStages.length * 100)}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${productionStages.filter((key) => order.stages[key].status === 'completed').length / productionStages.length * 100}%` }} /></div><p className="mt-3 text-xs text-slate-500">{productionStages.filter((key) => order.stages[key].status === 'completed').length} of {productionStages.length} main steps complete</p></div></section>
    <div className="mt-4"><WorkflowMap order={order} onSelect={(stage) => { setSelected(stage); setQuantity(order.stages[stage].completedQuantity ?? '') }} /></div>
    <section className="mt-4 grid gap-4 lg:grid-cols-[.75fr_1.25fr]"><div className="surface p-5"><h2 className="text-lg font-bold text-navy-900">Customer and order</h2><dl className="mt-4 space-y-3 text-sm"><Detail label="Contact person" value={order.contactPerson} /><Detail label="Phone" value={order.phone} /><Detail label="Order date" value={formatDate(order.orderDate)} /><Detail label="Product" value={order.product} /><Detail label="Quantity" value={`${order.quantity.toLocaleString('en-IN')} bags`} /></dl></div><div className="surface p-5"><h2 className="text-lg font-bold text-navy-900">Activity history</h2><p className="text-sm text-slate-500">A clear record of who changed what and when.</p><ol className="mt-4 space-y-4">{order.activity.map((item) => <li className="relative border-l-2 border-slate-200 pl-4" key={item.id}><span className="absolute -left-[5px] top-1 size-2 rounded-full bg-sky-500" /><p className="text-sm font-semibold text-slate-800">{item.message}</p><p className="mt-1 text-xs text-slate-500">{item.actor} · {formatDateTime(item.at)}</p></li>)}</ol></div></section>
    {selected && selectedState && <div className="fixed inset-0 z-40 flex justify-end bg-navy-950/50" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null) }}><aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl" aria-label={`${stageInfo[selected].label} details`}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">Workflow step</p><h2 className="mt-1 text-2xl font-bold text-navy-900">{stageInfo[selected].label}</h2></div><button className="grid size-11 place-items-center rounded-xl hover:bg-slate-100" onClick={() => setSelected(null)} aria-label="Close stage details"><X /></button></div><div className="mt-5"><StatusBadge status={selectedState.status} /></div><p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">{stageInfo[selected].help}</p><dl className="mt-5 divide-y divide-slate-100"><Detail label="Responsible person" value={selectedState.owner} /><Detail label="Started" value={formatDateTime(selectedState.startedAt)} /><Detail label="Completed" value={formatDateTime(selectedState.completedAt)} />{selectedState.note && <Detail label="Latest note" value={selectedState.note} />}</dl>
      {selectedState.status === 'in_progress' && ['cutting', 'printing', 'stitching', 'packing'].includes(selected) && <div className="mt-5 rounded-xl border border-slate-200 p-4"><label className="label" htmlFor="completed-qty">Completed quantity</label><div className="flex gap-2"><input id="completed-qty" className="field" type="number" min="0" max={order.quantity} value={quantity} onChange={(event) => setQuantity(event.target.value === '' ? '' : Number(event.target.value))} /><button className="secondary-button shrink-0" disabled={!manage || quantity === ''} onClick={() => ask('progress')}>Update</button></div><p className="mt-2 text-xs text-slate-500">Maximum: {order.quantity.toLocaleString('en-IN')} bags</p></div>}
      <div className="mt-6 space-y-3">{!manage && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>View only:</strong> This step belongs to {selectedState.owner}. Your role cannot change it.</p>}{manage && selectedState.status === 'ready' && <button className="primary-button w-full" onClick={() => ask('start')}>Start this work</button>}{manage && selectedState.status === 'in_progress' && <button className="primary-button w-full" onClick={() => ask('complete')}>Mark work completed</button>}{manage && ['blocked', 'issue'].includes(selectedState.status) && <button className="primary-button w-full" onClick={() => ask('resolve')}>Confirm issue resolved</button>}<button className="secondary-button w-full" onClick={() => setSelected(null)}>Close without changes</button></div></aside></div>}
    <ConfirmDialog open={!!pending} title={pending?.title ?? ''} message={pending?.message ?? ''} confirmLabel={pending?.action === 'complete' ? 'Yes, mark complete' : 'Yes, continue'} onCancel={() => setPending(null)} onConfirm={() => { if (pending && selected) updateStage(order.id, selected, pending.action, typeof quantity === 'number' ? quantity : undefined); setPending(null); setSelected(null) }} />
  </>
}

function Summary({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-bold text-white">{value}</dd></div> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 py-3"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-right text-sm font-semibold text-slate-800">{value}</dd></div> }

function TeamPage() { const { users } = useApp(); return <><PageHeading eyebrow="People and permissions" title="Team responsibilities" description="Every user gets a focused workspace. Sensitive customer and financial information is available only to permitted roles." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{users.map((user) => <article className="surface p-4" key={user.id}><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-navy-900 font-bold text-white">{user.initials}</span><div className="min-w-0"><h2 className="truncate font-bold text-navy-900">{user.name}</h2><p className="truncate text-sm text-slate-500">{roleLabels[user.role]}</p></div></div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><b className="text-slate-700">Primary responsibility</b><p className="mt-1 text-slate-600">{user.department}</p></div></article>)}</div></> }

function MorePage() {
  const { currentUser, logout, resetDemo } = useApp()
  const [resetOpen, setResetOpen] = useState(false)
  return <><PageHeading eyebrow="Settings and help" title="More options" description="Account actions and demo controls are collected here to keep daily work screens simple." /><div className="grid gap-4 lg:grid-cols-2"><section className="surface p-5"><h2 className="font-bold text-navy-900">Signed-in account</h2><p className="mt-1 text-sm text-slate-500">{currentUser?.name} · {currentUser && roleLabels[currentUser.role]}</p><button className="secondary-button mt-5 w-full" onClick={logout}><LogOut className="size-4" />Sign out safely</button></section><section className="surface p-5"><h2 className="font-bold text-navy-900">Demo data</h2><p className="mt-1 text-sm leading-6 text-slate-500">Restore all orders and workflow progress to the original presentation state.</p><button className="secondary-button mt-5 w-full" onClick={() => setResetOpen(true)}><RotateCcw className="size-4" />Reset demo data</button></section><section className="surface p-5"><h2 className="flex items-center gap-2 font-bold text-navy-900"><HelpCircle className="size-5 text-sky-600" />Need help?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open an order and look for the blue “What should happen next?” card. It explains the next responsibility in plain language.</p></section><section className="surface p-5"><h2 className="font-bold text-navy-900">Language</h2><p className="mt-1 text-sm text-slate-500">English is active. Marathi translations are planned for the next implementation slice.</p><button className="secondary-button mt-5 w-full" disabled>मराठी — Coming next</button></section></div><ConfirmDialog open={resetOpen} title="Reset all demo progress?" message="This will remove stage changes made during the demonstration and restore the original sample orders. It cannot be undone." confirmLabel="Yes, reset demo" onCancel={() => setResetOpen(false)} onConfirm={() => { resetDemo(); setResetOpen(false) }} /></>
}

function App() {
  const { currentUser } = useApp()
  if (!currentUser) return <LoginPage />
  return <Shell><Routes><Route path="/" element={<DashboardPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/orders/:id" element={<OrderDetailPage />} /><Route path="/queue" element={<OrdersPage queueOnly />} /><Route path="/team" element={<TeamPage />} /><Route path="/more" element={<MorePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Shell>
}

export default App
