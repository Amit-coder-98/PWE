import type {
  Customer,
  DesignAsset,
  Order,
  Role,
  StageKey,
  User,
} from "../types";

const base =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "";

function cookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
}

export class ApiError extends Error {
  status: number;
  fields: Array<{ field: string; message: string }>;
  constructor(
    status: number,
    body: {
      message?: string;
      fields?: Array<{ field: string; message: string }>;
    },
  ) {
    super(
      body.message ?? "The request could not be completed. Please try again.",
    );
    this.status = status;
    this.fields = body.fields ?? [];
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("x-csrf-token", decodeURIComponent(cookie("pb_csrf")));
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, {
      message:
        "Cannot reach the server. Check your internet connection and try again.",
    });
  }
  if (response.status === 401 && retry && path !== "/api/auth/login") {
    const refreshed = await fetch(`${base}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": decodeURIComponent(cookie("pb_csrf")) },
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }
  if (!response.ok)
    throw new ApiError(
      response.status,
      await response.json().catch(() => ({})),
    );
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  health: () =>
    request<{ status: string; database: string; storage: string }>(
      "/api/health",
    ),
  me: () => request<User>("/api/auth/me"),
  login: (email: string, password: string) =>
    request<User>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false,
    ),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  users: () => request<User[]>("/api/users"),
  createUser: (data: {
    name: string;
    email: string;
    role: Role;
    department: string;
    temporaryPassword: string;
  }) =>
    request<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User>) =>
    request<User>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    request<{ message: string }>(`/api/users/${id}`, { method: "DELETE" }),
  resetPassword: (id: string, temporaryPassword: string) =>
    request<{ message: string }>(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ temporaryPassword }),
    }),
  customers: (search = "") =>
    request<Customer[]>(`/api/customers?search=${encodeURIComponent(search)}`),
  createCustomer: (
    data: Omit<Customer, "id" | "active" | "createdAt" | "updatedAt">,
  ) =>
    request<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomer: (
    id: string,
    data: Omit<Customer, "id" | "active" | "createdAt" | "updatedAt">,
  ) =>
    request<Customer>(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  orders: (search = "", stage = "") =>
    request<Order[]>(
      `/api/orders?search=${encodeURIComponent(search)}${stage ? `&stage=${stage}` : ""}`,
    ),
  order: (id: string) => request<Order>(`/api/orders/${id}`),
  createOrder: (data: {
    customerId: string;
    product: string;
    quantity: number;
    amount: number;
    expectedDelivery: string;
    priority: string;
    notes?: string;
  }) =>
    request<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  cancelOrder: (order: Order, reason: string) =>
    request<Order>(`/api/orders/${order.id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason, expectedVersion: order.version }),
    }),
  updateStage: (
    order: Order,
    stage: StageKey,
    data: {
      action: string;
      completedQuantity?: number;
      note?: string;
      data?: Record<string, unknown>;
    },
  ) =>
    request<Order>(`/api/orders/${order.id}/stages/${stage}`, {
      method: "POST",
      body: JSON.stringify({ ...data, expectedVersion: order.version }),
    }),
  noImage: (order: Order, note: string) =>
    request<Order>(`/api/orders/${order.id}/design/no-image`, {
      method: "POST",
      body: JSON.stringify({ note, expectedVersion: order.version }),
    }),
  uploadIntent: (orderId: string, file: File) =>
    request<{ asset: DesignAsset; uploadUrl: string }>(
      `/api/orders/${orderId}/design-assets/upload-intent`,
      {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      },
    ),
  uploadToR2: async (
    url: string,
    file: File,
    onProgress: (percent: number) => void,
  ) => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error("Image upload failed. Please try again."));
      xhr.onerror = () =>
        reject(new Error("Image upload failed. Check your connection."));
      xhr.send(file);
    });
  },
  completeUpload: (assetId: string) =>
    request<DesignAsset>(`/api/design-assets/${assetId}/complete`, {
      method: "POST",
    }),
  viewAsset: (assetId: string) =>
    request<{ url: string }>(`/api/design-assets/${assetId}/view-url`),
  reviewLink: (orderId: string, assetId: string) =>
    request<{ token: string; path: string; expiresAt: string }>(
      `/api/orders/${orderId}/design/review-link`,
      { method: "POST", body: JSON.stringify({ assetId }) },
    ),
  staffDecision: (
    orderId: string,
    data: {
      assetId: string;
      decision: string;
      channel: string;
      customerName: string;
      reason?: string;
    },
  ) =>
    request<{ message: string }>(
      `/api/orders/${orderId}/design/staff-decision`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  publicReview: (token: string) =>
    request<{
      orderNumber: string;
      customer: string;
      product: string;
      version: number;
      fileName: string;
      imageUrl: string;
      expiresAt: string;
    }>(`/api/public/reviews/${token}`),
  publicDecision: (
    token: string,
    data: { decision: string; customerName: string; reason?: string },
  ) =>
    request<{ message: string }>(
      `/api/public/reviews/${token}/decision`,
      { method: "POST", body: JSON.stringify(data) },
      false,
    ),
};
