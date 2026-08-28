/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../lib/api";
import type { Customer, Order, StageKey, User } from "../types";

interface AppContextValue {
  currentUser: User | null;
  orders: Order[];
  customers: Customer[];
  users: User[];
  loading: boolean;
  serviceError: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  createCustomer: (
    data: Parameters<typeof api.createCustomer>[0],
  ) => Promise<Customer>;
  createOrder: (data: Parameters<typeof api.createOrder>[0]) => Promise<Order>;
  createUser: (data: Parameters<typeof api.createUser>[0]) => Promise<User>;
  updateStage: (
    order: Order,
    stage: StageKey,
    data: Parameters<typeof api.updateStage>[2],
  ) => Promise<Order>;
}

const AppContext = createContext<AppContextValue | null>(null);
// eslint-disable-next-line react-refresh/only-export-components
export const toast = (message: string, kind: "success" | "error" = "success") =>
  window.dispatchEvent(
    new CustomEvent("pb-toast", { detail: { message, kind } }),
  );

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const loadData = async (user: User) => {
    const canViewCustomers = [
      "admin",
      "order_manager",
      "accountant",
      "dispatch_manager",
    ].includes(user.role);
    const [orderData, customerData, userData] = await Promise.all([
      api.orders(),
      canViewCustomers ? api.customers() : Promise.resolve([]),
      user.role === "admin" ? api.users() : Promise.resolve([]),
    ]);
    setOrders(orderData);
    setCustomers(customerData);
    setUsers(userData);
  };
  const reload = async () => {
    setLoading(true);
    setServiceError(null);
    try {
      const user = await api.me();
      setCurrentUser(user);
      await loadData(user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        setCurrentUser(null);
      else
        setServiceError(
          error instanceof Error
            ? error.message
            : "The service is unavailable.",
        );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      currentUser,
      orders,
      customers,
      users,
      loading,
      serviceError,
      async login(email, password) {
        try {
          const user = await api.login(email, password);
          setCurrentUser(user);
          await loadData(user);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : "Sign in failed.";
        }
      },
      async logout() {
        try {
          await api.logout();
        } finally {
          setCurrentUser(null);
          setOrders([]);
          setCustomers([]);
          setUsers([]);
        }
      },
      reload,
      async createCustomer(data) {
        const item = await api.createCustomer(data);
        setCustomers((items) =>
          [...items, item].sort((a, b) =>
            a.companyName.localeCompare(b.companyName),
          ),
        );
        toast("Customer saved successfully.");
        return item;
      },
      async createOrder(data) {
        const item = await api.createOrder(data);
        setOrders((items) => [item, ...items]);
        toast(
          `${item.orderNumber} created. Material and Design teams can begin.`,
        );
        return item;
      },
      async createUser(data) {
        const item = await api.createUser(data);
        setUsers((items) =>
          [...items, item].sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast("Staff account created.");
        return item;
      },
      async updateStage(order, stage, data) {
        try {
          const updated = await api.updateStage(order, stage, data);
          setOrders((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          toast(
            "Order updated. The responsible teams can see the latest status.",
          );
          return updated;
        } catch (error) {
          toast(
            error instanceof Error ? error.message : "Update failed.",
            "error",
          );
          throw error;
        }
      },
    }),
    [currentUser, orders, customers, users, loading, serviceError],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be inside AppProvider");
  return value;
}
