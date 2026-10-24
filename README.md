# 📝 TaskFlow — Simple To-Do List Web App

A clean, responsive, beginner-friendly To-Do List web application built with a clear **3-Tier Layered Architecture**:
1. **Frontend Presentation & Client Logic Layer**: Plain HTML5, CSS3 with modern glassmorphism, and vanilla JavaScript (no frameworks) served directly from Flask's `templates/` and `static/` folders.
2. **Backend API Layer**: Python Flask REST API with input validation and standard HTTP response codes (`200`, `201`, `400`, `404`).
3. **Database Persistence Layer**: SQLite database using Python's native `sqlite3` module with hand-crafted SQL queries (no ORM).

---

## 🚀 Features

- **Task Overview**: Displays all tasks stored in the SQLite database with real-time state.
- **Add Tasks**: Quick task creation with an input field, optional due date picker, and "Add Task" button.
- **Interactive Checkbox & Strike-Through**: Check off completed tasks with instant visual strikethrough styling and smooth animations.
- **Delete Tasks**: Remove tasks with an interactive delete button and optimistic UI removal.
- **Dynamic Task Counter & Progress**: Shows exact completion metrics (e.g. `2 of 5 tasks done`) accompanied by an animated progress bar.
- **Automatic Data Seeding**: Automatically initializes the database schema and seeds 3–5 initial tasks on first launch.
- **Stretch Goals Included**:
  - **Filter Tabs**: Toggle between **All**, **Active**, and **Done** views with live count badges.
  - **Due Dates**: Due date assignment with visual badges highlighting overdue, due today, and upcoming tasks.

---

## 📂 Project Architecture & Folder Structure

```text
todo_app/
├── app.py                # Backend REST API & Flask routing controller
├── db.py                 # Database persistence layer with raw SQLite SQL
├── requirements.txt      # Pinned Python package dependencies
├── README.md             # Project documentation & setup instructions
├── templates/
│   └── index.html        # Semantic HTML5 template served by Flask
└── static/
    ├── style.css         # Modern vanilla CSS stylesheet (responsive dark glassmorphic design)
    └── script.js         # Vanilla JavaScript client logic & fetch() API integration
```

Each file contains an explicit **`LAYER`** header comment at the top explaining its architectural role.

---

## 💻 Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+** (Python 3.12 is tested and supported)
- **pip** (Python package installer)
- A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari)

---

## 🛠️ Installation & Setup

1. **Open your terminal or command prompt** and navigate to the `todo_app` directory:
   ```bash
   cd "c:\saba\work\GenAI Agenctic AI\Github downloads\assesments\todo-list\todo_app"
   ```

2. *(Optional but recommended)* **Create and activate a virtual environment**:
   - **Windows (Command Prompt / PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install the pinned dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

---

## ▶️ How to Run the Application

Start the Flask development server by running:
```bash
python app.py
```

You should see output similar to:
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000 (Press CTRL+C to quit)
```

### 🌐 URL to Open
Open your web browser and visit:
```text
http://127.0.0.1:5000
```

---

## 📡 REST API Reference

All API endpoints return JSON responses and adhere to standard HTTP status codes.

| Method | Endpoint | Request Body | Status Codes | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | None | `200 OK` | Retrieves all tasks |
| `POST` | `/api/tasks` | `{"title": "My Task", "due_date": "2026-10-30"}` | `201 Created`<br>`400 Bad Request` | Creates a new task |
| `PATCH` | `/api/tasks/<id>` | `{"done": true}` | `200 OK`<br>`400 Bad Request`<br>`404 Not Found` | Updates task status or details |
| `DELETE` | `/api/tasks/<id>` | None | `200 OK`<br>`404 Not Found` | Deletes a task by ID |

---

## 🗄️ Database Schema & Hand-Crafted SQL

The application manages an embedded SQLite database (`tasks.db`) initialized automatically on startup:

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    due_date TEXT
);
```

- **Querying Tasks**:
  `SELECT id, title, done, created_at, due_date FROM tasks ORDER BY id DESC;`
- **Inserting a Task**:
  `INSERT INTO tasks (title, done, created_at, due_date) VALUES (?, 0, ?, ?);`
- **Updating a Task Status**:
  `UPDATE tasks SET done = ? WHERE id = ?;`
- **Deleting a Task**:
  `DELETE FROM tasks WHERE id = ?;`

---

## 🧪 Testing the API from the Command Line

You can test the endpoints directly using `curl` or PowerShell:

- **Fetch all tasks**:
  ```bash
  curl -X GET http://127.0.0.1:5000/api/tasks
  ```

- **Add a new task**:
  ```bash
  curl -X POST http://127.0.0.1:5000/api/tasks \
       -H "Content-Type: application/json" \
       -d "{\"title\": \"Buy groceries\", \"due_date\": \"2026-10-28\"}"
  ```

- **Mark task #1 as done**:
  ```bash
  curl -X PATCH http://127.0.0.1:5000/api/tasks/1 \
       -H "Content-Type: application/json" \
       -d "{\"done\": true}"
  ```

- **Delete task #1**:
  ```bash
  curl -X DELETE http://127.0.0.1:5000/api/tasks/1
  ```
