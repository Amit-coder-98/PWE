import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownUp,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  ClipboardList,
  Download,
  Eye,
  Factory,
  HelpCircle,
  ImagePlus,
  LayoutDashboard,
  LayoutGrid,
  List,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  Megaphone,
  PackageCheck,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  ReceiptText,
  Search,
  Scissors,
  ShieldCheck,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { StatusBadge } from "./components/StatusBadge";
import { ToastHost } from "./components/ToastHost";
import { api, ApiError } from "./lib/api";
import {
  canManageStage,
  nextInstruction,
  operatingRole,
  productionStages,
  stageInfo,
} from "./lib/workflow";
import { toast, useApp } from "./state/AppContext";
import type {
  Customer,
  DesignAsset,
  Order,
  Role,
  StageKey,
  User,
} from "./types";

const roleLabels: Record<Role, string> = {
  admin: "Super Admin",
  cutting_master: "Cutting Master",
  designer: "Designer",
  transport_manager: "Transport Manager",
  printing_operator: "Printing Operator",
  manager: "Manager",
  accountant: "Accountant",
  marketing: "Marketing",
  order_manager: "Legacy Order Manager",
  inventory_manager: "Legacy Material Manager",
  cutting_manager: "Legacy Cutting Manager",
  plate_operator: "Legacy Plate Operator",
  stitching_manager: "Legacy Stitching Manager",
  packing_manager: "Legacy Packing Manager",
  dispatch_manager: "Legacy Dispatch Manager",
};
const departmentFor: Record<Role, string> = {
  admin: "Administration",
  cutting_master: "Cutting & Material",
  designer: "Design",
  transport_manager: "Transport & Plate",
  printing_operator: "Printing",
  manager: "Stitching, Packing & D.C.",
  accountant: "Accounts",
  marketing: "Marketing & Delivery",
  order_manager: "Legacy Order & CRM",
  inventory_manager: "Legacy Material & Inventory",
  cutting_manager: "Legacy Cutting",
  plate_operator: "Legacy Plate / Prepress",
  stitching_manager: "Legacy Stitching",
  packing_manager: "Legacy Packing & D.C.",
  dispatch_manager: "Legacy Dispatch & Delivery",
};
const factoryRoles: Role[] = [
  "cutting_master",
  "designer",
  "transport_manager",
  "printing_operator",
  "manager",
  "accountant",
  "marketing",
];
const roleVisuals: Record<Role, { icon: typeof Users; color: string; soft: string }> = {
  admin: { icon: ShieldCheck, color: "text-violet-700", soft: "bg-violet-100" },
  cutting_master: { icon: Scissors, color: "text-orange-700", soft: "bg-orange-100" },
  designer: { icon: Palette, color: "text-fuchsia-700", soft: "bg-fuchsia-100" },
  transport_manager: { icon: Truck, color: "text-cyan-700", soft: "bg-cyan-100" },
  printing_operator: { icon: Printer, color: "text-blue-700", soft: "bg-blue-100" },
  manager: { icon: PackageCheck, color: "text-emerald-700", soft: "bg-emerald-100" },
  accountant: { icon: ReceiptText, color: "text-amber-700", soft: "bg-amber-100" },
  marketing: { icon: Megaphone, color: "text-rose-700", soft: "bg-rose-100" },
  order_manager: { icon: ClipboardList, color: "text-slate-700", soft: "bg-slate-100" },
  inventory_manager: { icon: Factory, color: "text-slate-700", soft: "bg-slate-100" },
  cutting_manager: { icon: Scissors, color: "text-slate-700", soft: "bg-slate-100" },
  plate_operator: { icon: Clipboard, color: "text-slate-700", soft: "bg-slate-100" },
  stitching_manager: { icon: PackageCheck, color: "text-slate-700", soft: "bg-slate-100" },
  packing_manager: { icon: PackageCheck, color: "text-slate-700", soft: "bg-slate-100" },
  dispatch_manager: { icon: Truck, color: "text-slate-700", soft: "bg-slate-100" },
};
const roleResponsibilities: Record<Role, string> = {
  admin: "All orders and team administration",
  cutting_master: "Material availability and cutting",
  designer: "Design creation and customer approval",
  transport_manager: "Plate preparation and dispatch",
  printing_operator: "Printing and quality check",
  manager: "Stitching, packing and delivery challan",
  accountant: "Billing and payment recording",
  marketing: "Customers, new orders and delivery confirmation",
  order_manager: "Legacy order and CRM work",
  inventory_manager: "Legacy material work",
  cutting_manager: "Legacy cutting work",
  plate_operator: "Legacy plate work",
  stitching_manager: "Legacy stitching work",
  packing_manager: "Legacy packing work",
  dispatch_manager: "Legacy dispatch work",
};
const canViewPrices = (role?: Role) =>
  !!role && ["admin", "accountant"].includes(role);
const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
const activeOrderStages = (order: Order) =>
  productionStages.filter((stage) =>
    ["ready", "in_progress", "blocked", "issue"].includes(
      order.stages[stage].status,
    ),
  );
const taskStagesForRole = (role: Role) => {
  const operating = operatingRole(role);
  return productionStages.filter(
    (stage) => stageInfo[stage].role === operating,
  );
};
const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not recorded";
const dateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "Not recorded";

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-10 animate-spin text-brand" />
        <p className="mt-3 font-semibold text-navy-900">
          Opening your workspace…
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Checking your secure session and latest orders.
        </p>
      </div>
    </main>
  );
}
function ServiceScreen({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <main className="flex min-h-screen w-full max-w-full items-center justify-center overflow-x-clip bg-slate-50 p-4">
      <section className="surface w-full min-w-0 max-w-md p-5 text-center sm:p-6">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy-900">
          Service temporarily unavailable
        </h1>
        <p className="mt-2 break-words text-sm leading-6 text-slate-600">{message}</p>
        <button className="primary-button mt-5 w-full" onClick={retry}>
          <RefreshCw className="size-4" />
          Try again
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Your typed information is kept on this page until you retry.
        </p>
      </section>
    </main>
  );
}

function LoginPage() {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError((await login(email, password)) ?? "");
    setBusy(false);
  };
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9efff,transparent_38%),linear-gradient(145deg,#f8fafc,#eef3f9)] p-4 sm:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden p-6 lg:block">
          <Brand />
          <h1 className="mt-12 max-w-xl text-5xl font-extrabold leading-[1.08] tracking-tight text-navy-900">
            Every order. Every department. One clear story.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Simple production guidance for factory teams, with complete control
            and visibility for management.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <Feature icon={<ClipboardList />} text="Focused work queue" />
            <Feature icon={<ShieldCheck />} text="Safe confirmations" />
            <Feature icon={<Factory />} text="Connected workflow" />
          </div>
        </section>
        <section className="surface mx-auto min-w-0 w-full max-w-lg overflow-hidden">
          <div className="bg-navy-900 p-6 text-white">
            <div className="lg:hidden">
              <Brand light />
            </div>
            <p className="eyebrow mt-6 !text-orange-300 lg:mt-0">
              Secure workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-sm text-slate-300">
              Use the account created by your Super Admin.
            </p>
          </div>
          <form className="p-6" onSubmit={submit}>
            <label className="label" htmlFor="email">
              Work email
            </label>
            <input
              className="field"
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label className="label mt-4" htmlFor="password">
              Password
            </label>
            <input
              className="field"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && (
              <p
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
            <button className="primary-button mt-6 w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ChevronRight className="size-5" />
            </button>
            <p className="mt-4 text-center text-xs text-slate-500">
              Need access? Contact your Super Admin.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="inline-flex items-center gap-3">
      <span className="grid size-12 place-items-center rounded-xl bg-brand font-black text-white">
        PWE
      </span>
      <span>
        <strong className={`block ${light ? "text-white" : "text-navy-900"}`}>
          Prabodhan WE Bag
        </strong>
        <small className={light ? "text-slate-300" : "text-slate-500"}>
          Production Operations
        </small>
      </span>
    </div>
  );
}
function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-white bg-white/75 p-3 text-sm font-semibold text-navy-800 shadow-sm">
      {icon}
      <span className="mt-2 block">{text}</span>
    </div>
  );
}

function PasswordChangePage() {
  const { logout } = useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== confirm) return setError("New passwords do not match.");
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast("Password changed. Sign in with your new password.");
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form className="surface w-full max-w-md p-6" onSubmit={submit}>
        <span className="grid size-12 place-items-center rounded-xl bg-sky-50 text-sky-700">
          <LockKeyhole />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-navy-900">
          Create your private password
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your temporary password must be changed before opening production
          data.
        </p>
        <label className="label mt-5">Temporary password</label>
        <input
          className="field"
          type="password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
        />
        <label className="label mt-4">New password</label>
        <input
          className="field"
          type="password"
          minLength={10}
          value={next}
          onChange={(event) => setNext(event.target.value)}
          required
        />
        <label className="label mt-4">Confirm new password</label>
        <input
          className="field"
          type="password"
          minLength={10}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
        {error && (
          <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>
        )}
        <button className="primary-button mt-6 w-full" disabled={busy}>
          {busy ? "Saving…" : "Change password and continue"}
        </button>
      </form>
    </main>
  );
}

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Building2 },
  { to: "/queue", label: "My Work", icon: Factory },
  { to: "/team", label: "Team", icon: Users },
  { to: "/more", label: "More", icon: Menu },
];
function Shell({ children }: { children: ReactNode }) {
  const { currentUser, orders, logout } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  if (!currentUser) return null;
  const isSimpleWorker = !["admin", "marketing"].includes(currentUser.role);
  const canViewCustomers = [
    "admin",
    "accountant",
    "transport_manager",
    "marketing",
  ].includes(currentUser.role);
  const visibleNav = isSimpleWorker
    ? nav.filter((item) => ["/queue", "/orders", "/more"].includes(item.to))
    : nav.filter(
        (item) =>
          (item.to !== "/team" || currentUser.role === "admin") &&
          (item.to !== "/customers" || canViewCustomers),
      );
  const mobileNav = visibleNav.filter((item) => item.to !== "/more");
  const issues = orders.filter((order) =>
    Object.values(order.stages).some((state) =>
      ["blocked", "issue"].includes(state.status),
    ),
  ).length;
  return (
    <div className="app-shell min-h-screen w-full min-w-0 bg-[#f4f7fb] pb-24 md:pb-0">
      <ToastHost />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col border-r border-white/10 bg-navy-900 px-3 py-4 text-white md:flex">
        <Link to="/" className="flex min-h-14 items-center rounded-xl px-1 focus-visible:outline-white">
          <Brand light />
        </Link>
        <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Primary navigation">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">Workspace</p>
          {visibleNav
            .filter((item) => item.to !== "/more")
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-semibold transition ${isActive ? "border-white/15 bg-white text-navy-900 shadow-sm" : "border-transparent text-slate-300 hover:bg-white/10 hover:text-white"}`
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.07] p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-sky-500 font-bold">
              {currentUser.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{currentUser.name}</p>
              <p className="truncate text-xs text-slate-400">
                {roleLabels[operatingRole(currentUser.role)]}
              </p>
            </div>
          </div>
          <button
            className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => setLogoutConfirm(true)}
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>
      <div className="min-w-0 w-full pt-16 md:pl-68 md:pt-0">
        <header className="fixed inset-x-0 top-0 z-20 flex min-h-16 items-center border-b border-slate-200 bg-white/95 px-4 shadow-[0_1px_0_rgba(15,23,42,.02)] backdrop-blur md:sticky md:px-7">
          <button
            className="grid size-11 place-items-center rounded-xl border border-slate-200 md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="hidden min-w-0 md:block">
            <p className="text-xs font-semibold tracking-wide text-slate-500">
              {currentUser.department}
            </p>
            <p className="font-bold text-navy-900">
              {`Good day, ${currentUser.name.split(" ")[0]}`}
            </p>
          </div>
          <Link
            to="/orders"
            className="relative ml-auto grid size-11 place-items-center rounded-xl border border-slate-200 text-navy-900 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label={`${issues} alerts`}
          >
            <Bell className="size-5" />
            {issues > 0 && (
              <span className="absolute right-1 top-1 size-2.5 rounded-full bg-red-500" />
            )}
          </Link>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-[1440px] p-4 md:p-7" id="main-content">
          {children}
        </main>
      </div>
      <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${isSimpleWorker ? "grid-cols-3" : "grid-cols-5"} border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(15,23,42,.08)] md:hidden`} aria-label="Mobile navigation">
        {mobileNav.slice(0, isSimpleWorker ? 2 : 4).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-bold transition ${isActive ? "border-brand bg-orange-50/50 text-brand" : "border-transparent text-slate-500"}`
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            `flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-bold transition ${isActive ? "border-brand bg-orange-50/50 text-brand" : "border-transparent text-slate-500"}`
          }
        >
          <Menu className="size-5" />
          More
        </NavLink>
      </nav>
      {drawer && (
        <div
          className="fixed inset-0 z-50 bg-navy-950/50 md:hidden"
          onClick={() => setDrawer(false)}
        >
          <aside
            className="flex h-full w-[86%] max-w-xs flex-col bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button
                className="grid size-11 place-items-center"
                onClick={() => setDrawer(false)}
              >
                <X />
              </button>
            </div>
            <nav className="mt-6 flex-1 space-y-2 overflow-y-auto" aria-label="Mobile menu">
              {visibleNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDrawer(false)}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center gap-3 rounded-xl border px-3 font-semibold transition ${isActive ? "border-sky-200 bg-sky-50 text-navy-900" : "border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100"}`
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <button
              className="secondary-button mt-6 w-full text-red-700"
              onClick={() => {
                setDrawer(false);
                setLogoutConfirm(true);
              }}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={logoutConfirm}
        title="Log out now?"
        message="You will need to sign in again before you can view or update factory information."
        confirmLabel="Yes, log out"
        onCancel={() => setLogoutConfirm(false)}
        onConfirm={() => void logout()}
      />
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:items-end">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-1">{title}</h1>
        <p className="page-copy mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </header>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="surface col-span-full p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sky-50 text-sky-700">
        <ClipboardList />
      </span>
      <h2 className="mt-3 font-bold text-navy-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
        {text}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}

function DashboardPage() {
  const { currentUser, orders, customers } = useApp();
  if (!currentUser) return null;
  const canManageOrders = ["admin", "marketing"].includes(currentUser.role);
  if (!canManageOrders)
    return <WorkerHome />;
  const ordersInQueue = orders.filter(
    (order) => order.status === "active" && activeOrderStages(order).length > 0,
  );
  const completedOrders = orders.filter((order) => order.status === "completed");
  const liveDepartments = productionStages.filter((stage) =>
    orders.some((order) => activeOrderStages(order).includes(stage)),
  );
  return (
    <>
      <Heading
        eyebrow="Today’s work"
        title={
          currentUser.role === "admin"
            ? "Production at a glance"
            : "Orders and customer activity"
        }
        description="Urgent work appears first. Open an order to see exactly what happened and what should happen next."
        action={
          canManageOrders ? (
            <Link className="primary-button" to="/orders/new">
              <Plus className="size-4" />
              Create order
            </Link>
          ) : undefined
        }
      />
      <section aria-label="Order overview" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total customers" value={customers.length} to="/customers" />
        <Kpi label="Total orders" value={orders.length} to="/orders" />
        <Kpi label="Completed orders" value={completedOrders.length} to="/orders?status=completed" />
        <Kpi label="Orders in queue" value={ordersInQueue.length} to="/orders?status=active" />
      </section>
      {currentUser.role === "admin" && (
        <section className="surface mt-5 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-navy-900">Live work by department</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">Open a department to see the orders waiting there.</p>
            </div>
            <Link className="shrink-0 text-sm font-bold text-brand hover:text-brand-dark" to="/orders">View all orders</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {liveDepartments.map((stage) => {
              const count = orders.filter((order) => activeOrderStages(order).includes(stage)).length;
              const visual = roleVisuals[stageInfo[stage].role];
              const DepartmentIcon = visual.icon;
              return (
                <Link key={stage} to={`/orders?stage=${stage}`} className="group rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-sky-300 hover:bg-sky-50 focus:bg-sky-50">
                  <div className="flex items-center gap-2">
                    <span className={`grid size-8 place-items-center rounded-lg ${visual.soft} ${visual.color}`}>
                      <DepartmentIcon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-bold text-navy-900">{stageInfo[stage].short}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-xs leading-4 text-slate-500">{roleLabels[stageInfo[stage].role]}</p>
                    <p className="text-xl font-extrabold tabular-nums text-brand">{count}</p>
                  </div>
                </Link>
              );
            })}
            {!liveDepartments.length && <p className="col-span-full rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active orders yet.</p>}
          </div>
        </section>
      )}
      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy-900">
              Orders currently in queue
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Only real records from Atlas appear here.
            </p>
          </div>
          <Link className="shrink-0 text-sm font-bold text-brand hover:text-brand-dark" to="/orders?status=active">
            View all orders
          </Link>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {ordersInQueue.slice(0, 6).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {ordersInQueue.length === 0 && (
            <Empty
              title={orders.length ? "No orders are in queue" : "No orders yet"}
              text={
                orders.length
                  ? "All current orders have been completed or closed."
                  : "Create the first customer and order to begin practical testing."
              }
              action={
                !orders.length &&
                currentUser.role === "admin" ? (
                  <Link className="primary-button" to="/customers">
                    <Plus className="size-4" />
                    Create first customer
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      </section>
    </>
  );
}

function WorkerHome() {
  const { currentUser, orders } = useApp();
  if (!currentUser) return null;
  const myStages = taskStagesForRole(currentUser.role);
  const tasks = orders.filter((order) =>
    myStages.some((stage) => ["ready", "in_progress", "blocked", "issue"].includes(order.stages[stage].status)),
  );
  const firstTask = tasks[0];
  const firstTaskStage = firstTask
    ? myStages.find((stage) => activeOrderStages(firstTask).includes(stage))
    : undefined;
  const materialShortages = currentUser.role === "marketing"
    ? orders.filter((order) => ["blocked", "issue"].includes(order.stages.material.status))
    : [];
  return (
    <>
      <Heading
        eyebrow="My work today"
        title={`Hello, ${currentUser.name.split(" ")[0]}`}
        description="Open the first task, complete your part, then the next team is informed automatically."
      />
      {materialShortages.length > 0 && (
        <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-950">Material availability needs attention</p>
          <p className="mt-1 text-sm text-amber-900">{materialShortages.length} order{materialShortages.length === 1 ? " has" : "s have"} material marked unavailable. Please coordinate with Admin.</p>
          <Link className="secondary-button mt-3 !border-amber-300 !bg-white !text-amber-900" to={`/orders/${materialShortages[0].id}`}>Open affected order</Link>
        </section>
      )}
      {firstTask ? (
        <section className="rounded-2xl bg-navy-900 p-5 text-white shadow-lg">
          <p className="text-sm font-semibold text-sky-200">Your next task</p>
          <h2 className="mt-2 text-2xl font-extrabold">{stageInfo[firstTaskStage!].label}</h2>
          <p className="mt-3 text-base text-slate-200">{firstTask.orderNumber} · {firstTask.customer}</p>
          <p className="mt-1 text-sm text-slate-300">{firstTask.product} · {firstTask.quantity.toLocaleString("en-IN")} bags</p>
          <Link className="primary-button mt-5" to={`/orders/${firstTask.id}?stage=${firstTaskStage}`}>
            Open my task
            <ChevronRight className="size-4" />
          </Link>
        </section>
      ) : (
        <Empty
          title="No work is waiting for you"
          text="When another team completes the previous step, your task will appear here automatically."
        />
      )}
      {tasks.length > 1 && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-900">Other tasks</h2>
            <Link className="text-sm font-bold text-brand" to="/queue">View all</Link>
          </div>
          <div className="grid gap-3">
            {tasks.slice(1, 4).map((order) => {
              const taskStage = myStages.find((stage) => activeOrderStages(order).includes(stage));
              return (
              <Link key={order.id} to={`/orders/${order.id}?stage=${taskStage}`} className="surface flex min-h-16 items-center justify-between p-4">
                <span><strong className="block">{order.orderNumber}</strong><span className="text-sm text-slate-500">{order.customer}</span></span>
                <ChevronRight className="size-5 text-slate-400" />
              </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
function Kpi({
  label,
  value,
  danger = false,
  to,
}: {
  label: string;
  value: number;
  danger?: boolean;
  to?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-bold uppercase leading-4 tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-extrabold ${danger ? "text-red-600" : "text-navy-900"}`}
      >
        {value}
      </p>
      {to && <p className="mt-2 text-xs font-semibold text-brand">Open list</p>}
    </>
  );
  if (to)
    return (
      <Link
        className="surface block p-4 transition hover:border-sky-300 hover:bg-sky-50 focus:bg-sky-50"
        to={to}
        aria-label={`Open ${label.toLowerCase()} list`}
      >
        <div className="flex min-h-[92px] flex-col justify-between">{content}</div>
      </Link>
    );
  return (
    <div className="surface p-4">
      <div className="flex min-h-[92px] flex-col justify-between">{content}</div>
    </div>
  );
}

function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="search-control">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search aria-hidden="true" />
      <input
        id={id}
        className="field field-with-leading-icon field-with-trailing-action"
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}

function BookingDateControls({
  dateFrom,
  dateTo,
  bookingMonth,
  setDateFrom,
  setDateTo,
  setBookingMonth,
  showLastMonths,
}: {
  dateFrom: string;
  dateTo: string;
  bookingMonth: string;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setBookingMonth: (value: string) => void;
  showLastMonths: (months: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_150px_170px_auto] lg:items-end lg:justify-start">
      <label className="block min-w-0 text-sm font-semibold text-slate-700">From
        <input className="field mt-1 min-h-11 w-full" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setBookingMonth(""); }} />
      </label>
      <label className="block min-w-0 text-sm font-semibold text-slate-700">To
        <input className="field mt-1 min-h-11 w-full" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setBookingMonth(""); }} />
      </label>
      <label className="block min-w-0 text-sm font-semibold text-slate-700">Choose a month
        <input className="field mt-1 min-h-11 w-full" type="month" value={bookingMonth} onChange={(event) => { setBookingMonth(event.target.value); setDateFrom(""); setDateTo(""); }} />
      </label>
      <button type="button" className="secondary-button min-h-11" onClick={() => showLastMonths(3)}>Last 3 months</button>
    </div>
  );
}

function OrdersPage({ queue = false }: { queue?: boolean }) {
  const { orders, currentUser } = useApp();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageKey | "all">(() => {
    const value = searchParams.get("stage");
    return value && value in stageInfo ? (value as StageKey) : "all";
  });
  const [orderStatus, setOrderStatus] = useState<"all" | "active" | "completed">(() => {
    const value = searchParams.get("status");
    return value === "active" || value === "completed" ? value : "all";
  });
  const [sortBy, setSortBy] = useState<"delivery_date" | "delivery_month" | "customer_az" | "order_number">("delivery_date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bookingMonth, setBookingMonth] = useState("");
  const workerStages = currentUser ? taskStagesForRole(currentUser.role) : [];
  const [workerStage, setWorkerStage] = useState<StageKey | "all">(() => {
    const value = searchParams.get("stage") as StageKey | null;
    return value && currentUser && taskStagesForRole(currentUser.role).includes(value)
      ? value
      : workerStages.length > 1
        ? workerStages[0]
        : "all";
  });
  const canViewOrderRegister = ["admin", "marketing"].includes(
    currentUser?.role ?? "",
  );
  const canBookOrders = ["admin", "marketing"].includes(
    currentUser?.role ?? "",
  );
  const calendarDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const showLastMonths = (months: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setMonth(from.getMonth() - months);
    setDateFrom(calendarDate(from));
    setDateTo(calendarDate(today));
    setBookingMonth("");
  };
  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setBookingMonth("");
  };
  const dateFilterActive = Boolean(dateFrom || dateTo || bookingMonth);
  const source = !canViewOrderRegister
    ? orders.filter((order) => workerStages.some((task) => activeOrderStages(order).includes(task)))
    : orders;
  const result = source
    .filter(
      (order) =>
      `${order.orderNumber} ${order.customer} ${order.product} ${order.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (orderStatus === "all" || order.status === orderStatus) &&
      (!canViewOrderRegister || (() => {
        const bookedOn = order.orderDate.slice(0, 10);
        return (!dateFrom || bookedOn >= dateFrom) &&
          (!dateTo || bookedOn <= dateTo) &&
          (!bookingMonth || bookedOn.startsWith(bookingMonth));
      })()) &&
      (canViewOrderRegister
        ? stage === "all" || activeOrderStages(order).includes(stage)
        : workerStage === "all" || activeOrderStages(order).includes(workerStage)),
    )
    .sort((first, second) => {
      if (sortBy === "customer_az")
        return first.customer.localeCompare(second.customer, "en", { sensitivity: "base" });
      const firstDate = new Date(first.expectedDelivery).getTime();
      const secondDate = new Date(second.expectedDelivery).getTime();
      if (sortBy === "delivery_month") {
        const firstMonth = new Date(first.expectedDelivery).getMonth();
        const secondMonth = new Date(second.expectedDelivery).getMonth();
        return firstMonth - secondMonth || firstDate - secondDate;
      }
      if (sortBy === "order_number")
        return second.orderNumber.localeCompare(first.orderNumber, undefined, { numeric: true });
      return firstDate - secondDate;
    });
  return (
    <>
      <Heading
        eyebrow={canViewOrderRegister ? "Order register" : "My work"}
        title={canViewOrderRegister ? "Orders" : workerStage === "all" ? `${roleLabels[operatingRole(currentUser!.role)]} work` : `${stageInfo[workerStage].short} list`}
        description={
          canViewOrderRegister
            ? "Search by customer name and see which department is working on every order."
            : workerStage === "all" ? "Only your pending tasks are shown here." : `Only orders pending for ${stageInfo[workerStage].short} are shown here.`
        }
        action={
          !queue &&
          canBookOrders ? (
            <Link className="primary-button" to="/orders/new">
              <Plus className="size-4" />
              New order
            </Link>
          ) : undefined
        }
      />
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,.04)] sm:px-4">
        <SearchField
          id="order-search"
          label="Search orders"
          placeholder={canViewOrderRegister ? "Search order number, customer name, product or phone…" : "Search your order by customer or order number…"}
          value={search}
          onChange={setSearch}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-700">Filter and sort orders</p>
          <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700 sm:w-auto sm:min-w-72">
            <ArrowDownUp className="size-4 text-slate-500" aria-hidden="true" />
            <span className="sr-only">Sort orders</span>
            <select
              className="min-h-9 min-w-0 flex-1 bg-transparent pr-7 text-sm font-semibold text-slate-700 outline-none sm:max-w-56"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              aria-label="Sort orders"
            >
              <option value="delivery_date">Delivery date: earliest first</option>
              <option value="delivery_month">Delivery month: January to December</option>
              <option value="customer_az">Customer name: A to Z</option>
              <option value="order_number">Order number: highest first</option>
            </select>
          </label>
        </div>
        {canViewOrderRegister ? <>
          <details className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 md:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 font-bold text-navy-900">
              <span>Filter by booking date</span>
              <span className="text-xs font-semibold text-slate-500">{dateFilterActive ? "Filter applied" : "Optional"}</span>
            </summary>
            <div className="border-t border-slate-200 p-3">
              <p className="mb-3 text-xs leading-5 text-slate-600">Choose a month, a custom range, or the last 3 months.</p>
              <BookingDateControls dateFrom={dateFrom} dateTo={dateTo} bookingMonth={bookingMonth} setDateFrom={setDateFrom} setDateTo={setDateTo} setBookingMonth={setBookingMonth} showLastMonths={showLastMonths} />
              {dateFilterActive && <button type="button" className="mt-3 text-sm font-bold text-brand hover:underline" onClick={clearDateFilter}>Clear dates</button>}
            </div>
          </details>
          <div className="mt-3 hidden border-t border-slate-100 pt-3 md:block">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-navy-900">Order booking date</p>
                <p className="mt-0.5 text-xs text-slate-500">Choose a month or a custom date range to view older orders.</p>
              </div>
              {dateFilterActive && <button type="button" className="text-sm font-bold text-brand hover:underline" onClick={clearDateFilter}>Clear dates</button>}
            </div>
            <div className="mt-2"><BookingDateControls dateFrom={dateFrom} dateTo={dateTo} bookingMonth={bookingMonth} setDateFrom={setDateFrom} setDateTo={setDateTo} setBookingMonth={setBookingMonth} showLastMonths={showLastMonths} /></div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Order status</p>
            <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Filter orders by status">
            {([
              ["all", "All orders"],
              ["active", "In queue"],
              ["completed", "Completed"],
            ] as const).map(([value, label]) => (
              <button className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold transition ${orderStatus === value ? "bg-navy-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-navy-900"}`} key={value} onClick={() => { setOrderStatus(value); if (value !== "all") setStage("all"); }}>
                {label} ({value === "all" ? source.length : source.filter((order) => order.status === value).length})
              </button>
            ))}
          </div>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current department</p>
              <p className="text-xs text-slate-500">Scroll for more</p>
            </div>
            <div className="filter-scroll flex max-w-full gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5" aria-label="Filter orders by current department">
            <button className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold transition ${stage === "all" ? "bg-navy-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-navy-900"}`} onClick={() => setStage("all")}>
              All departments
            </button>
            {productionStages.map((key) => {
              const count = source.filter((order) => activeOrderStages(order).includes(key)).length;
              return (
                <button
                  className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold transition ${stage === key ? "bg-navy-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-navy-900"}`}
                  key={key}
                  onClick={() => { setStage(key); setOrderStatus("active"); }}
                >
                  {stageInfo[key].short} ({count})
                </button>
              );
            })}
          </div>
          </div>
        </> : <>
          {workerStages.length > 1 && (
            <div className="filter-scroll mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Choose your task list">
              {workerStages.map((task) => {
                const count = source.filter((order) => activeOrderStages(order).includes(task)).length;
                return <button className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold ${workerStage === task ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700"}`} key={task} onClick={() => setWorkerStage(task)}>{stageInfo[task].short} ({count})</button>;
              })}
            </div>
          )}
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">Showing {result.length} pending order{result.length === 1 ? "" : "s"} for {workerStage === "all" ? roleLabels[operatingRole(currentUser!.role)] : stageInfo[workerStage].label}.</p>
        </>}
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.04)]">
        <div className="hidden grid-cols-[minmax(130px,.8fr)_minmax(220px,1.8fr)_minmax(180px,1.2fr)_minmax(110px,.7fr)_72px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
          <span>Order</span><span>Customer & bag</span><span>Current work</span><span>Due date</span><span>Action</span>
        </div>
        {result.map((order) => (
          <OrderListRow key={order.id} order={order} visibleStages={canViewOrderRegister ? undefined : workerStage === "all" ? workerStages : [workerStage]} />
        ))}
        {result.length === 0 && (
          <Empty
            title="No matching orders"
            text={
              orders.length
                ? "Try changing the search or stage filter."
                : "No orders exist yet. Create a customer, then create the first order."
            }
          />
        )}
      </section>
    </>
  );
}

function OrderListRow({ order, visibleStages }: { order: Order; visibleStages?: StageKey[] }) {
  const liveStages = activeOrderStages(order);
  const displayedStages = visibleStages ? liveStages.filter((stage) => visibleStages.includes(stage)) : liveStages;
  const preferredStage = displayedStages[0];
  const activeLabel = displayedStages.length === 1
    ? order.stages[displayedStages[0]].status === "blocked" || order.stages[displayedStages[0]].status === "issue"
      ? `${stageInfo[displayedStages[0]].short} needs attention`
      : `${stageInfo[displayedStages[0]].short} pending`
    : `${displayedStages.length} tasks pending`;
  return (
    <Link
      to={`/orders/${order.id}${preferredStage ? `?stage=${preferredStage}` : ""}`}
      className="group block border-b border-slate-200 px-4 py-4 transition hover:bg-sky-50/60 focus:bg-sky-50 xl:grid xl:min-h-22 xl:grid-cols-[minmax(130px,.8fr)_minmax(220px,1.8fr)_minmax(180px,1.2fr)_minmax(110px,.7fr)_72px] xl:items-center xl:gap-4 xl:px-5 xl:py-3.5"
    >
      <div className="xl:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 font-extrabold text-brand">{order.orderNumber}</p>
            {displayedStages.length ? (
              <div className="flex min-w-0 items-center gap-1">
                {displayedStages.slice(0, 2).map((stage) => (
                  <span
                    className={`truncate rounded-md border px-2 py-0.5 text-xs font-bold ${order.stages[stage].status === "in_progress" ? "border-orange-200 bg-orange-50 text-orange-800" : order.stages[stage].status === "blocked" || order.stages[stage].status === "issue" ? "border-red-200 bg-red-50 text-red-700" : "border-sky-200 bg-sky-50 text-sky-800"}`}
                    key={stage}
                  >
                    {stageInfo[stage].short}
                  </span>
                ))}
                {displayedStages.length > 2 && (
                  <span className="shrink-0 text-xs font-bold text-slate-500">
                    +{displayedStages.length - 2}
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due</p>
            <p className="text-xs font-semibold text-slate-700">{date(order.expectedDelivery)}</p>
          </div>
        </div>
        <div className="mt-3 min-w-0">
          <div className="min-w-0">
            <p className="truncate font-bold text-navy-900">{order.customer}</p>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {order.product} · {order.quantity.toLocaleString("en-IN")} bags
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Current work</p>
          <p className="mt-1 text-sm font-bold text-navy-900">{activeLabel}</p>
        </div>
        {order.priority !== "normal" && (
          <div className="mt-2">
            <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold capitalize text-orange-700">
              {order.priority} priority
            </span>
          </div>
        )}
        <div className="mt-3 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <span className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-bold text-brand">Open <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </div>
      </div>
      <div className="hidden xl:contents">
        <div>
          <p className="font-extrabold text-brand">{order.orderNumber}</p>
          {order.priority !== "normal" && (
            <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold capitalize text-orange-700">
              {order.priority} priority
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-navy-900">{order.customer}</p>
          <p className="mt-1 truncate text-sm text-slate-600">
            {order.product} · {order.quantity.toLocaleString("en-IN")} bags
          </p>
        </div>
        <div>
          {displayedStages.length ? (
            <>
              <p className="text-sm font-bold text-navy-900">{activeLabel}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayedStages.map((stage) => (
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-bold ${order.stages[stage].status === "in_progress" ? "border-orange-200 bg-orange-50 text-orange-800" : order.stages[stage].status === "blocked" || order.stages[stage].status === "issue" ? "border-red-200 bg-red-50 text-red-700" : "border-sky-200 bg-sky-50 text-sky-800"}`}
                    key={stage}
                  >
                    {stageInfo[stage].short}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No work is waiting</p>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{date(order.expectedDelivery)}</p>
        </div>
        <span className="flex items-center gap-1 text-sm font-bold text-brand">
          Open <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
function OrderCard({ order }: { order: Order }) {
  const { currentUser } = useApp();
  const state = order.stages[order.currentStage];
  return (
    <Link
      to={`/orders/${order.id}`}
      className="surface group block p-4 transition hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold text-brand">{order.orderNumber}</p>
          <h2 className="mt-1 truncate text-lg font-bold text-navy-900">
            {order.customer}
          </h2>
          <p className="truncate text-sm text-slate-600">
            {order.product} · {order.quantity.toLocaleString("en-IN")} bags
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-slate-400" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={state.status} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">
          {stageInfo[order.currentStage].short}
        </span>
        {order.priority !== "normal" && (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
            {order.priority}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
        <span>
          <b className="block text-slate-500">Delivery</b>
          {date(order.expectedDelivery)}
        </span>
        {canViewPrices(currentUser?.role) ? (
          <span>
            <b className="block text-slate-500">Value</b>
            {money(order.amount)}
          </span>
        ) : (
          <span>
            <b className="block text-slate-500">Information</b>
            Price hidden for your role
          </span>
        )}
      </div>
    </Link>
  );
}

function CustomersPage() {
  const { customers, currentUser, createCustomer, reload } = useApp();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customerView, setCustomerView] = useState<"list" | "cards">("list");
  const [customerStatus, setCustomerStatus] = useState<"all" | "active" | "inactive">(() => {
    const value = searchParams.get("status");
    return value === "active" || value === "inactive" ? value : "all";
  });
  const permitted = ["admin", "marketing"].includes(currentUser?.role ?? "");
  const filtered = customers.filter((c) =>
    `${c.companyName} ${c.contactPerson} ${c.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    (customerStatus === "all" ||
      (customerStatus === "active" ? c.active : !c.active)),
  );
  const activeCustomers = customers.filter((customer) => customer.active).length;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const data = {
        companyName: String(form.get("companyName")),
        contactPerson: String(form.get("contactPerson")),
        phone: String(form.get("phone")),
        alternativePhone: String(form.get("alternativePhone")) || undefined,
        gstNumber: String(form.get("gstNumber")).trim().toUpperCase() || undefined,
        email: String(form.get("email")) || undefined,
        address: String(form.get("address")),
      };
      if (editing) {
        await api.updateCustomer(editing.id, data);
        await reload();
        toast("Customer details updated.");
      } else {
        await createCustomer(data);
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save customer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="Customer relationships"
        title="Customers"
        description="Store customer contact details once, then use them while creating orders."
        action={
          permitted ? (
            <button
              className="primary-button"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add customer
            </button>
          ) : undefined
        }
      />
      <div className="mb-4">
        <SearchField
          id="customer-list-search"
          label="Search customers"
          placeholder="Search customer name, contact person, or phone…"
          value={search}
          onChange={setSearch}
        />
        <div className="filter-scroll mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Filter customers by status">
          {([
            ["all", "All customers", customers.length],
            ["active", "Active customers", activeCustomers],
            ["inactive", "Inactive customers", customers.length - activeCustomers],
          ] as const).map(([status, label, count]) => (
            <button
              key={status}
              className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold ${customerStatus === status ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => setCustomerStatus(status)}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-600">
            Showing {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm" role="group" aria-label="Choose customer view">
            <button
              type="button"
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${customerView === "list" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setCustomerView("list")}
              aria-pressed={customerView === "list"}
            >
              <List className="size-4" aria-hidden="true" />
              List
            </button>
            <button
              type="button"
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${customerView === "cards" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              onClick={() => setCustomerView("cards")}
              aria-pressed={customerView === "cards"}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
              Cards
            </button>
          </div>
        </div>
      </div>
      {customerView === "list" ? (
        <section className="surface overflow-hidden">
          <div className={`hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${permitted ? "md:grid md:grid-cols-[minmax(220px,1.5fr)_minmax(170px,1fr)_150px_135px_130px] md:gap-4" : "md:grid md:grid-cols-[minmax(240px,1.6fr)_minmax(180px,1fr)_160px_145px] md:gap-4"}`}>
            <span>Customer</span><span>Contact person</span><span>Phone</span><span>Status</span>{permitted && <span>Action</span>}
          </div>
          {filtered.map((customer) => (
            <article key={customer.id} className={`border-b border-slate-100 p-4 last:border-b-0 ${permitted ? "md:grid md:grid-cols-[minmax(220px,1.5fr)_minmax(170px,1fr)_150px_135px_130px] md:items-center md:gap-4 md:px-5" : "md:grid md:grid-cols-[minmax(240px,1.6fr)_minmax(180px,1fr)_160px_145px] md:items-center md:gap-4 md:px-5"}`}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sm font-bold text-sky-700">{customer.companyName.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0"><h2 className="truncate font-bold text-navy-900">{permitted ? <Link className="hover:text-brand hover:underline" to={`/customers/${customer.id}`}>{customer.companyName}</Link> : customer.companyName}</h2><p className="mt-0.5 truncate text-sm text-slate-500 md:hidden">{customer.contactPerson} · {customer.phone}</p></div>
              </div>
              <p className="mt-3 text-sm text-slate-700 md:mt-0">{customer.contactPerson}</p>
              <p className="mt-1 text-sm text-slate-700 md:mt-0">{customer.phone}</p>
              <span className={`mt-3 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold md:mt-0 ${customer.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{customer.active ? "Active" : "Inactive"}</span>
              {permitted && <div className="mt-3 flex gap-2 md:mt-0"><Link className="secondary-button flex-1 !min-h-10 !rounded-lg !px-3 !py-2 text-center text-sm" to={`/customers/${customer.id}`}>Profile</Link><button className="secondary-button flex-1 !min-h-10 !rounded-lg !px-3 !py-2 text-sm" onClick={() => { setEditing(customer); setOpen(true); }}>Edit</button></div>}
            </article>
          ))}
          {filtered.length === 0 && <Empty title="No customers yet" text="Add the first real customer before creating an order." />}
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <article className="surface p-4" key={customer.id}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 font-bold text-sky-700">
                  {customer.companyName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0"><h2 className="truncate font-bold text-navy-900">{permitted ? <Link className="hover:text-brand hover:underline" to={`/customers/${customer.id}`}>{customer.companyName}</Link> : customer.companyName}</h2><p className="text-sm text-slate-500">{customer.contactPerson}</p></div>
              </div>
              <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${customer.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{customer.active ? "Active customer" : "Inactive customer"}</div>
              <dl className="mt-4 space-y-2 text-sm"><p><b className="text-slate-500">Phone:</b> {customer.phone}</p><p className="truncate"><b className="text-slate-500">Email:</b> {customer.email || "Not provided"}</p><p className="line-clamp-2"><b className="text-slate-500">Address:</b> {customer.address}</p></dl>
              {permitted && <div className="mt-4 grid grid-cols-2 gap-2"><Link className="secondary-button text-center" to={`/customers/${customer.id}`}>View profile</Link><button className="secondary-button" onClick={() => { setEditing(customer); setOpen(true); }}>Edit details</button></div>}
            </article>
          ))}
          {filtered.length === 0 && <Empty title="No customers yet" text="Add the first real customer before creating an order." />}
        </div>
      )}
      {open && (
        <Modal
          title={editing ? "Edit customer" : "Add customer"}
          close={() => {
            setOpen(false);
            setEditing(null);
          }}
        >
          <form onSubmit={submit} key={editing?.id ?? "new-customer"}>
            <Field
              name="companyName"
              label="Company name"
              defaultValue={editing?.companyName}
              required
            />
            <Field
              name="contactPerson"
              label="Contact person"
              defaultValue={editing?.contactPerson}
              required
            />
            <Field
              name="phone"
              label="Primary phone number"
              defaultValue={editing?.phone}
              required
            />
            <Field name="alternativePhone" label="Alternative phone number (optional)" defaultValue={editing?.alternativePhone} />
            <Field name="gstNumber" label="GST number (optional)" defaultValue={editing?.gstNumber} />
            <Field
              name="email"
              label="Email (optional)"
              type="email"
              defaultValue={editing?.email}
            />
            <label className="label mt-4">Address</label>
            <textarea
              className="field min-h-24 py-3"
              name="address"
              defaultValue={editing?.address}
              required
            />
            {error && <ErrorText>{error}</ErrorText>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Save customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function downloadCustomerOrderSheet(customer: Customer, orders: Order[]) {
  const safeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Prabodhan WE Bag - Customer order history"],
    ["Customer", customer.companyName],
    ["Contact person", customer.contactPerson],
    ["Primary phone", customer.phone],
    ["Alternative phone", customer.alternativePhone ?? ""],
    ["GST number", customer.gstNumber ?? ""],
    ["Address", customer.address],
    [],
    ["Order number", "Order date", "Delivery date", "Bag type", "Size", "Printing colour", "Quantity", "Rate per bag", "Total amount", "Advance paid", "Due amount", "Order status", "Current department", "Notes"],
    ...orders.map((order) => [
      order.orderNumber,
      date(order.orderDate),
      date(order.expectedDelivery),
      order.bagType ?? order.product,
      order.bagSize ?? "",
      order.printingColor ?? "",
      order.quantity,
      order.ratePerBag ?? "",
      order.amount,
      order.advancePaid ?? 0,
      order.remainingAmount ?? Math.max(0, order.amount - (order.advancePaid ?? 0)),
      order.status,
      stageInfo[order.currentStage].label,
      order.notes ?? "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(safeCell).join(",")).join("\r\n")}`;
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${customer.companyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "customer"}-orders.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function CustomerProfilePage() {
  const { id } = useParams();
  const { customers, orders, currentUser } = useApp();
  const [orderFilter, setOrderFilter] = useState<"all" | "completed" | "cancelled">("all");
  const permitted = ["admin", "marketing"].includes(currentUser?.role ?? "");
  const customer = customers.find((item) => item.id === id);
  if (!permitted) return <Navigate to="/customers" replace />;
  if (!customer) return <Navigate to="/customers" replace />;
  const customerOrders = orders
    .filter((order) => order.customerId === customer.id)
    .sort((first, second) => new Date(second.orderDate).getTime() - new Date(first.orderDate).getTime());
  const completed = customerOrders.filter((order) => order.status === "completed");
  const cancelled = customerOrders.filter((order) => order.status === "cancelled");
  const visibleOrders = orderFilter === "all"
    ? customerOrders
    : customerOrders.filter((order) => order.status === orderFilter);
  return (
    <>
      <Heading
        eyebrow="Customer profile"
        title={customer.companyName}
        description="View this customer's contact information and complete order history in one place."
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="secondary-button" to="/customers"><ArrowLeft className="size-4" /> Customers</Link>
            <button className="primary-button" onClick={() => downloadCustomerOrderSheet(customer, customerOrders)}>
              <Download className="size-4" /> Download Excel sheet
            </button>
          </div>
        }
      />
      <section className="surface mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Contact person</p><p className="mt-1 font-bold text-navy-900">{customer.contactPerson}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</p><p className="mt-1 font-bold text-navy-900">{customer.phone}</p>{customer.alternativePhone && <p className="mt-1 text-sm text-slate-600">Alt: {customer.alternativePhone}</p>}</div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">GST number</p><p className="mt-1 font-bold text-navy-900">{customer.gstNumber || "Not provided"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer status</p><p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${customer.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{customer.active ? "Active" : "Inactive"}</p></div>
        </div>
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600"><strong className="text-navy-900">Address: </strong>{customer.address}</p>
      </section>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="surface p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total orders</p><p className="mt-2 text-3xl font-extrabold text-navy-900">{customerOrders.length}</p></div>
        <div className="surface p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed orders</p><p className="mt-2 text-3xl font-extrabold text-emerald-700">{completed.length}</p></div>
        <div className="surface p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cancelled orders</p><p className="mt-2 text-3xl font-extrabold text-slate-600">{cancelled.length}</p></div>
      </section>
      <section className="surface mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div><h2 className="font-bold text-navy-900">Order history</h2><p className="mt-1 text-sm text-slate-600">Every order placed by {customer.companyName}.</p></div>
          <div className="filter-scroll flex max-w-full gap-2 overflow-x-auto" aria-label="Filter customer orders">
            {([ ["all", "All", customerOrders.length], ["completed", "Completed", completed.length], ["cancelled", "Cancelled", cancelled.length] ] as const).map(([value, label, count]) => (
              <button key={value} onClick={() => setOrderFilter(value)} className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-bold ${orderFilter === value ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700"}`}>{label} ({count})</button>
            ))}
          </div>
        </div>
        {visibleOrders.length ? <div className="divide-y divide-slate-100">
          {visibleOrders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block p-4 transition hover:bg-sky-50 sm:grid sm:grid-cols-[140px_minmax(220px,1fr)_150px_130px_28px] sm:items-center sm:gap-4 sm:px-5">
              <p className="font-extrabold text-brand">{order.orderNumber}</p>
              <div className="mt-2 sm:mt-0"><p className="font-bold text-navy-900">{order.bagType ?? order.product}</p><p className="mt-0.5 text-sm text-slate-600">{order.quantity.toLocaleString("en-IN")} bags · {money(order.amount)}</p></div>
              <span className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold capitalize sm:mt-0 ${order.status === "completed" ? "bg-emerald-50 text-emerald-800" : order.status === "cancelled" ? "bg-slate-100 text-slate-700" : "bg-sky-50 text-sky-800"}`}>{order.status}</span>
              <p className="mt-2 text-sm font-semibold text-slate-700 sm:mt-0">{date(order.expectedDelivery)}</p>
              <ChevronRight className="hidden size-5 text-slate-400 sm:block" />
            </Link>
          ))}
        </div> : <Empty title="No matching orders" text="This customer has no orders in this status yet." />}
      </section>
    </>
  );
}

function NewOrderPage() {
  const { customers, createOrder } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [quantityValue, setQuantityValue] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [advancePaid, setAdvancePaid] = useState<"yes" | "no">("no");
  const [advanceValue, setAdvanceValue] = useState("");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const totalValue = Number(quantityValue || 0) * Number(rateValue || 0);
  const advanceAmount = advancePaid === "yes" ? Number(advanceValue || 0) : 0;
  const remainingValue = Math.max(0, totalValue - advanceAmount);
  const matchingCustomers = customers
    .filter((customer) => {
      const query = customerQuery.trim().toLocaleLowerCase();
      if (!query) return true;
      return [
        customer.companyName,
        customer.contactPerson,
        customer.phone,
        customer.email ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(query));
    })
    .slice(0, 8);
  if (!customers.length)
    return (
      <>
        <Heading
          eyebrow="New order"
          title="Create an order"
          description="A customer is required before an order can be booked."
        />
        <Empty
          title="Create a customer first"
          text="Orders must be connected to a real customer record."
          action={
            <Link className="primary-button" to="/customers">
              Go to customers
            </Link>
          }
        />
      </>
    );
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!selectedCustomer) {
      setError(
        "Please search for and select a customer before creating the order.",
      );
      setCustomerMenuOpen(true);
      return;
    }
    if (advanceAmount > totalValue) {
      setError("Advance amount cannot be more than the total order amount.");
      return;
    }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const order = await createOrder({
        customerId: selectedCustomer.id,
        product: String(form.get("bagType")),
        quantity: Number(quantityValue),
        amount: totalValue,
        bagType: String(form.get("bagType")),
        bagSize: String(form.get("bagSize")),
        printingColor: String(form.get("printingColor")),
        ratePerBag: Number(rateValue),
        advancePaid: advanceAmount,
        primaryPhone: String(form.get("primaryPhone")),
        alternativePhone: String(form.get("alternativePhone")) || undefined,
        gstNumber: String(form.get("gstNumber")).trim().toUpperCase() || undefined,
        expectedDelivery: String(form.get("expectedDelivery")),
        priority: String(form.get("priority")),
        notes: String(form.get("notes")) || undefined,
      });
      const uploadFile = async (
        file: File,
        assetType: "design" | "payment_proof",
      ) => {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 10 * 1024 * 1024
        ) {
          throw new Error(
            "Use a JPG, PNG, or WebP image no larger than 10 MB.",
          );
        }
        const intent = await api.uploadIntent(order.id, file, assetType);
        await api.uploadToR2(intent.uploadUrl, file, () => undefined);
        await api.completeUpload(intent.asset.id);
      };
      const uploadResults = await Promise.allSettled(
        [
          designFile ? uploadFile(designFile, "design") : null,
          paymentProofFile
            ? uploadFile(paymentProofFile, "payment_proof")
            : null,
        ].filter(Boolean) as Promise<void>[],
      );
      navigate(`/orders/${order.id}`);
      const failedUpload = uploadResults.find(
        (result) => result.status === "rejected",
      );
      if (failedUpload && failedUpload.status === "rejected") {
        toast(
          `Order saved. A selected file could not be uploaded: ${failedUpload.reason instanceof Error ? failedUpload.reason.message : "please add it later from the order."}`,
          "error",
        );
      } else if (uploadResults.length) {
        toast("Order saved and selected files uploaded securely.");
      } else {
        toast("Order saved. Material and Design teams can begin their work.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create order.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-slate-600"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="size-5" />
        Back
      </button>
      <Heading
        eyebrow="Order management"
        title="Create new order"
        description="Complete the order book details below. Required fields are marked with an asterisk (*)."
      />
      <form className="mx-auto max-w-4xl" onSubmit={submit}>
        <div className="page-copy mb-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <strong>Order book:</strong> Select the customer, add bag and payment details, then confirm the order. Material and Design teams are notified automatically.
        </div>
        <section className="surface overflow-visible p-5 md:p-7">
          <div className="flex min-w-0 items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">A</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-navy-900">Customer details</h2>
              <p className="mt-0.5 text-sm text-slate-600">Find the customer before booking this order.</p>
            </div>
          </div>
          <label className="label mt-4" htmlFor="customer-search">
            Search customer <span aria-hidden="true">*</span>
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="customer-search"
              className="field field-with-leading-icon field-with-trailing-action"
              value={customerQuery}
              role="combobox"
              aria-autocomplete="list"
              aria-controls="customer-results"
              aria-expanded={customerMenuOpen}
              aria-describedby="customer-search-help"
              autoComplete="off"
              placeholder="Type company name, contact person, or phone number"
              onChange={(event) => {
                setCustomerQuery(event.target.value);
                setSelectedCustomer(null);
                setCustomerMenuOpen(true);
              }}
              onFocus={() => setCustomerMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setCustomerMenuOpen(false);
              }}
            />
            {selectedCustomer && (
              <button
                type="button"
                className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerQuery("");
                  setCustomerMenuOpen(true);
                }}
                aria-label="Clear selected customer"
              >
                <X className="size-5" />
              </button>
            )}
            {customerMenuOpen && (
              <div
                id="customer-results"
                role="listbox"
                className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
              >
                {matchingCustomers.length ? (
                  matchingCustomers.map((customer) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedCustomer?.id === customer.id}
                      key={customer.id}
                      className="flex min-h-12 w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-sky-50 focus:bg-sky-50 focus:outline-none"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerQuery(`${customer.companyName} — ${customer.contactPerson}`);
                        setCustomerMenuOpen(false);
                      }}
                    >
                      <span className="font-semibold text-navy-900">
                        {customer.companyName}
                      </span>
                      <span className="text-sm text-slate-600">
                        {customer.contactPerson} · {customer.phone}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-slate-600">
                    No customer matches this search. Check the spelling or add
                    the customer first.
                  </p>
                )}
              </div>
            )}
          </div>
          <p id="customer-search-help" className="mt-2 text-sm text-slate-600">
            Type a few letters, then select the correct customer from the list.
          </p>
          {selectedCustomer && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Selected: {selectedCustomer.companyName}
            </p>
          )}
        </section>
        <section className="surface mt-5 p-5 md:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">B</span>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Contact and GST details</h2>
              <p className="mt-0.5 text-sm text-slate-600">Use the customer’s current contact details for this order.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2" key={selectedCustomer?.id ?? "no-customer"}>
            <Field name="primaryPhone" label="Primary phone number *" type="tel" defaultValue={selectedCustomer?.phone} required />
            <Field name="alternativePhone" label="Alternative phone number (optional)" type="tel" defaultValue={selectedCustomer?.alternativePhone} />
            <Field name="gstNumber" label="GST number (optional)" placeholder="Example: 27ABCDE1234F1Z5" defaultValue={selectedCustomer?.gstNumber} />
          </div>
        </section>
        <section className="surface mt-5 p-5 md:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">C</span>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Bag details</h2>
              <p className="mt-0.5 text-sm text-slate-600">These details appear on the production order and help every department prepare correctly.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label mt-4">Type of bag *</span>
              <input className="field" name="bagType" list="bag-types" placeholder="Select or type bag type" required />
              <datalist id="bag-types">
                <option value="PP woven bag" />
                <option value="Non-woven bag" />
                <option value="Cotton bag" />
                <option value="Jute bag" />
                <option value="Paper bag" />
              </datalist>
            </label>
            <Field name="bagSize" label="Bag size *" placeholder="Example: 25 kg or 20 × 30 inch" required />
            <Field name="printingColor" label="Colour of printing *" placeholder="Example: Blue and green" required />
            <label>
              <span className="label mt-4">Rate per bag (₹) *</span>
              <input className="field" inputMode="decimal" type="number" min="0" step="0.01" placeholder="0.00" required value={rateValue} onChange={(event) => setRateValue(event.target.value)} />
            </label>
            <label>
              <span className="label mt-4">Number of bags *</span>
              <input
                className="field"
                type="number"
                min="1"
                placeholder="0"
                required
                value={quantityValue}
                onChange={(event) => setQuantityValue(event.target.value)}
              />
            </label>
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Total amount</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-navy-900">₹ {totalValue.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-600">Calculated from rate per bag × number of bags</p>
            </div>
            <Field name="expectedDelivery" label="Delivery date *" type="date" required />
          </div>
        </section>
        <section className="surface mt-5 p-5 md:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">D</span>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Design file</h2>
              <p className="mt-0.5 text-sm text-slate-600">Optional. Add the customer’s artwork now, or the Designer can add it later.</p>
            </div>
          </div>
          <label className="mt-4 flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-sky-400 hover:bg-sky-50">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm"><ImagePlus className="size-5" /></span>
            <span className="min-w-0">
              <span className="block font-semibold text-navy-900">Design image / file</span>
              <span className="mt-1 block truncate text-sm text-slate-600">{designFile ? designFile.name : "Choose JPG, PNG, or WebP image (maximum 10 MB)"}</span>
            </span>
            <span className="ml-auto shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy-900">Choose file</span>
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDesignFile(event.target.files?.[0] ?? null)} />
          </label>
        </section>
        <section className="surface mt-5 p-5 md:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">E</span>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Payment details</h2>
              <p className="mt-0.5 text-sm text-slate-600">Record any advance received today. The due amount is calculated automatically.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label mt-4">Advance paid? *</span>
              <select className="field" value={advancePaid} onChange={(event) => { const value = event.target.value as "yes" | "no"; setAdvancePaid(value); if (value === "no") setAdvanceValue(""); }}>
                <option value="no">No, no advance received</option>
                <option value="yes">Yes, advance received</option>
              </select>
            </label>
            <label>
              <span className="label mt-4">Advance amount (₹) {advancePaid === "yes" ? "*" : ""}</span>
              <input className="field" inputMode="decimal" type="number" min="0" max={totalValue || undefined} step="0.01" placeholder="0.00" disabled={advancePaid === "no"} required={advancePaid === "yes"} value={advanceValue} onChange={(event) => setAdvanceValue(event.target.value)} />
            </label>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Remaining / due amount</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-navy-900">₹ {remainingValue.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-slate-600">Total amount less advance amount</p>
            </div>
            <label className="mt-4 flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-sky-400 hover:bg-sky-50">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm"><ReceiptText className="size-5" /></span>
              <span className="min-w-0">
                <span className="block font-semibold text-navy-900">Payment proof (optional)</span>
                <span className="mt-1 block truncate text-sm text-slate-600">{paymentProofFile ? paymentProofFile.name : "Upload payment screenshot or receipt (JPG, PNG, or WebP; maximum 10 MB)"}</span>
              </span>
              <span className="ml-auto shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-navy-900">Choose file</span>
              <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPaymentProofFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
        </section>
        <section className="surface mt-5 p-5 md:p-7">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-sm font-bold text-white">F</span>
            <div>
              <h2 className="text-lg font-bold text-navy-900">Additional information</h2>
              <p className="mt-0.5 text-sm text-slate-600">Add special instructions that production, delivery, or accounts should know.</p>
            </div>
          </div>
          <label className="label mt-4">Order note (optional)</label>
          <textarea
            className="field min-h-24 py-3"
            name="notes"
            placeholder="Example: Print placement, packing instruction, delivery contact, or other customer request"
          />
          <label className="mt-4 block max-w-sm">
            <span className="label">Order priority</span>
            <select className="field" name="priority">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </section>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <strong>After confirmation:</strong> Material and Design tasks are created. Cutting starts after material is confirmed available; Printing starts only after Cutting and Plate are complete.
        </div>
        <button className="primary-button mt-5 w-full" disabled={busy}>
          {busy ? "Saving order…" : "Confirm order"}
        </button>
      </form>
    </>
  );
}

function DeliveryCompletionForm({
  order,
  onComplete,
}: {
  order: Order;
  onComplete: (data: Record<string, unknown>) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(
      [...form.entries()].filter(([, value]) => String(value).trim() !== ""),
    );
    onComplete(data);
  };
  return (
    <form className="rounded-xl border border-sky-200 bg-sky-50 p-4" onSubmit={submit}>
      <p className="font-bold text-navy-900">Delivery confirmation</p>
      <p className="mt-1 text-sm text-slate-600">Record the details before completing this task.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field name="receivedBy" label="Received by" defaultValue={order.contactPerson} required />
        <Field name="deliveryDate" label="Delivery date" type="date" defaultValue={today} required />
      </div>
      <label className="label mt-4">Note (optional)</label>
      <textarea className="field mt-1 min-h-20 py-3" name="note" placeholder="Add any helpful information" />
      <button className="primary-button mt-4 w-full">Save and complete</button>
    </form>
  );
}

function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser, orders, updateStage, reload } = useApp();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(
    orders.find((item) => item.id === id) ?? null,
  );
  const [selected, setSelected] = useState<StageKey | null>(() => {
    const stage = searchParams.get("stage");
    return stage && stage in stageInfo ? (stage as StageKey) : null;
  });
  const [cancelPending, setCancelPending] = useState(false);
  const [materialAvailableConfirm, setMaterialAvailableConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(!order);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editAdvance, setEditAdvance] = useState("");
  useEffect(() => {
    if (!id) return;
    // Loading fresh server state when the route changes is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    api
      .order(id)
      .then(setOrder)
      .catch((error) => toast(error.message, "error"))
      .finally(() => setBusy(false));
  }, [id]);
  if (busy && !order) return <LoadingScreen />;
  if (!order || !currentUser) return <Navigate to="/orders" replace />;
  const state = selected ? order.stages[selected] : null;
  const manage = selected ? canManageStage(currentUser.role, selected) : false;
  const currentRole = operatingRole(stageInfo[order.currentStage].role);
  const currentVisual = roleVisuals[currentRole];
  const CurrentRoleIcon = currentVisual.icon;
  const canEditOrder = ["admin", "marketing"].includes(currentUser.role);
  const canManageDesignApproval = ["admin", "marketing"].includes(currentUser.role);
  const usesDetailedTaskScreen = currentUser.role === "marketing";
  const openOrderEdit = () => {
    setEditError("");
    setEditQuantity(String(order.quantity));
    setEditRate(String(order.ratePerBag ?? Math.round(order.amount / order.quantity)));
    setEditAdvance(String(order.advancePaid ?? 0));
    setEditOpen(true);
  };
  const saveOrderEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updatedQuantity = Number(editQuantity);
    const updatedRate = Number(editRate);
    const updatedAmount = updatedQuantity * updatedRate;
    const updatedAdvance = Number(editAdvance || 0);
    if (!updatedQuantity || updatedQuantity < 1 || updatedRate < 0) {
      setEditError("Enter a valid rate and number of bags.");
      return;
    }
    if (updatedAdvance > updatedAmount) {
      setEditError("Advance amount cannot be more than the total order amount.");
      return;
    }
    setEditBusy(true);
    setEditError("");
    try {
      const updated = await api.updateOrder(order, {
        customerId: order.customerId,
        product: String(form.get("bagType")),
        quantity: updatedQuantity,
        amount: updatedAmount,
        bagType: String(form.get("bagType")),
        bagSize: String(form.get("bagSize")),
        printingColor: String(form.get("printingColor")),
        ratePerBag: updatedRate,
        advancePaid: updatedAdvance,
        primaryPhone: String(form.get("primaryPhone")),
        alternativePhone: String(form.get("alternativePhone")) || undefined,
        gstNumber: String(form.get("gstNumber")).trim().toUpperCase() || undefined,
        expectedDelivery: String(form.get("expectedDelivery")),
        priority: String(form.get("priority")),
        notes: String(form.get("notes")) || undefined,
      });
      setOrder(updated);
      setEditOpen(false);
      await reload();
      toast("Order details updated.");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not update order details.");
    } finally {
      setEditBusy(false);
    }
  };
  const editTotal = Number(editQuantity || 0) * Number(editRate || 0);
  const editDue = Math.max(0, editTotal - Number(editAdvance || 0));
  const performTaskAction = async (
    action: "complete" | "block" | "resolve" | "material_available",
    taskData: Record<string, unknown> = {},
  ) => {
    if (!selected) return;
    try {
      if (action === "material_available") {
        const completed = await updateStage(order, selected, {
          action: "complete",
          data: { materialAvailable: "yes" },
        });
        setOrder(completed);
        setSelected(null);
        toast("Material confirmed. The order is now in the Cutting list.");
        return;
      }
      const updated = await updateStage(order, selected, {
        action,
        note: action === "block" ? `${stageInfo[selected].label} needs attention.` : undefined,
        data: selected === "printing" && action === "complete" ? { qualityChecked: true, ...taskData } : taskData,
      });
      setOrder(updated);
      setSelected(null);
    } catch { /* The shared API handler shows the friendly error toast. */ }
  };
  const cancelOrder = async () => {
    setBusy(true);
    try {
      const updated = await api.cancelOrder(order, cancelReason.trim());
      setOrder(updated);
      setCancelPending(false);
      toast("Order cancelled. Private artwork will be deleted after 30 days.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not cancel order.",
        "error",
      );
      setCancelPending(false);
    } finally {
      setBusy(false);
    }
  };
  const markMaterialAvailable = async () => {
    try {
      const updated = await api.markMaterialAvailable(order);
      setOrder(updated);
      toast("Material marked available. Cutting Master can check and continue.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update material availability.", "error");
    } finally {
      setMaterialAvailableConfirm(false);
    }
  };
  return (
    <>
      <button
        className="mb-4 inline-flex min-h-11 items-center gap-2 font-semibold text-slate-600"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="size-5" />
        Back to orders
      </button>
      <section className="surface overflow-hidden">
        <div className="bg-navy-900 p-5 text-white md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-orange-300">{order.orderNumber}</p>
              <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">
                {order.customer}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {order.product} · {order.quantity.toLocaleString("en-IN")} bags
              </p>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-3">
              {canEditOrder && order.status === "active" && (
                <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-navy-900 shadow-sm transition hover:bg-slate-100" onClick={openOrderEdit}>
                  Edit order details
                </button>
              )}
            <div className="flex min-w-52 items-start gap-3 rounded-xl bg-white/10 p-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${currentVisual.soft} ${currentVisual.color}`}>
                <CurrentRoleIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-slate-300">Current responsibility</p>
                <p className="font-bold">{stageInfo[order.currentStage].label}</p>
                <p className="mt-0.5 text-xs text-slate-300">{roleLabels[currentRole]}</p>
                <div className="mt-2"><StatusBadge status={order.stages[order.currentStage].status} /></div>
              </div>
            </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5 md:grid-cols-4">
            {canViewPrices(currentUser.role) && (
              <Summary label="Value" value={money(order.amount)} />
            )}
            <Summary
              label="Expected delivery"
              value={date(order.expectedDelivery)}
            />
            <Summary label="Priority" value={order.priority.toUpperCase()} />
            <Summary label="Version" value={`#${order.version}`} />
          </div>
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <p className="eyebrow">What should happen next?</p>
          <div className="mt-2 flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${currentVisual.soft} ${currentVisual.color}`}>
              <CurrentRoleIcon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="pt-1.5 text-lg font-bold text-navy-900">{nextInstruction(order)}</h2>
          </div>
        <button
          className="primary-button mt-4"
          onClick={() => {
            setSelected(order.currentStage);
          }}
        >
          {canManageStage(currentUser.role, order.currentStage)
            ? "Open next action"
            : `View ${roleLabels[stageInfo[order.currentStage].role]} step`}
          <ChevronRight className="size-4" />
        </button>
      </section>
      {currentUser.role === "admin" && ["blocked", "issue"].includes(order.stages.material.status) && (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">Material is unavailable</h2>
          <p className="mt-1 text-sm text-amber-900">When stock arrives, confirm it here. Cutting Master will then receive the material check again.</p>
          <button className="primary-button mt-4" onClick={() => setMaterialAvailableConfirm(true)}>Mark material available</button>
        </section>
      )}
      {canManageDesignApproval && (
        <DesignWorkspace order={order} setOrder={setOrder} reload={reload} />
      )}
      <section className="mt-4 grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
        <div className="surface p-5">
          <h2 className="flex items-center gap-2 font-bold text-navy-900"><Building2 className="size-5 text-sky-700" aria-hidden="true" />Customer and order</h2>
          <dl className="mt-3">
            <Detail label="Contact" value={order.contactPerson} />
            {order.phone && <Detail label="Phone" value={order.phone} />}
            <Detail label="Order date" value={date(order.orderDate)} />
            <Detail label="Delivery" value={date(order.expectedDelivery)} />
          </dl>
        </div>
        <div className="surface p-5">
          <h2 className="flex items-center gap-2 font-bold text-navy-900"><ClipboardList className="size-5 text-sky-700" aria-hidden="true" />Activity history</h2>
          <p className="text-sm text-slate-500">Who changed what and when.</p>
          <ol className="mt-4 space-y-4">
            {order.activity?.map((item) => (
              <li className="border-l-2 border-slate-200 pl-4" key={item.id}>
                <p className="text-sm font-semibold">{item.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.actorName} · {dateTime(item.at)}
                </p>
              </li>
            ))}
            {!order.activity?.length && (
              <p className="text-sm text-slate-500">
                No activity recorded yet.
              </p>
            )}
          </ol>
        </div>
      </section>
      {order.status === "active" &&
        currentUser.role === "admin" && (
          <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-bold text-red-900">
              Need to cancel this order?
            </h2>
            <p className="mt-1 text-sm leading-6 text-red-800">
              Use this only when production must stop. The reason is permanently
              saved in the activity history.
            </p>
            <label className="label mt-4" htmlFor="cancel-order-reason">
              Reason for cancellation
            </label>
            <textarea
              id="cancel-order-reason"
              className="field min-h-20 py-3"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Example: Customer cancelled the requirement"
            />
            <button
              className="secondary-button mt-3 !border-red-300 !text-red-800"
              disabled={busy}
              onClick={() =>
                cancelReason.trim().length >= 3
                  ? setCancelPending(true)
                  : toast(
                      "Write a short reason before cancelling this order.",
                      "error",
                    )
              }
            >
              Cancel this order
            </button>
          </section>
        )}
      {editOpen && (
        <Modal title="Edit order details" close={() => !editBusy && setEditOpen(false)}>
          <p className="rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-900">Update booking details, customer contact information, bag details, payment amounts, or delivery date. Quantity cannot be changed after production has started.</p>
          <form className="mt-2" onSubmit={saveOrderEdit}>
            <h3 className="mt-5 font-bold text-navy-900">Customer contact</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="primaryPhone" label="Primary phone number *" type="tel" defaultValue={order.phone} required />
              <Field name="alternativePhone" label="Alternative phone number (optional)" type="tel" defaultValue={order.alternativePhone} />
              <Field name="gstNumber" label="GST number (optional)" defaultValue={order.gstNumber} />
            </div>
            <h3 className="mt-6 border-t border-slate-200 pt-5 font-bold text-navy-900">Bag details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="bagType" label="Type of bag *" defaultValue={order.bagType ?? order.product} required />
              <Field name="bagSize" label="Bag size *" defaultValue={order.bagSize} required />
              <Field name="printingColor" label="Colour of printing *" defaultValue={order.printingColor} required />
              <label><span className="label mt-4">Rate per bag (₹) *</span><input className="field" type="number" min="0" step="1" required value={editRate} onChange={(event) => setEditRate(event.target.value)} /></label>
              <label><span className="label mt-4">Number of bags *</span><input className="field" type="number" min="1" required value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} /></label>
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">Total amount</p><p className="mt-1 text-xl font-extrabold text-navy-900">₹ {editTotal.toLocaleString("en-IN")}</p></div>
              <Field name="expectedDelivery" label="Delivery date *" type="date" defaultValue={order.expectedDelivery} required />
            </div>
            <h3 className="mt-6 border-t border-slate-200 pt-5 font-bold text-navy-900">Payment and note</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="label mt-4">Advance amount (₹)</span><input className="field" type="number" min="0" max={editTotal || undefined} step="1" value={editAdvance} onChange={(event) => setEditAdvance(event.target.value)} /></label>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Remaining / due amount</p><p className="mt-1 text-xl font-extrabold text-navy-900">₹ {editDue.toLocaleString("en-IN")}</p></div>
              <label><span className="label mt-4">Priority</span><select className="field" name="priority" defaultValue={order.priority}><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
            </div>
            <label className="label mt-4">Order note (optional)</label>
            <textarea className="field min-h-24 py-3" name="notes" defaultValue={order.notes} placeholder="Add or update customer instructions" />
            {editError && <ErrorText>{editError}</ErrorText>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="secondary-button" disabled={editBusy} onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="primary-button" disabled={editBusy}>{editBusy ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </Modal>
      )}
      {selected && state && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-navy-950/50"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Your task</p>
                <h2 className="mt-1 text-2xl font-bold text-navy-900">
                  {stageInfo[selected].label}
                </h2>
              </div>
              <button
                className="grid size-11 place-items-center"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            {!manage && (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>View only:</strong> This step belongs to{" "}
                {roleLabels[stageInfo[selected].role]}.
              </p>
            )}
            <div className="mt-6 space-y-3">
              {manage && ["ready", "blocked", "issue"].includes(state.status) && selected === "material" && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="font-bold text-navy-900">Is the material available?</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button className="primary-button w-full" onClick={() => void performTaskAction("material_available")}>Yes</button>
                    <button className="secondary-button w-full !border-red-200 !text-red-700" onClick={() => void performTaskAction("block")}>No</button>
                  </div>
                </div>
              )}
              {manage && !usesDetailedTaskScreen && ["ready", "in_progress", "blocked", "issue"].includes(state.status) && selected !== "material" && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="font-bold text-navy-900">Is {stageInfo[selected].short.toLowerCase()} completed?</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button className="primary-button w-full" onClick={() => void performTaskAction("complete")}>Yes</button>
                    <button className="secondary-button w-full" onClick={() => setSelected(null)}>No</button>
                  </div>
                </div>
              )}
              {manage && usesDetailedTaskScreen && selected === "delivery" && ["ready", "in_progress", "blocked", "issue"].includes(state.status) && (
                <DeliveryCompletionForm
                  order={order}
                  onComplete={(data) => void performTaskAction("complete", data)}
                />
              )}
            </div>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={cancelPending}
        title="Cancel this entire order?"
        message="Production will stop, active customer review links will be revoked, and private artwork will be scheduled for deletion after 30 days. This action is recorded in the activity history."
        confirmLabel="Yes, cancel this order"
        onCancel={() => setCancelPending(false)}
        onConfirm={() => void cancelOrder()}
      />
      <ConfirmDialog
        open={materialAvailableConfirm}
        title="Material is now available?"
        message="This sends the material check back to Cutting Master. Cutting can proceed only after they confirm Yes."
        confirmLabel="Yes, mark available"
        onCancel={() => setMaterialAvailableConfirm(false)}
        onConfirm={() => void markMaterialAvailable()}
      />
    </>
  );
}

function DesignWorkspace({
  order,
  setOrder,
  reload,
}: {
  order: Order;
  setOrder: (order: Order) => void;
  reload: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [confirm, setConfirm] = useState<{
    type: "no-image" | "review";
    asset?: DesignAsset;
  } | null>(null);
  const [noImageNote, setNoImageNote] = useState(
    "Customer confirmed that no image was supplied.",
  );
  const assets = order.designAssets ?? [];
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffDecision, setStaffDecision] = useState<
    "approved" | "changes_requested"
  >("approved");
  const [channel, setChannel] = useState("whatsapp");
  const [customerName, setCustomerName] = useState(order.contactPerson);
  const [staffReason, setStaffReason] = useState("");
  const [staffConfirm, setStaffConfirm] = useState(false);
  const activeReviewAsset = assets.find(
    (asset) => asset.status === "in_review",
  );
  const upload = async () => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    )
      return toast("Choose a JPG, PNG, or WebP image up to 10 MB.", "error");
    setBusy(true);
    try {
      const intent = await api.uploadIntent(order.id, file);
      await api.uploadToR2(intent.uploadUrl, file, setProgress);
      await api.completeUpload(intent.asset.id);
      setOrder(await api.order(order.id));
      setFile(null);
      setProgress(0);
      toast("Design image uploaded and verified.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
    }
  };
  const view = async (asset: DesignAsset) => {
    try {
      const result = await api.viewAsset(asset.id);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Image unavailable.",
        "error",
      );
    }
  };
  const createLink = async (asset: DesignAsset) => {
    setBusy(true);
    try {
      const result = await api.reviewLink(order.id, asset.id);
      const url = `${window.location.origin}${result.path}`;
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => undefined);
      setOrder(await api.order(order.id));
      toast("Secure seven-day link created and copied.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not create link.",
        "error",
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const noImage = async () => {
    setBusy(true);
    try {
      const updated = await api.noImage(order, noImageNote);
      setOrder({ ...updated, activity: order.activity, designAssets: assets });
      await reload();
      toast("No customer image confirmed. Plate preparation is now ready.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not confirm.",
        "error",
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };
  const recordStaffResponse = async () => {
    if (!activeReviewAsset) return;
    if (staffDecision === "changes_requested" && staffReason.trim().length < 3)
      return toast("Explain what the customer wants changed.", "error");
    setBusy(true);
    try {
      await api.staffDecision(order.id, {
        assetId: activeReviewAsset.id,
        decision: staffDecision,
        channel,
        customerName,
        reason: staffReason || undefined,
      });
      setOrder(await api.order(order.id));
      setStaffOpen(false);
      setStaffConfirm(false);
      toast("Customer response recorded with staff details.");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Could not record response.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="surface mt-4 p-5" id="design-workspace">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Marketing / Admin</p>
          <h2 className="mt-1 text-xl font-bold text-navy-900">
            Artwork and customer approval
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload the final artwork, then send it to the customer for approval or record their response here. The Designer does not manage this step.
          </p>
        </div>
        {order.stages.design.status !== "completed" && (
          <button
            className="secondary-button"
            onClick={() => setConfirm({ type: "no-image" })}
          >
            No customer image
          </button>
        )}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-5 text-center">
          <ImagePlus className="mx-auto size-9 text-slate-400" />
          <label className="primary-button mt-4">
            <Upload className="size-4" />
            Choose image
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-3 text-xs text-slate-500">
            JPG, PNG or WebP · Maximum 10 MB
          </p>
          {file && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-left text-sm">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                className="primary-button mt-3 w-full"
                onClick={() => void upload()}
                disabled={busy}
              >
                {busy ? `Uploading ${progress}%` : "Upload as new version"}
              </button>
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-navy-900">Version history</h3>
          <div className="mt-3 space-y-2">
            {assets.map((asset) => (
              <article
                className="rounded-xl border border-slate-200 p-3"
                key={asset.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      Version {asset.version} · {asset.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {asset.uploadedByName} · {dateTime(asset.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">
                    {asset.status.replace("_", " ")}
                  </span>
                </div>
                {asset.decisionReason && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
                    Customer note: {asset.decisionReason}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="secondary-button"
                    onClick={() => void view(asset)}
                    disabled={asset.status === "deleted"}
                  >
                    <Eye className="size-4" />
                    View
                  </button>
                  {asset.status === "available" && (
                    <button
                      className="primary-button"
                      onClick={() => setConfirm({ type: "review", asset })}
                    >
                      Send for approval
                    </button>
                  )}
                  {asset.status === "in_review" && (
                    <button
                      className="secondary-button"
                      onClick={() => setStaffOpen(true)}
                    >
                      Record staff-assisted response
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!assets.length && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No image versions uploaded. Uploading is optional.
              </p>
            )}
          </div>
          {link && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-bold text-emerald-900">
                Customer link (valid 7 days)
              </p>
              <div className="mt-2 flex gap-2">
                <input className="field" readOnly value={link} />
                <button
                  className="secondary-button"
                  onClick={() => {
                    void navigator.clipboard.writeText(link);
                    toast("Link copied.");
                  }}
                >
                  <Clipboard className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-800">
                Send manually by WhatsApp, email, or SMS.
              </p>
            </div>
          )}
        </div>
      </div>
      {confirm?.type === "no-image" && (
        <Modal title="Confirm no customer image" close={() => setConfirm(null)}>
          <p className="text-sm leading-6 text-slate-600">
            This completes Design but Plate remains required before Printing.
          </p>
          <label className="label mt-4">Confirmation note</label>
          <textarea
            className="field min-h-24 py-3"
            value={noImageNote}
            onChange={(event) => setNoImageNote(event.target.value)}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="secondary-button"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={busy || noImageNote.length < 3}
              onClick={() => void noImage()}
            >
              Yes, confirm
            </button>
          </div>
        </Modal>
      )}
      {staffOpen && (
        <Modal
          title="Record customer response"
          close={() => setStaffOpen(false)}
        >
          <p className="text-sm leading-6 text-slate-600">
            Use this only when the customer replied by phone, WhatsApp, or in
            person. Your account will be recorded in the audit history.
          </p>
          <label className="label mt-4">Customer name</label>
          <input
            className="field"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
          <label className="label mt-4">Response channel</label>
          <select
            className="field"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="in_person">In person</option>
          </select>
          <label className="label mt-4">Customer decision</label>
          <select
            className="field"
            value={staffDecision}
            onChange={(event) =>
              setStaffDecision(
                event.target.value as "approved" | "changes_requested",
              )
            }
          >
            <option value="approved">Approved</option>
            <option value="changes_requested">Requested changes</option>
          </select>
          {staffDecision === "changes_requested" && (
            <>
              <label className="label mt-4">What should change?</label>
              <textarea
                className="field min-h-24 py-3"
                value={staffReason}
                onChange={(event) => setStaffReason(event.target.value)}
              />
            </>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="secondary-button"
              onClick={() => setStaffOpen(false)}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              disabled={
                customerName.length < 2 ||
                (staffDecision === "changes_requested" &&
                  staffReason.length < 3)
              }
              onClick={() => setStaffConfirm(true)}
            >
              Review response
            </button>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={confirm?.type === "review"}
        title="Send this design to the customer?"
        message={`Version ${confirm?.asset?.version ?? ""} will become the only active review. Any older customer link will stop working.`}
        confirmLabel="Yes, create link"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.asset) void createLink(confirm.asset);
        }}
      />
      <ConfirmDialog
        open={staffConfirm}
        title="Record this customer decision?"
        message={
          staffDecision === "approved"
            ? `Confirm that ${customerName} approved this design via ${channel}. Plate preparation will become ready.`
            : `Confirm that ${customerName} requested changes via ${channel}. The designer will need to create a new version.`
        }
        confirmLabel={
          staffDecision === "approved"
            ? "Yes, record approval"
            : "Yes, request changes"
        }
        onCancel={() => setStaffConfirm(false)}
        onConfirm={() => void recordStaffResponse()}
      />
    </section>
  );
}

function TeamPage() {
  const { users, createUser, currentUser, reload } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<Role>("cutting_master");
  const [managedUser, setManagedUser] = useState<User | null>(null);
  const [managedRole, setManagedRole] = useState<Role>("cutting_master");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [accountAction, setAccountAction] = useState<
    "activate" | "deactivate" | "reset" | "role" | "delete" | null
  >(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await createUser({
        name: String(form.get("name")),
        email: String(form.get("email")),
        role,
        department: String(form.get("department")),
        temporaryPassword: String(form.get("temporaryPassword")),
      });
      setOpen(false);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : [];
      setFieldErrors(Object.fromEntries(fields.map((field) => [field.field, field.message])));
      setError(fields.length ? "Please correct the highlighted information." : err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  };
  const confirmAccountAction = async () => {
    if (!managedUser || !accountAction) return;
    setBusy(true);
    try {
      if (accountAction === "delete") {
        await api.deleteUser(managedUser.id);
        toast("User permanently deleted. Previous order history is kept.");
      } else if (accountAction === "reset") {
        await api.resetPassword(managedUser.id, temporaryPassword);
        toast(
          "Temporary password reset. The employee must change it after sign-in.",
        );
      } else if (accountAction === "role") {
        await api.updateUser(managedUser.id, {
          role: managedRole,
          department: departmentFor[managedRole],
        });
        toast(`Role changed to ${roleLabels[managedRole]}.`);
      } else {
        await api.updateUser(managedUser.id, {
          active: accountAction === "activate",
        });
        toast(
          accountAction === "activate"
            ? "Staff account activated."
            : "Staff account deactivated and signed out on all devices.",
        );
      }
      await reload();
      setAccountAction(null);
      setManagedUser(null);
      setTemporaryPassword("");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Account update failed.",
        "error",
      );
      setAccountAction(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading
        eyebrow="People and permissions"
        title="Team accounts"
        description="Admin can see every order. Each department enters its own stock, production, payment, and dispatch updates."
        action={
          <button className="primary-button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add staff member
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => {
          const visual = roleVisuals[operatingRole(user.role)];
          const RoleIcon = visual.icon;
          return (
            <article className="surface p-4" key={user.id}>
              <div className="flex items-center gap-3">
                <span className={`grid size-12 place-items-center rounded-full ${visual.soft} ${visual.color}`}>
                  <RoleIcon className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{user.name}</h2>
                  <p className={`flex items-center gap-1.5 text-sm font-semibold ${visual.color}`}>
                    <RoleIcon className="size-3.5" aria-hidden="true" />
                    {roleLabels[operatingRole(user.role)]}
                  </p>
                </div>
              </div>
              <div className={`mt-4 rounded-xl ${visual.soft} p-3`}>
                <p className={`text-sm font-bold ${visual.color}`}>This person handles</p>
                <p className="mt-1 text-sm leading-5 text-slate-700">
                  {roleResponsibilities[operatingRole(user.role)]}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">{user.department}</span>
                <span className={`font-bold ${user.active ? "text-emerald-700" : "text-red-700"}`}>
                  {user.active ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                className="secondary-button mt-3 w-full"
                onClick={() => {
                  setManagedUser(user);
                  setManagedRole(operatingRole(user.role));
                }}
              >
                Manage account
              </button>
            </article>
          );
        })}
        {!users.length && (
          <Empty
            title="Only the bootstrap Admin exists"
            text="Create accounts for each department before practical workflow testing."
          />
        )}
      </div>
      {open && (
        <Modal title="Create staff account" close={() => setOpen(false)}>
          <form onSubmit={submit}>
            <Field name="name" label="Full name" required error={fieldErrors.name} />
            <Field
              name="email"
              label="Work email"
              type="email"
              placeholder="material.manager@example.com"
              required
              error={fieldErrors.email}
            />
            <label className="label mt-4">Role</label>
            <select
              className="field"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {Object.entries(roleLabels)
                .filter(([key]) => factoryRoles.includes(key as Role))
                .map(([key, value]) => (
                  <option value={key} key={key}>
                    {value} — {roleResponsibilities[key as Role]}
                  </option>
                ))}
            </select>
            <label className="label mt-4">Department</label>
            <input
              className="field"
              name="department"
              value={departmentFor[role]}
              readOnly
            />
            <Field
              name="temporaryPassword"
              label="Temporary password"
              type="password"
              minLength={10}
              required
              error={fieldErrors.temporaryPassword}
            />
            <p className="mt-2 text-xs text-slate-500">Use a real email format and a password of at least 10 characters.</p>
            {error && <ErrorText>{error}</ErrorText>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              The employee must change this password after first sign-in.
            </p>
          </form>
        </Modal>
      )}
      {managedUser && (
        <Modal
          title={`Manage ${managedUser.name}`}
          close={() => {
            setManagedUser(null);
            setTemporaryPassword("");
          }}
        >
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {managedUser.email}
            <br />
            <strong>{roleLabels[managedUser.role]}</strong> ·{" "}
            {managedUser.department}
          </p>
          {managedUser.id !== currentUser?.id && (
            <>
              <label className="label mt-5">Factory role</label>
              <select className="field" value={managedRole} onChange={(event) => setManagedRole(event.target.value as Role)}>
                {factoryRoles.map((item) => <option value={item} key={item}>{roleLabels[item]}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">Department: {departmentFor[managedRole]}</p>
              <button className="secondary-button mt-3 w-full" disabled={busy} onClick={() => setAccountAction("role")}>Change factory role</button>
            </>
          )}
          <label className="label mt-5" htmlFor="reset-password">
            New temporary password
          </label>
          <input
            id="reset-password"
            className="field"
            type="password"
            minLength={10}
            value={temporaryPassword}
            onChange={(event) => setTemporaryPassword(event.target.value)}
            placeholder="At least 10 characters"
          />
          <button
            className="secondary-button mt-3 w-full"
            disabled={temporaryPassword.length < 10 || busy}
            onClick={() => setAccountAction("reset")}
          >
            Reset temporary password
          </button>
          {managedUser.id !== currentUser?.id && (
            <>
              <button
                className={`mt-3 w-full ${managedUser.active ? "secondary-button !border-red-200 !text-red-700" : "primary-button"}`}
                disabled={busy}
                onClick={() =>
                  setAccountAction(managedUser.active ? "deactivate" : "activate")
                }
              >
                {managedUser.active ? "Deactivate account" : "Activate account"}
              </button>
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onClick={() => setAccountAction("delete")}
              >
                Permanently delete user
              </button>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Use this only for duplicate or unwanted accounts. It cannot be undone.
              </p>
            </>
          )}
          {managedUser.id === currentUser?.id && (
            <p className="mt-3 text-xs text-slate-500">
              You cannot deactivate the account you are currently using.
            </p>
          )}
        </Modal>
      )}
      <ConfirmDialog
        open={accountAction !== null}
        title={
          accountAction === "reset"
            ? "Reset this password?"
            : accountAction === "delete"
              ? "Permanently delete this user?"
            : accountAction === "role"
              ? `Change role to ${roleLabels[managedRole]}?`
            : accountAction === "deactivate"
              ? "Deactivate this account?"
              : "Activate this account?"
        }
        message={
          accountAction === "reset"
            ? "The employee will be signed out on every device and must use the new temporary password."
            : accountAction === "delete"
              ? "This permanently removes their sign-in account and signs them out. Their past order activity stays visible for production records. This cannot be undone."
            : accountAction === "role"
              ? "This changes which work steps the employee can open. Their previous role will no longer have access."
            : accountAction === "deactivate"
              ? "The employee will be signed out and cannot access any orders until an Admin activates the account again."
              : "The employee will be able to sign in and see work allowed for this role."
        }
        confirmLabel={
          accountAction === "reset"
            ? "Yes, reset password"
            : accountAction === "delete"
              ? "Yes, permanently delete"
            : accountAction === "role"
              ? "Yes, change role"
            : accountAction === "deactivate"
              ? "Yes, deactivate account"
              : "Yes, activate account"
        }
        onCancel={() => setAccountAction(null)}
        onConfirm={() => void confirmAccountAction()}
      />
    </>
  );
}

function MorePage() {
  const { currentUser, logout } = useApp();
  return (
    <>
      <Heading
        eyebrow="Settings and help"
        title="More options"
        description="Account actions are kept away from daily production buttons."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-bold">Signed-in account</h2>
          <p className="mt-1 text-sm text-slate-500">
            {currentUser?.name} · {currentUser && roleLabels[currentUser.role]}
          </p>
          <button
            className="secondary-button mt-5 w-full"
            onClick={() => void logout()}
          >
            <LogOut className="size-4" />
            Sign out safely
          </button>
        </section>
        <section className="surface p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <HelpCircle className="size-5 text-sky-600" />
            How do I know what to do?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Open an order and read the blue “What should happen next?” card.
            Only actions allowed for your role will be enabled.
          </p>
        </section>
        <section className="surface p-5">
          <h2 className="font-bold">Data source</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            All customers, orders, users, and activity come from MongoDB Atlas.
            There is no browser demo-data reset.
          </p>
        </section>
        <section className="surface p-5">
          <h2 className="font-bold">Image privacy</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Artwork uses private temporary links and is scheduled for deletion
            30 days after an order closes.
          </p>
        </section>
      </div>
    </>
  );
}

function ReviewPage() {
  const { token } = useParams();
  const [review, setReview] = useState<Awaited<
    ReturnType<typeof api.publicReview>
  > | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [name, setName] = useState("");
  const [decision, setDecision] = useState<
    "approved" | "changes_requested" | ""
  >("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (token)
      api
        .publicReview(token)
        .then(setReview)
        .catch((err) => setError(err.message))
        .finally(() => setBusy(false));
  }, [token]);
  const submit = async () => {
    if (!token || !decision) return;
    if (decision === "changes_requested" && reason.trim().length < 3)
      return toast("Explain what needs to change.", "error");
    setBusy(true);
    try {
      const result = await api.publicDecision(token, {
        decision,
        customerName: name,
        reason: reason || undefined,
      });
      setDone(result.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record decision.",
      );
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };
  if (busy && !review) return <LoadingScreen />;
  if (error && !review)
    return (
      <ServiceScreen message={error} retry={() => window.location.reload()} />
    );
  if (done)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
        <section className="surface max-w-md p-7 text-center">
          <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold">Thank you</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{done}</p>
          <p className="mt-4 text-xs text-slate-500">
            You may close this page.
          </p>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-7">
      <div className="mx-auto max-w-4xl">
        <Brand />
        <section className="surface mt-6 overflow-hidden">
          <div className="bg-navy-900 p-5 text-white">
            <p className="text-sm text-orange-300">
              Design approval · {review?.orderNumber}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              Please review design version {review?.version}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              {review?.customer} · {review?.product}
            </p>
          </div>
          <div className="p-4 md:p-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                className="mx-auto max-h-[60vh] w-auto object-contain"
                src={review?.imageUrl}
                alt={`Design version ${review?.version}`}
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">
              Pinch or open the image to zoom. Link expires{" "}
              {dateTime(review?.expiresAt)}.
            </p>
            <label className="label mt-5">Your name</label>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Person approving this design"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className={`min-h-14 rounded-xl border-2 p-3 font-bold ${decision === "approved" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white"}`}
                onClick={() => setDecision("approved")}
              >
                <CheckCircle2 className="mx-auto mb-1 size-5" />
                Approve Design
              </button>
              <button
                className={`min-h-14 rounded-xl border-2 p-3 font-bold ${decision === "changes_requested" ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 bg-white"}`}
                onClick={() => setDecision("changes_requested")}
              >
                <RefreshCw className="mx-auto mb-1 size-5" />
                Request Changes
              </button>
            </div>
            {decision === "changes_requested" && (
              <>
                <label className="label mt-4">What needs to change?</label>
                <textarea
                  className="field min-h-28 py-3"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Please explain clearly so the designer can update it"
                />
              </>
            )}
            <button
              className="primary-button mt-5 w-full"
              disabled={!decision || name.trim().length < 2}
              onClick={() => setConfirm(true)}
            >
              Review my decision
            </button>
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={confirm}
        title={
          decision === "approved"
            ? "Approve this design?"
            : "Send change request?"
        }
        message={
          decision === "approved"
            ? "After confirmation, the Design stage completes and Plate preparation can begin."
            : "Your reason will be sent to the designer, who will create a new version."
        }
        confirmLabel={
          decision === "approved"
            ? "Yes, approve design"
            : "Yes, request changes"
        }
        onCancel={() => setConfirm(false)}
        onConfirm={() => void submit()}
      />
    </main>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/55 p-3 sm:items-center"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <section
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy-900">{title}</h2>
          <button className="grid size-11 place-items-center" onClick={close}>
            <X />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}
function Field({
  name,
  label,
  type = "text",
  error,
  ...props
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  [key: string]: unknown;
}) {
  const errorId = `${name}-error`;
  return (
    <label>
      <span className="label mt-4">{label}</span>
      <input
        className={`field ${error ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100" : ""}`}
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && <span id={errorId} className="mt-1 block text-sm font-medium text-red-700">{error}</span>}
    </label>
  );
}
function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
      role="alert"
    >
      {children}
    </p>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}

function App() {
  const { currentUser, loading, serviceError, reload } = useApp();
  const location = useLocation();
  if (location.pathname.startsWith("/review/"))
    return (
      <Routes>
        <Route path="/review/:token" element={<ReviewPage />} />
      </Routes>
    );
  if (loading) return <LoadingScreen />;
  if (serviceError)
    return <ServiceScreen message={serviceError} retry={() => void reload()} />;
  if (!currentUser) return <LoginPage />;
  if (currentUser.mustChangePassword) return <PasswordChangePage />;
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<NewOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/customers/:id" element={<CustomerProfilePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/queue" element={<OrdersPage queue />} />
        <Route
          path="/team"
          element={
            currentUser.role === "admin" ? (
              <TeamPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
export default App;
