import { taskApi } from "./services/taskApi.js";

const state = {
  tasks: [],
  summary: null,
  status: "loading", // loading | error | empty | success
  errorMessage: "",
  editingId: null,
  filters: {
    q: "",
    categoria: "",
    estado: "",
    favorito: false
  }
};

const els = {
  summaryGrid: document.getElementById("summary-grid"),
  form: document.getElementById("task-form"),
  formTitle: document.getElementById("form-title"),
  formError: document.getElementById("form-error"),
  submitBtn: document.getElementById("submit-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  titulo: document.getElementById("titulo"),
  descripcion: document.getElementById("descripcion"),
  categoria: document.getElementById("categoria"),
  bloquesEstimados: document.getElementById("bloquesEstimados"),
  fechaLimite: document.getElementById("fechaLimite"),
  favorito: document.getElementById("favorito"),
  filterSearch: document.getElementById("filter-search"),
  filterCategory: document.getElementById("filter-category"),
  filterStatus: document.getElementById("filter-status"),
  filterFav: document.getElementById("filter-fav"),
  taskListContainer: document.getElementById("task-list-container")
};

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummary() {
  if (!state.summary) return;
  const { tareasPendientes, tareasCompletadas, minutosEstimadosPendientes, tareasVencidas } = state.summary;

  els.summaryGrid.innerHTML = `
    <article class="stat-card">
      <span class="stat-label">Pendientes</span>
      <strong class="stat-value">${tareasPendientes}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">Completadas</span>
      <strong class="stat-value">${tareasCompletadas}</strong>
    </article>
    <article class="stat-card">
      <span class="stat-label">Minutos estimados</span>
      <strong class="stat-value">${minutosEstimadosPendientes} min</strong>
    </article>
    <article class="stat-card ${tareasVencidas > 0 ? "stat-card--alert" : ""}">
      <span class="stat-label">Vencidas (AR)</span>
      <strong class="stat-value">${tareasVencidas}</strong>
    </article>
  `;
}

function nextStatus(current) {
  if (current === "pendiente") return "en_progreso";
  if (current === "en_progreso") return "completada";
  return "pendiente";
}

function formatStatusLabel(status) {
  if (status === "en_progreso") return "En progreso";
  if (status === "completada") return "Completada";
  return "Pendiente";
}

function renderTasks() {
  if (state.status === "loading") {
    els.taskListContainer.innerHTML = `<div class="state-box">Cargando tareas desde el backend...</div>`;
    return;
  }

  if (state.status === "error") {
    els.taskListContainer.innerHTML = `
      <div class="state-box state-box--error">
        <p>${escapeHtml(state.errorMessage)}</p>
        <button type="button" id="retry-btn" class="btn btn-primary">Reintentar</button>
      </div>
    `;
    document.getElementById("retry-btn")?.addEventListener("click", loadData);
    return;
  }

  if (state.status === "empty" || state.tasks.length === 0) {
    els.taskListContainer.innerHTML = `
      <div class="state-box">No hay tareas para mostrar con los filtros actuales. Creá tu primera tarea desde el formulario.</div>
    `;
    return;
  }

  els.taskListContainer.innerHTML = state.tasks
    .map(
      (task) => `
      <article class="task-card ${task.estado === "completada" ? "task-card--done" : ""}" data-id="${escapeHtml(task.id)}">
        <div class="task-card__header">
          <div>
            <h3>${escapeHtml(task.titulo)}</h3>
            <div class="badges">
              <span class="badge">${escapeHtml(task.categoria.toUpperCase())}</span>
              <span class="badge badge--status">${formatStatusLabel(task.estado)}</span>
              <span class="badge">${task.bloquesEstimados} bloques (${task.bloquesEstimados * 25} min)</span>
              ${task.fechaLimite ? `<span class="badge ${task.estaVencida ? "badge--danger" : ""}">Vence: ${escapeHtml(task.fechaLimite)}</span>` : ""}
              ${task.estaVencida ? `<span class="badge badge--danger">VENCIDA</span>` : ""}
            </div>
          </div>
          <button type="button" class="btn-icon" data-action="fav" title="Favorito">
            ${task.favorito ? "★" : "☆"}
          </button>
        </div>
        ${task.descripcion ? `<p class="task-desc">${escapeHtml(task.descripcion)}</p>` : ""}
        <div class="task-actions">
          <button type="button" class="btn btn-secondary" data-action="status">Avanzar estado</button>
          <button type="button" class="btn btn-secondary" data-action="edit">Editar</button>
          <button type="button" class="btn btn-danger" data-action="delete">Eliminar</button>
        </div>
      </article>
    `
    )
    .join("");
}

async function loadData() {
  state.status = "loading";
  state.errorMessage = "";
  renderTasks();

  try {
    const [page, summary] = await Promise.all([taskApi.list(state.filters), taskApi.summary()]);
    state.tasks = page.items;
    state.summary = summary;
    state.status = state.tasks.length === 0 ? "empty" : "success";
  } catch (error) {
    state.status = "error";
    state.errorMessage = error instanceof Error ? error.message : "No se pudo conectar con el servidor.";
  }

  renderSummary();
  renderTasks();
}

function resetForm() {
  state.editingId = null;
  els.form.reset();
  els.bloquesEstimados.value = "2";
  els.formTitle.textContent = "Nueva tarea de estudio";
  els.submitBtn.textContent = "Guardar tarea";
  els.cancelEditBtn.hidden = true;
  els.formError.textContent = "";
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.formError.textContent = "";

  const payload = {
    titulo: els.titulo.value.trim(),
    descripcion: els.descripcion.value.trim(),
    categoria: els.categoria.value,
    bloquesEstimados: Number(els.bloquesEstimados.value),
    fechaLimite: els.fechaLimite.value,
    favorito: els.favorito.checked
  };

  if (payload.titulo.length < 3) {
    els.formError.textContent = "El titulo debe tener al menos 3 caracteres.";
    return;
  }

  try {
    if (state.editingId) {
      await taskApi.update(state.editingId, payload);
    } else {
      await taskApi.create(payload);
    }
    resetForm();
    await loadData();
  } catch (error) {
    els.formError.textContent = error instanceof Error ? error.message : "Error al guardar la tarea.";
  }
});

els.cancelEditBtn.addEventListener("click", resetForm);

els.taskListContainer.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const card = btn.closest(".task-card");
  const id = card?.dataset.id;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;

  const action = btn.dataset.action;

  try {
    if (action === "fav") {
      await taskApi.update(id, { favorito: !task.favorito });
      await loadData();
    } else if (action === "status") {
      await taskApi.update(id, { estado: nextStatus(task.estado) });
      await loadData();
    } else if (action === "edit") {
      state.editingId = id;
      els.titulo.value = task.titulo;
      els.descripcion.value = task.descripcion;
      els.categoria.value = task.categoria;
      els.bloquesEstimados.value = String(task.bloquesEstimados);
      els.fechaLimite.value = task.fechaLimite;
      els.favorito.checked = task.favorito;
      els.formTitle.textContent = "Editar tarea";
      els.submitBtn.textContent = "Actualizar tarea";
      els.cancelEditBtn.hidden = false;
      els.titulo.focus();
    } else if (action === "delete") {
      if (window.confirm(`¿Eliminar la tarea "${task.titulo}"?`)) {
        await taskApi.remove(id);
        await loadData();
      }
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "No se pudo completar la accion.");
  }
});

els.filterSearch.addEventListener("input", (e) => {
  state.filters.q = e.target.value;
  loadData();
});
els.filterCategory.addEventListener("change", (e) => {
  state.filters.categoria = e.target.value;
  loadData();
});
els.filterStatus.addEventListener("change", (e) => {
  state.filters.estado = e.target.value;
  loadData();
});
els.filterFav.addEventListener("change", (e) => {
  state.filters.favorito = e.target.checked;
  loadData();
});

loadData();
