const API_BASE = window.FOCUSFLOW_API_URL || "http://localhost:3001";

async function parseResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Error del servidor (HTTP ${res.status})`);
  }
  return data;
}

export const taskApi = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters.categoria) params.set("categoria", filters.categoria);
    if (filters.estado) params.set("estado", filters.estado);
    if (filters.favorito) params.set("favorito", "true");
    if (filters.q) params.set("q", filters.q);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/tasks${query}`);
    return parseResponse(res);
  },

  async summary() {
    const res = await fetch(`${API_BASE}/api/tasks/summary`);
    return parseResponse(res);
  },

  async create(payload) {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return parseResponse(res);
  },

  async update(id, patch) {
    const res = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    return parseResponse(res);
  },

  async remove(id) {
    const res = await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return parseResponse(res);
  }
};
