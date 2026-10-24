# ==============================================================================
# LAYER: Database Persistence Layer (SQLite using native sqlite3 module)
# Description: Handles database initialization, table creation, initial data seeding,
#              and raw SQL CRUD queries for tasks. No ORM is used.
# ==============================================================================

import sqlite3
import os
from datetime import datetime

# Resolve absolute path to tasks.db in the same directory as this file
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tasks.db')


def get_db_connection():
    """
    Establishes and returns a connection to the SQLite database.
    Configures row_factory to sqlite3.Row so query results can be accessed like dictionaries.
    """
    connection = sqlite3.connect(DB_FILE)
    # Enable access to columns by name like row['title']
    connection.row_factory = sqlite3.Row
    # Enable foreign key support in SQLite
    connection.execute("PRAGMA foreign_keys = ON;")
    return connection


def init_db():
    """
    Initializes the database schema and seeds initial sample tasks if empty.
    Creates the 'tasks' table with columns:
      - id: Integer primary key auto-incrementing
      - title: Text title of the task (cannot be null)
      - done: Integer boolean flag (0 = active/pending, 1 = completed)
      - created_at: ISO-8601 formatted datetime string
      - due_date: Optional date string (YYYY-MM-DD) for stretch goal
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Step 1: Create the tasks table if it does not already exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            done INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            due_date TEXT
        );
    """)
    conn.commit()

    # Step 2: Check if the table already contains any records
    cursor.execute("SELECT COUNT(*) AS task_count FROM tasks;")
    row = cursor.fetchone()
    count = row['task_count'] if row else 0

    # Step 3: Seed initial sample records on first run if table is empty
    if count == 0:
        sample_tasks = [
            ("Review project requirements and setup Flask environment", 1, "2026-10-24", "2026-10-24 09:00:00"),
            ("Design clean SQLite database schema with raw SQL queries", 1, "2026-10-24", "2026-10-24 10:15:00"),
            ("Build responsive, accessible frontend with modern CSS styling", 0, "2026-10-25", "2026-10-24 11:30:00"),
            ("Implement vanilla JavaScript fetch calls for complete CRUD lifecycle", 0, "2026-10-26", "2026-10-24 13:00:00"),
            ("Test filtering and task status counters end-to-end", 0, "2026-10-27", "2026-10-24 14:00:00")
        ]

        cursor.executemany("""
            INSERT INTO tasks (title, done, due_date, created_at)
            VALUES (?, ?, ?, ?);
        """, sample_tasks)
        conn.commit()

    conn.close()


def row_to_dict(row):
    """
    Helper function to convert a sqlite3.Row object into a standard Python dictionary.
    Converts SQLite integer (0 or 1) to boolean for modern JSON API consumers.
    """
    if row is None:
        return None
    return {
        "id": row["id"],
        "title": row["title"],
        "done": bool(row["done"]),
        "created_at": row["created_at"],
        "due_date": row["due_date"]
    }


def get_all_tasks():
    """
    Retrieves all tasks from the database ordered by creation time descending.
    Returns:
        list of task dictionaries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    # Query all tasks sorted by id descending so newest appears near the top
    cursor.execute("""
        SELECT id, title, done, created_at, due_date
        FROM tasks
        ORDER BY id DESC;
    """)
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(row) for row in rows]


def get_task_by_id(task_id):
    """
    Retrieves a single task by its primary key ID.
    Returns:
        task dictionary if found, None otherwise.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, done, created_at, due_date
        FROM tasks
        WHERE id = ?;
    """, (task_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)


def create_task(title, due_date=None):
    """
    Inserts a new task into the database.
    Args:
        title (str): Title or description of the task.
        due_date (str, optional): Target due date (e.g. YYYY-MM-DD).
    Returns:
        The newly created task dictionary.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO tasks (title, done, created_at, due_date)
        VALUES (?, 0, ?, ?);
    """, (title.strip(), created_at, due_date if due_date else None))
    conn.commit()

    new_id = cursor.lastrowid
    conn.close()
    return get_task_by_id(new_id)


def update_task(task_id, done=None, title=None, due_date=None):
    """
    Updates an existing task's fields dynamically based on provided arguments.
    Args:
        task_id (int): Primary key ID of the task to update.
        done (bool or int, optional): Updated status (True/False or 1/0).
        title (str, optional): Updated title.
        due_date (str, optional): Updated due date.
    Returns:
        Updated task dictionary if successful, None if task was not found.
    """
    # First verify if task exists
    existing = get_task_by_id(task_id)
    if not existing:
        return None

    updates = []
    params = []

    if done is not None:
        updates.append("done = ?")
        params.append(1 if done else 0)

    if title is not None:
        updates.append("title = ?")
        params.append(title.strip())

    if due_date is not None:
        updates.append("due_date = ?")
        params.append(due_date if due_date else None)

    if not updates:
        # Nothing to update, return existing
        return existing

    params.append(task_id)
    sql = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?;"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(sql, tuple(params))
    conn.commit()
    conn.close()

    return get_task_by_id(task_id)


def delete_task(task_id):
    """
    Deletes a task by its ID.
    Args:
        task_id (int): Primary key ID of the task.
    Returns:
        bool: True if a task was found and deleted, False otherwise.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?;", (task_id,))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0
