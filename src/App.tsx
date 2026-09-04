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
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  ClipboardList,
  Eye,
  Factory,
  HelpCircle,
  ImagePlus,
  LayoutDashboard,
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
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <section className="surface max-w-md p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle />
        </span>
        <h1 className="mt-4 text-xl font-bold text-navy-900">
          Service temporarily unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
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
  { to: "/", label: "Dashboard", mr: "मुख्यपृष्ठ", icon: LayoutDashboard },
  { to: "/orders", label: "Orders", mr: "ऑर्डर", icon: ClipboardList },
  { to: "/customers", label: "Customers", mr: "ग्राहक", icon: Building2 },
  { to: "/queue", label: "My Work", mr: "माझे काम", icon: Factory },
  { to: "/team", label: "Team", mr: "टीम", icon: Users },
  { to: "/more", label: "More", mr: "अधिक", icon: Menu },
];
function Shell({ children }: { children: ReactNode }) {
  const { currentUser, orders, logout } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [lang, setLang] = useState<"en" | "mr">(() =>
    localStorage.getItem("pb-language") === "mr" ? "mr" : "en",
  );
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
  const toggleLanguage = () => {
    const next = lang === "en" ? "mr" : "en";
    setLang(next);
    localStorage.setItem("pb-language", next);
  };
  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-20 md:pb-0">
      <ToastHost />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 p-4 text-white md:flex">
        <Link to="/" className="min-h-14">
          <Brand light />
        </Link>
        <nav className="mt-8 space-y-1">
          {visibleNav
            .filter((item) => item.to !== "/more")
            .map(({ to, label, mr, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? "bg-white text-navy-900" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
                }
              >
                <Icon className="size-5" />
                {lang === "mr" ? mr : label}
              </NavLink>
            ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/10 p-3">
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
            className="mt-3 min-h-11 w-full rounded-lg text-left text-sm font-semibold text-slate-300 hover:bg-white/10"
            onClick={toggleLanguage}
          >
            {lang === "en" ? "मराठीमध्ये पहा" : "View in English"}
          </button>
          <button
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => setLogoutConfirm(true)}
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <button
            className="grid size-11 place-items-center rounded-xl border border-slate-200 md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-slate-500">
              {currentUser.department}
            </p>
            <p className="font-bold text-navy-900">
              {lang === "mr"
                ? `नमस्कार, ${currentUser.name.split(" ")[0]}`
                : `Good day, ${currentUser.name.split(" ")[0]}`}
            </p>
          </div>
          <Link
            to="/orders"
            className="relative ml-auto grid size-11 place-items-center rounded-xl border border-slate-200"
            aria-label={`${issues} alerts`}
          >
            <Bell className="size-5" />
            {issues > 0 && (
              <span className="absolute right-1 top-1 size-2.5 rounded-full bg-red-500" />
            )}
          </Link>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-7" id="main-content">
          {children}
        </main>
      </div>
      <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${isSimpleWorker ? "grid-cols-3" : "grid-cols-5"} border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(15,23,42,.08)] md:hidden`}>
        {mobileNav.slice(0, isSimpleWorker ? 2 : 4).map(({ to, label, mr, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold ${isActive ? "text-brand" : "text-slate-500"}`
            }
          >
            <Icon className="size-5" />
            {lang === "mr" ? mr : label}
          </NavLink>
        ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold ${isActive ? "text-brand" : "text-slate-500"}`
          }
        >
          <Menu className="size-5" />
          {lang === "mr" ? "अधिक" : "More"}
        </NavLink>
      </nav>
      {drawer && (
        <div
          className="fixed inset-0 z-50 bg-navy-950/50 md:hidden"
          onClick={() => setDrawer(false)}
        >
          <aside
            className="h-full w-[86%] max-w-xs bg-white p-4"
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
            <nav className="mt-6 space-y-2">
              {visibleNav.map(({ to, label, mr, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setDrawer(false)}
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 font-semibold"
                >
                  <Icon className="size-5" />
                  {lang === "mr" ? mr : label}
                </NavLink>
              ))}
            </nav>
            <button
              className="secondary-button mt-6 w-full"
              onClick={toggleLanguage}
            >
              {lang === "en" ? "मराठी" : "English"}
            </button>
            <button
              className="secondary-button mt-3 w-full text-red-700"
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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-1">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>
      {action}
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
  const { currentUser, orders } = useApp();
  if (!currentUser) return null;
  if (currentUser.role !== "admin")
    return <WorkerHome />;
  const relevant = Object.entries(stageInfo).find(
    ([, info]) => info.role === operatingRole(currentUser.role),
  )?.[0] as StageKey | undefined;
  const myQueue =
    currentUser.role === "admin"
      ? orders
      : orders.filter(
          (order) =>
            relevant &&
            ["ready", "in_progress", "blocked", "issue"].includes(
              order.stages[relevant].status,
            ),
        );
  const issues = orders.filter((order) =>
    Object.values(order.stages).some((state) =>
      ["blocked", "issue"].includes(state.status),
    ),
  ).length;
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
            : `${currentUser.department} workspace`
        }
        description="Urgent work appears first. Open an order to see exactly what happened and what should happen next."
        action={
          currentUser.role === "admin" ? (
            <Link className="primary-button" to="/orders/new">
              <Plus className="size-4" />
              Create order
            </Link>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total orders" value={orders.length} />
        <Kpi
          label="Active"
          value={orders.filter((o) => o.status === "active").length}
        />
        <Kpi label="Need attention" value={issues} danger={issues > 0} />
        <Kpi label="My queue" value={myQueue.length} />
      </div>
      {currentUser.role === "admin" && (
        <section className="surface mt-5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Live work by department</h2>
              <p className="text-sm text-slate-500">Open a department to see the orders waiting there.</p>
            </div>
            <Link className="text-sm font-bold text-brand" to="/orders">All orders</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {liveDepartments.map((stage) => {
              const count = orders.filter((order) => activeOrderStages(order).includes(stage)).length;
              const visual = roleVisuals[stageInfo[stage].role];
              const DepartmentIcon = visual.icon;
              return (
                <Link key={stage} to={`/orders?stage=${stage}`} className="rounded-xl border border-slate-200 p-3 transition hover:border-sky-400 hover:bg-sky-50">
                  <div className="flex items-center gap-2">
                    <span className={`grid size-8 place-items-center rounded-lg ${visual.soft} ${visual.color}`}>
                      <DepartmentIcon className="size-4" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-bold text-navy-900">{stageInfo[stage].short}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{roleLabels[stageInfo[stage].role]}</p>
                  <p className="mt-2 text-xl font-extrabold text-brand">{count}</p>
                </Link>
              );
            })}
            {!liveDepartments.length && <p className="col-span-full rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No active orders yet.</p>}
          </div>
        </section>
      )}
      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy-900">
              {currentUser.role === "admin"
                ? "Recently updated orders"
                : "Work waiting for me"}
            </h2>
            <p className="text-sm text-slate-500">
              Only real records from Atlas appear here.
            </p>
          </div>
          <Link className="text-sm font-bold text-brand" to="/queue">
            Open queue
          </Link>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {myQueue.slice(0, 6).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
          {myQueue.length === 0 && (
            <Empty
              title={orders.length ? "Your queue is clear" : "No orders yet"}
              text={
                orders.length
                  ? "There is no work waiting for your department."
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
  const myStage = Object.entries(stageInfo).find(
    ([, info]) => info.role === operatingRole(currentUser.role),
  )?.[0] as StageKey | undefined;
  const tasks = myStage
    ? orders.filter((order) =>
        ["ready", "in_progress", "blocked", "issue"].includes(
          order.stages[myStage].status,
        ),
      )
    : [];
  const firstTask = tasks[0];
  return (
    <>
      <Heading
        eyebrow="My work today"
        title={`Hello, ${currentUser.name.split(" ")[0]}`}
        description="Open the first task, complete your part, then the next team is informed automatically."
      />
      {firstTask ? (
        <section className="rounded-2xl bg-navy-900 p-5 text-white shadow-lg">
          <p className="text-sm font-semibold text-sky-200">Your next task</p>
          <h2 className="mt-2 text-2xl font-extrabold">{stageInfo[myStage!].label}</h2>
          <p className="mt-3 text-base text-slate-200">{firstTask.orderNumber} · {firstTask.customer}</p>
          <p className="mt-1 text-sm text-slate-300">{firstTask.product} · {firstTask.quantity.toLocaleString("en-IN")} bags</p>
          <Link className="primary-button mt-5" to={`/orders/${firstTask.id}?stage=${myStage}`}>
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
            {tasks.slice(1, 4).map((order) => (
              <Link key={order.id} to={`/orders/${order.id}?stage=${myStage}`} className="surface flex min-h-16 items-center justify-between p-4">
                <span><strong className="block">{order.orderNumber}</strong><span className="text-sm text-slate-500">{order.customer}</span></span>
                <ChevronRight className="size-5 text-slate-400" />
              </Link>
            ))}
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
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-extrabold ${danger ? "text-red-600" : "text-navy-900"}`}
      >
        {value}
      </p>
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
        className="field pr-12"
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

function OrdersPage({ queue = false }: { queue?: boolean }) {
  const { orders, currentUser } = useApp();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageKey | "all">(() => {
    const value = searchParams.get("stage");
    return value && value in stageInfo ? (value as StageKey) : "all";
  });
  const relevant = currentUser
    ? (Object.entries(stageInfo).find(
      ([, info]) => info.role === operatingRole(currentUser.role),
    )?.[0] as StageKey | undefined)
    : undefined;
  const isAdmin = currentUser?.role === "admin";
  const canBookOrders = ["admin", "marketing"].includes(
    currentUser?.role ?? "",
  );
  const source = !isAdmin
    ? orders.filter((order) => relevant && activeOrderStages(order).includes(relevant))
    : orders;
  const result = source.filter(
    (order) =>
      `${order.orderNumber} ${order.customer} ${order.product} ${order.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (stage === "all" || activeOrderStages(order).includes(stage)),
  );
  return (
    <>
      <Heading
        eyebrow={isAdmin ? "Order register" : "My work"}
        title={isAdmin ? "Orders" : `${roleLabels[operatingRole(currentUser!.role)]} work`}
        description={
          isAdmin
            ? "Search by customer name and see which department is working on every order."
            : "Only orders waiting for your department are shown here."
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
      <section className="surface mb-4 p-3">
        <SearchField
          id="order-search"
          label="Search orders"
          placeholder={isAdmin ? "Search order number, customer name, product or phone…" : "Search your order by customer or order number…"}
          value={search}
          onChange={setSearch}
        />
        {isAdmin ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter orders by current department">
          <button className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold ${stage === "all" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700"}`} onClick={() => setStage("all")}>
            All ({source.length})
          </button>
          {productionStages.map((key) => {
            const count = source.filter((order) => activeOrderStages(order).includes(key)).length;
            return (
              <button
                className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-bold ${stage === key ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700"}`}
                key={key}
                onClick={() => setStage(key)}
              >
                {stageInfo[key].short} ({count})
              </button>
            );
          })}
        </div> : <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">Showing {source.length} order{source.length === 1 ? "" : "s"} for {roleLabels[operatingRole(currentUser!.role)]}.</p>}
      </section>
      <section className="surface overflow-hidden">
        <div className="hidden grid-cols-[170px_minmax(260px,1.7fr)_minmax(240px,1.2fr)_130px_80px] gap-5 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
          <span>Order</span><span>Customer & bag</span><span>Current work</span><span>Due date</span><span>Action</span>
        </div>
        {result.map((order) => (
          <OrderListRow key={order.id} order={order} assignedStage={isAdmin ? undefined : relevant} />
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

function OrderListRow({ order, assignedStage }: { order: Order; assignedStage?: StageKey }) {
  const liveStages = activeOrderStages(order);
  const displayedStages = assignedStage ? liveStages.filter((stage) => stage === assignedStage) : liveStages;
  const activeLabel = displayedStages.length === 1
    ? `${stageInfo[displayedStages[0]].short} is ready`
    : `${displayedStages.length} tasks are ready`;
  return (
    <Link
      to={`/orders/${order.id}${assignedStage ? `?stage=${assignedStage}` : ""}`}
      className="group block border-b-2 border-slate-100 px-4 py-3 transition hover:bg-sky-50 focus:bg-sky-50 xl:grid xl:min-h-24 xl:grid-cols-[170px_minmax(260px,1.7fr)_minmax(240px,1.2fr)_130px_80px] xl:items-center xl:gap-5 xl:px-5 xl:py-4"
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
        <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-navy-900">{order.customer}</p>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {order.product} · {order.quantity.toLocaleString("en-IN")} bags
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-brand" aria-label="Open order">
            <ChevronRight className="size-5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
        {order.priority !== "normal" && (
          <div className="mt-2">
            <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold capitalize text-orange-700">
              {order.priority} priority
            </span>
          </div>
        )}
        {displayedStages.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">No work is waiting</p>
        )}
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
        <div className="min-w-0 border-l border-slate-100 pl-5">
          <p className="truncate font-bold text-navy-900">{order.customer}</p>
          <p className="mt-1 truncate text-sm text-slate-600">
            {order.product} · {order.quantity.toLocaleString("en-IN")} bags
          </p>
        </div>
        <div className="border-l border-slate-100 pl-5">
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
        <div className="border-l border-slate-100 pl-5">
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const permitted = ["admin", "marketing"].includes(currentUser?.role ?? "");
  const filtered = customers.filter((c) =>
    `${c.companyName} ${c.contactPerson} ${c.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
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
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer) => (
          <article className="surface p-4" key={customer.id}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 font-bold text-sky-700">
                {customer.companyName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-bold text-navy-900">
                  {customer.companyName}
                </h2>
                <p className="text-sm text-slate-500">
                  {customer.contactPerson}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <p>
                <b className="text-slate-500">Phone:</b> {customer.phone}
              </p>
              <p className="truncate">
                <b className="text-slate-500">Email:</b>{" "}
                {customer.email || "Not provided"}
              </p>
              <p className="line-clamp-2">
                <b className="text-slate-500">Address:</b> {customer.address}
              </p>
            </dl>
            {permitted && (
              <button
                className="secondary-button mt-4 w-full"
                onClick={() => {
                  setEditing(customer);
                  setOpen(true);
                }}
              >
                Edit customer details
              </button>
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <Empty
            title="No customers yet"
            text="Add the first real customer before creating an order."
          />
        )}
      </div>
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
              label="Phone number"
              defaultValue={editing?.phone}
              required
            />
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
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const order = await createOrder({
        customerId: selectedCustomer.id,
        product: String(form.get("product")),
        quantity: Number(form.get("quantity")),
        amount: Number(form.get("amount")),
        expectedDelivery: String(form.get("expectedDelivery")),
        priority: String(form.get("priority")),
        notes: String(form.get("notes")) || undefined,
      });
      navigate(`/orders/${order.id}`);
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
        eyebrow="Order booking"
        title="Create a new order"
        description="Only essential information is required. Material and Design teams are notified after confirmation."
      />
      <form className="surface mx-auto max-w-3xl p-5 md:p-7" onSubmit={submit}>
        <section>
          <h2 className="text-lg font-bold text-navy-900">1. Customer</h2>
          <label className="label mt-4" htmlFor="customer-search">
            Search and choose customer
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="customer-search"
              className="field pl-12 pr-12"
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
            <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Selected: {selectedCustomer.companyName}
            </p>
          )}
        </section>
        <section className="mt-7 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-navy-900">
            2. Bag specification
          </h2>
          <Field
            name="product"
            label="Bag product / description"
            placeholder="Example: 25 kg printed woven fertilizer bag"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="quantity"
              label="Quantity"
              type="number"
              min="1"
              required
            />
            <Field
              name="amount"
              label="Order value (₹)"
              type="number"
              min="0"
              required
            />
          </div>
        </section>
        <section className="mt-7 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-bold text-navy-900">3. Delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="expectedDelivery"
              label="Expected delivery"
              type="date"
              required
            />
            <label>
              <span className="label mt-4">Priority</span>
              <select className="field" name="priority">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <label className="label mt-4">Notes (optional)</label>
          <textarea
            className="field min-h-24 py-3"
            name="notes"
            placeholder="Important customer or production instructions"
          />
        </section>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="mt-7 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          <strong>After creation:</strong> Material and Design become ready in
          parallel. No image is required at order booking.
        </div>
        <button className="primary-button mt-5 w-full" disabled={busy}>
          {busy ? "Creating order…" : "Confirm and create order"}
        </button>
      </form>
    </>
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
  const [pending, setPending] = useState<{
    action: string;
    title: string;
    message: string;
  } | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(!order);
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
  const consequence = (stage: StageKey, action: string) => {
    const next: Partial<Record<StageKey, string>> = {
      material: "Cutting",
      design: "Plate preparation",
      cutting: "Printing when Plate is also complete",
      plate: "Printing when Cutting is also complete",
      printing: "Stitching",
      stitching: "Packing",
      packing: "Delivery Challan",
      dc: "Billing",
      billing: "Payment and Dispatch",
      payment: "Delivery after Dispatch",
      dispatch: "Delivery after Payment",
      delivery: "order completion and 30-day image retention",
      return: "Refund",
      refund: "case closure",
    };
    return action === "complete"
      ? `Complete ${stageInfo[stage].short}? This will make ${next[stage] ?? "the next work"} ready.`
      : action === "start"
        ? `Start ${stageInfo[stage].short}? Everyone will see this step as In progress.`
        : action === "block"
          ? `Report this issue? Production will pause at ${stageInfo[stage].short} until it is resolved.`
          : `Resolve this issue? The responsible team will be able to continue.`;
  };
  const ask = (action: string) => {
    if (!selected) return;
    if (selected === "material" && action === "complete") {
      const form = document.querySelector(`[data-stage-form="material"]`);
      const required = Number((form?.querySelector('[name="requiredQuantity"]') as HTMLInputElement | null)?.value);
      const available = Number((form?.querySelector('[name="availableQuantity"]') as HTMLInputElement | null)?.value);
      if (required <= 0 || available < 0)
        return toast("Enter the required and available material quantities first.", "error");
      if (available < required)
        return toast("Material is short. Use ‘Report an issue’ so Admin can arrange stock.", "error");
    }
    if (selected === "printing" && action === "complete") {
      const qualityCheck = document.querySelector('[data-stage-form="printing"] [name="qualityChecked"]') as HTMLInputElement | null;
      if (!qualityCheck?.checked)
        return toast("Quality check is not passed. Report an issue before finishing printing.", "error");
    }
    if (action === "block" && note.trim().length < 3)
      return toast("Explain the issue before reporting it.", "error");
    setPending({
      action,
      title: `${action === "complete" ? "Complete" : action === "start" ? "Start" : action === "block" ? "Report issue for" : "Resolve"} ${stageInfo[selected].short}?`,
      message: consequence(selected, action),
    });
  };
  const execute = async () => {
    if (!pending || !selected) return;
    try {
      const updated = await updateStage(order, selected, {
        action: pending.action,
        note: note || undefined,
        data: stageData(selected),
      });
      setOrder(updated);
      setSelected(null);
      setPending(null);
      setNote("");
    } catch {
      setPending(null);
    }
  };
  const progress = async () => {
    if (!selected || quantity === "") return;
    try {
      const updated = await updateStage(order, selected, {
        action: "progress",
        completedQuantity: quantity,
        note: note || undefined,
        data: stageData(selected),
      });
      setOrder(updated);
    } catch {
      /* toast is shown by context */
    }
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
  const stageData = (stage: StageKey) => {
    const result: Record<string, unknown> = {};
    document
      .querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(`[data-stage-form="${stage}"] [name]`)
      .forEach((element) => {
        result[element.name] =
          element.type === "number"
            ? Number(element.value)
            : element.type === "checkbox"
              ? (element as HTMLInputElement).checked
              : element.value;
      });
    return result;
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
            setQuantity(
              order.stages[order.currentStage].completedQuantity ?? "",
            );
          }}
        >
          {canManageStage(currentUser.role, order.currentStage)
            ? "Open next action"
            : `View ${roleLabels[stageInfo[order.currentStage].role]} step`}
          <ChevronRight className="size-4" />
        </button>
      </section>
      {currentUser.role === "designer" && (
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
            <div className="mt-4">
              <StatusBadge status={state.status} />
            </div>
            <p className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">
              {stageInfo[selected].help}
            </p>
            <StageFields
              stage={selected}
              quantity={quantity}
              setQuantity={setQuantity}
              note={note}
              setNote={setNote}
              order={order}
            />
            {!manage && (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>View only:</strong> This step belongs to{" "}
                {roleLabels[stageInfo[selected].role]}.
              </p>
            )}
            <div className="mt-6 space-y-3">
              {manage && state.status === "ready" && (
                <button
                  className="primary-button w-full"
                  onClick={() => ask("start")}
                >
                  Start this work
                </button>
              )}
              {manage && state.status === "in_progress" && selected === "design" && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                  <strong>Finish design in the Design approval section.</strong>
                  <br />Choose <em>No customer image</em>, or upload the design and send it to the customer for approval. Design is completed only after that approval.
                  <button
                    className="primary-button mt-3 w-full"
                    onClick={() => {
                      setSelected(null);
                      window.setTimeout(() => document.getElementById("design-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                    }}
                  >
                    Continue to design approval
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
              {manage &&
                state.status === "in_progress" &&
                selected !== "design" && (
                  <>
                    <button
                      className="secondary-button w-full"
                      onClick={progress}
                    >
                      Save completed quantity
                    </button>
                    <button
                      className="primary-button w-full"
                      onClick={() => ask("complete")}
                    >
                      Finish my work
                    </button>
                    <button
                      className="secondary-button w-full !border-red-200 !text-red-700"
                      onClick={() => ask("block")}
                    >
                      Report an issue
                    </button>
                  </>
                )}
              {manage && ["blocked", "issue"].includes(state.status) && (
                <button
                  className="primary-button w-full"
                  onClick={() => ask("resolve")}
                >
                  Resolve issue
                </button>
              )}
              <button
                className="secondary-button w-full"
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        message={pending?.message ?? ""}
        confirmLabel={`Yes, ${pending?.action ?? "continue"}`}
        onCancel={() => setPending(null)}
        onConfirm={() => void execute()}
      />
      <ConfirmDialog
        open={cancelPending}
        title="Cancel this entire order?"
        message="Production will stop, active customer review links will be revoked, and private artwork will be scheduled for deletion after 30 days. This action is recorded in the activity history."
        confirmLabel="Yes, cancel this order"
        onCancel={() => setCancelPending(false)}
        onConfirm={() => void cancelOrder()}
      />
    </>
  );
}

function StageFields({
  stage,
  quantity,
  setQuantity,
  note,
  setNote,
  order,
}: {
  stage: StageKey;
  quantity: number | "";
  setQuantity: (value: number | "") => void;
  note: string;
  setNote: (value: string) => void;
  order: Order;
}) {
  const quantityStages = ["cutting", "printing", "stitching", "packing"];
  return (
    <div className="mt-5" data-stage-form={stage}>
      {quantityStages.includes(stage) && (
        <>
          <label className="label">Completed quantity</label>
          <div className="flex min-h-16 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 focus-within:border-sky-500">
            <button type="button" className="min-w-16 border-r border-slate-200 text-3xl font-bold text-navy-900 hover:bg-slate-100" aria-label="Decrease completed quantity by 10" onClick={() => setQuantity(Math.max(0, Number(quantity || 0) - 10))}>−</button>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-center text-2xl font-extrabold text-navy-900 focus:ring-0"
              type="number"
              min="0"
              max={order.quantity}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value === "" ? "" : Number(event.target.value))}
            />
            <button type="button" className="min-w-16 border-l border-slate-200 text-3xl font-bold text-navy-900 hover:bg-slate-100" aria-label="Increase completed quantity by 10" onClick={() => setQuantity(Math.min(order.quantity, Number(quantity || 0) + 10))}>+</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Maximum {order.quantity.toLocaleString("en-IN")} bags
          </p>
        </>
      )}
      <DynamicFields stage={stage} />
      <label className="label mt-4">Note for the next team (optional)</label>
      <textarea
        className="field min-h-24 py-3"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Write helpful information for the next person"
      />
    </div>
  );
}
function DynamicFields({ stage }: { stage: StageKey }) {
  if (stage === "material")
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-bold text-amber-950">Material check</p>
        <p className="mt-1 text-sm text-amber-900">Count the available material before confirming. If it is less than required, report an issue instead.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field name="requiredQuantity" label="Required quantity" type="number" min="0" />
          <Field name="availableQuantity" label="Available quantity" type="number" min="0" />
        </div>
      </div>
    );
  if (stage === "printing")
    return (
      <>
        <Field name="machine" label="Printing machine" />
        <Field name="operatorNote" label="Print details" />
        <label className="mt-4 flex min-h-14 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span><strong className="block">Quality check passed</strong><span className="text-sm text-slate-500">Check print alignment and colour before finishing.</span></span>
          <input className="size-6 accent-emerald-600" name="qualityChecked" type="checkbox" defaultChecked />
        </label>
      </>
    );
  if (stage === "packing")
    return (
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field name="boxes" label="Number of boxes" type="number" min="0" />
        <Field name="weightKg" label="Weight (kg)" type="number" min="0" />
      </div>
    );
  if (stage === "dc") return <Field name="challanNumber" label="D.C. number" />;
  if (stage === "billing")
    return (
      <>
        <Field name="invoiceNumber" label="Invoice number" />
        <Field
          name="invoiceAmount"
          label="Invoice amount"
          type="number"
          min="0"
        />
      </>
    );
  if (stage === "payment")
    return (
      <>
        <Field name="paymentReference" label="Payment reference" />
        <Field name="paidAmount" label="Paid amount" type="number" min="0" />
      </>
    );
  if (stage === "dispatch")
    return (
      <>
        <Field name="transporter" label="Transporter" />
        <Field name="trackingNumber" label="Tracking number" />
      </>
    );
  if (stage === "return" || stage === "refund")
    return (
      <Field
        name="reference"
        label={`${stage === "return" ? "Return" : "Refund"} reference`}
      />
    );
  return null;
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
          <p className="eyebrow">Optional artwork</p>
          <h2 className="mt-1 text-xl font-bold text-navy-900">
            Design versions and approval
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose one: confirm no image was supplied, or upload a design version and send it for customer approval.
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
