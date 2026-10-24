// ==============================================================================
// LAYER: Frontend Client Logic Layer (Vanilla JavaScript)
// Description: Manages DOM manipulation, user interactions, local state,
//              and asynchronous fetch() calls to the Flask REST API endpoints.
//              Contains zero third-party framework dependencies.
// ==============================================================================

// Run script once DOM content is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ----------------------------------------------------------------------------
  // Application State
  // ----------------------------------------------------------------------------
  let tasks = [];               // In-memory cache of current tasks fetched from API
  let activeFilter = 'all';      // Active filter mode: 'all' | 'active' | 'done'

  // ----------------------------------------------------------------------------
  // DOM Element References
  // ----------------------------------------------------------------------------
  const taskListElement = document.getElementById('task-list');
  const emptyStateElement = document.getElementById('empty-state');
  const emptyStateTitle = document.getElementById('empty-state-title');
  const emptyStateDesc = document.getElementById('empty-state-desc');
  const loadingSpinner = document.getElementById('loading-spinner');
  
  const formElement = document.getElementById('new-task-form');
  const titleInputElement = document.getElementById('task-title-input');
  const dueDateInputElement = document.getElementById('task-due-date-input');
  const submitButtonElement = document.getElementById('add-task-btn');
  const formErrorBanner = document.getElementById('form-error-msg');

  const completedCountSpan = document.getElementById('completed-count');
  const totalCountSpan = document.getElementById('total-count');
  const progressPercentSpan = document.getElementById('progress-percent');
  const progressFillBar = document.getElementById('progress-fill');
  const progressBarContainer = document.getElementById('progress-bar-container');

  const filterButtons = document.querySelectorAll('.filter-tab');
  const badgeAll = document.getElementById('badge-all');
  const badgeActive = document.getElementById('badge-active');
  const badgeDone = document.getElementById('badge-done');
  const quickStatusText = document.getElementById('quick-status-text');
  const toastContainer = document.getElementById('toast-container');

  // ----------------------------------------------------------------------------
  // Toast Notification Helper
  // ----------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on toast type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    // Automatically remove toast element after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  // ----------------------------------------------------------------------------
  // Helper: HTML Escaper to Prevent XSS
  // ----------------------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ----------------------------------------------------------------------------
  // Helper: Format Due Date & Calculate Urgency Status
  // ----------------------------------------------------------------------------
  function formatDueDate(dueDateStr) {
    if (!dueDateStr) return null;
    
    // Parse target date and compare with today's midnight timestamp
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return { text: dueDateStr, statusClass: '' };

    const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    targetDate.setHours(0, 0, 0, 0);

    // Format human-readable string (e.g., "Oct 27, 2026")
    const formattedDate = targetDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: targetDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue: ${formattedDate}`, statusClass: 'overdue' };
    } else if (diffDays === 0) {
      return { text: `Today: ${formattedDate}`, statusClass: 'due-today' };
    } else if (diffDays === 1) {
      return { text: `Tomorrow`, statusClass: '' };
    } else {
      return { text: `Due ${formattedDate}`, statusClass: '' };
    }
  }

  // ----------------------------------------------------------------------------
  // Feature 5: Progress Bar & Counter Calculation ("3 of 5 tasks done")
  // ----------------------------------------------------------------------------
  function updateProgressAndCounters() {
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.done).length;
    const activeCount = totalCount - completedCount;

    // Update text counters
    completedCountSpan.textContent = completedCount;
    totalCountSpan.textContent = totalCount;

    // Update filter badges
    badgeAll.textContent = totalCount;
    badgeActive.textContent = activeCount;
    badgeDone.textContent = completedCount;

    // Calculate percentage completion
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    progressPercentSpan.textContent = `${percent}%`;
    progressFillBar.style.width = `${percent}%`;
    progressBarContainer.setAttribute('aria-valuenow', percent);

    // Update status descriptor
    if (activeFilter === 'all') {
      quickStatusText.textContent = `Showing all ${totalCount} items`;
    } else if (activeFilter === 'active') {
      quickStatusText.textContent = `Showing ${activeCount} active items`;
    } else {
      quickStatusText.textContent = `Showing ${completedCount} completed items`;
    }
  }

  // ----------------------------------------------------------------------------
  // Feature 1: Render Task List Items
  // ----------------------------------------------------------------------------
  function renderTaskList() {
    taskListElement.innerHTML = '';

    // Filter tasks based on selected filter tab (Stretch Goal)
    const filteredTasks = tasks.filter(task => {
      if (activeFilter === 'active') return !task.done;
      if (activeFilter === 'done') return task.done;
      return true; // 'all'
    });

    // Check if empty state should be displayed
    if (filteredTasks.length === 0) {
      emptyStateElement.style.display = 'flex';
      if (tasks.length === 0) {
        emptyStateTitle.textContent = 'No tasks yet';
        emptyStateDesc.textContent = 'Add your first task above to start organizing your day.';
      } else if (activeFilter === 'active') {
        emptyStateTitle.textContent = 'No active tasks';
        emptyStateDesc.textContent = 'Awesome job! All your tasks are marked completed.';
      } else if (activeFilter === 'done') {
        emptyStateTitle.textContent = 'No completed tasks yet';
        emptyStateDesc.textContent = 'Check off a task to track your progress here.';
      }
    } else {
      emptyStateElement.style.display = 'none';
    }

    // Build task items
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'is-done' : ''}`;
      li.id = `task-item-${task.id}`;

      // Date information
      const dateInfo = formatDueDate(task.due_date);
      const dueBadgeHtml = dateInfo 
        ? `<span class="badge due-badge ${dateInfo.statusClass}">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
             ${dateInfo.text}
           </span>`
        : '';

      li.innerHTML = `
        <div class="task-main">
          <!-- Requirement 3: Checkbox to mark as done -->
          <label class="custom-checkbox-wrapper" title="${task.done ? 'Mark as active' : 'Mark as done'}">
            <input 
              type="checkbox" 
              class="task-checkbox-input" 
              id="task-checkbox-${task.id}" 
              data-id="${task.id}" 
              ${task.done ? 'checked' : ''}
              aria-label="Mark '${escapeHtml(task.title)}' as done"
            >
            <svg class="custom-checkbox-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </label>

          <div class="task-content">
            <!-- Requirement 3: Strike-through title when done -->
            <span class="task-title" id="task-title-${task.id}">${escapeHtml(task.title)}</span>
            <div class="task-meta">
              ${dueBadgeHtml}
            </div>
          </div>
        </div>

        <!-- Requirement 4: Delete button -->
        <button 
          type="button" 
          class="delete-btn" 
          id="task-delete-${task.id}" 
          data-id="${task.id}" 
          aria-label="Delete '${escapeHtml(task.title)}'"
          title="Delete task"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;

      taskListElement.appendChild(li);
    });

    updateProgressAndCounters();
  }

  // ----------------------------------------------------------------------------
  // API Call: GET /api/tasks (Requirement 1: Show all tasks)
  // ----------------------------------------------------------------------------
  async function fetchTasks() {
    loadingSpinner.style.display = 'flex';
    emptyStateElement.style.display = 'none';

    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`Failed to load tasks (Status ${response.status})`);
      }
      tasks = await response.json();
      renderTaskList();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Could not load tasks from database. Please refresh.', 'error');
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }

  // ----------------------------------------------------------------------------
  // API Call: POST /api/tasks (Requirement 2: Add a new task)
  // ----------------------------------------------------------------------------
  async function handleAddTask(event) {
    event.preventDefault();

    const titleValue = titleInputElement.value.trim();
    const dueDateValue = dueDateInputElement.value.trim() || null;

    // Reset error banner
    formErrorBanner.style.display = 'none';
    formErrorBanner.textContent = '';

    // Validate client-side input
    if (!titleValue) {
      formErrorBanner.textContent = 'Please enter a task description.';
      formErrorBanner.style.display = 'flex';
      titleInputElement.focus();
      return;
    }

    // Disable button to prevent double-submissions
    submitButtonElement.disabled = true;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: titleValue,
          due_date: dueDateValue
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task.');
      }

      // Add newly created task to state (at the top of list)
      tasks.unshift(data);

      // Reset form fields
      titleInputElement.value = '';
      dueDateInputElement.value = '';
      titleInputElement.focus();

      // Refresh view
      renderTaskList();
      showToast('Task added successfully!', 'success');

    } catch (error) {
      console.error('Error adding task:', error);
      formErrorBanner.textContent = error.message;
      formErrorBanner.style.display = 'flex';
      showToast(error.message, 'error');
    } finally {
      submitButtonElement.disabled = false;
    }
  }

  // ----------------------------------------------------------------------------
  // API Call: PATCH /api/tasks/<id> (Requirement 3: Toggle task done status)
  // ----------------------------------------------------------------------------
  async function handleToggleDone(taskId, isDone) {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    // Optimistically update local state for instantaneous feedback
    const previousStatus = targetTask.done;
    targetTask.done = isDone;

    const taskItemEl = document.getElementById(`task-item-${taskId}`);
    if (taskItemEl) {
      taskItemEl.classList.toggle('is-done', isDone);
    }
    updateProgressAndCounters();

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ done: isDone })
      });

      if (!response.ok) {
        throw new Error('Failed to update task status on server.');
      }

      const updatedTask = await response.json();
      targetTask.done = updatedTask.done;

      // If active filter is hiding this item, re-render
      if (activeFilter !== 'all') {
        renderTaskList();
      }

      showToast(isDone ? 'Task marked as completed!' : 'Task reopened as active.', 'info');

    } catch (error) {
      console.error('Error updating task:', error);
      // Revert optimistic update on failure
      targetTask.done = previousStatus;
      renderTaskList();
      showToast('Failed to update task. Changes reverted.', 'error');
    }
  }

  // ----------------------------------------------------------------------------
  // API Call: DELETE /api/tasks/<id> (Requirement 4: Delete a task)
  // ----------------------------------------------------------------------------
  async function handleDeleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const taskItemEl = document.getElementById(`task-item-${taskId}`);
    if (taskItemEl) {
      taskItemEl.classList.add('deleting');
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete task.');
      }

      // Remove from local memory state
      tasks.splice(taskIndex, 1);

      // Re-render task list
      renderTaskList();
      showToast('Task deleted successfully.', 'info');

    } catch (error) {
      console.error('Error deleting task:', error);
      if (taskItemEl) {
        taskItemEl.classList.remove('deleting');
      }
      showToast('Could not delete task. Please try again.', 'error');
    }
  }

  // ----------------------------------------------------------------------------
  // Event Delegation for Task List Interactions
  // ----------------------------------------------------------------------------
  taskListElement.addEventListener('click', (event) => {
    // Check for delete button click
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
      const taskId = parseInt(deleteBtn.dataset.id, 10);
      handleDeleteTask(taskId);
      return;
    }
  });

  taskListElement.addEventListener('change', (event) => {
    // Check for checkbox status change
    if (event.target.classList.contains('task-checkbox-input')) {
      const taskId = parseInt(event.target.dataset.id, 10);
      const isDone = event.target.checked;
      handleToggleDone(taskId, isDone);
    }
  });

  // ----------------------------------------------------------------------------
  // Filter Tabs Event Listeners (Stretch Goal: All / Active / Done)
  // ----------------------------------------------------------------------------
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      activeFilter = button.dataset.filter;
      renderTaskList();
    });
  });

  // ----------------------------------------------------------------------------
  // Form Submission Event Listener
  // ----------------------------------------------------------------------------
  formElement.addEventListener('submit', handleAddTask);

  // ----------------------------------------------------------------------------
  // Initial Load
  // ----------------------------------------------------------------------------
  fetchTasks();
});
