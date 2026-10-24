# ==============================================================================
# LAYER: Backend API Layer (Flask Controller & REST Endpoints)
# Description: Implements the REST API endpoints and web server routes.
#              Orchestrates business logic and calls the database layer (db.py).
#              Performs request validation and returns proper HTTP status codes.
# ==============================================================================

from flask import Flask, jsonify, request, render_template
import db

# Initialize the Flask application
# Template and static folder locations are explicitly defined
app = Flask(__name__, template_folder='templates', static_folder='static')


# ------------------------------------------------------------------------------
# Database Initialization Hook
# ------------------------------------------------------------------------------
# Initialize database tables and seed sample data on application startup
with app.app_context():
    db.init_db()


# ------------------------------------------------------------------------------
# Web Frontend Route
# ------------------------------------------------------------------------------
@app.route('/', methods=['GET'])
def index():
    """
    Renders the single-page application frontend template.
    """
    return render_template('index.html')


# ------------------------------------------------------------------------------
# REST API Endpoints
# ------------------------------------------------------------------------------

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    GET /api/tasks
    Retrieves all tasks stored in the database.
    Status Codes:
        200 OK: Returns array of task objects.
    """
    tasks = db.get_all_tasks()
    return jsonify(tasks), 200


@app.route('/api/tasks', methods=['POST'])
def add_task():
    """
    POST /api/tasks
    Creates a new task.
    Expected JSON Body:
        {
            "title": "Task description string (required)",
            "due_date": "YYYY-MM-DD string (optional)"
        }
    Status Codes:
        201 Created: Task was successfully created.
        400 Bad Request: Request body is missing or title is invalid.
    """
    # 1. Ensure the request payload is valid JSON
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request body must be a valid JSON object."}), 400

    # 2. Extract and validate the title field
    title = data.get("title")
    if not title or not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Task 'title' is required and cannot be empty."}), 400

    # 3. Extract optional due_date field (stretch goal)
    due_date = data.get("due_date")
    if due_date and (not isinstance(due_date, str) or not due_date.strip()):
        due_date = None

    # 4. Insert into database via database layer
    created_task = db.create_task(title=title.strip(), due_date=due_date.strip() if due_date else None)

    # 5. Return created task with 201 Created status
    return jsonify(created_task), 201


@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task_status(task_id):
    """
    PATCH /api/tasks/<id>
    Updates an existing task's status (done: true/false) or details.
    Expected JSON Body:
        {
            "done": true/false (optional),
            "title": "new title" (optional),
            "due_date": "YYYY-MM-DD" (optional)
        }
    Status Codes:
        200 OK: Task was successfully updated.
        400 Bad Request: Missing or invalid update fields.
        404 Not Found: Task with specified ID does not exist.
    """
    # 1. Verify task existence
    existing_task = db.get_task_by_id(task_id)
    if not existing_task:
        return jsonify({"error": f"Task with ID {task_id} not found."}), 404

    # 2. Parse JSON body
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Request body must be a valid JSON object."}), 400

    # 3. Check for at least one updatable field
    has_done = "done" in data
    has_title = "title" in data
    has_due_date = "due_date" in data

    if not (has_done or has_title or has_due_date):
        return jsonify({"error": "At least one field ('done', 'title', or 'due_date') must be provided."}), 400

    done_val = None
    if has_done:
        raw_done = data["done"]
        if not isinstance(raw_done, (bool, int)):
            return jsonify({"error": "Field 'done' must be a boolean (true/false)."}), 400
        done_val = bool(raw_done)

    title_val = None
    if has_title:
        raw_title = data["title"]
        if not isinstance(raw_title, str) or not raw_title.strip():
            return jsonify({"error": "Field 'title' cannot be empty."}), 400
        title_val = raw_title.strip()

    due_date_val = None
    if has_due_date:
        due_date_val = data["due_date"]
        if due_date_val is not None and not isinstance(due_date_val, str):
            return jsonify({"error": "Field 'due_date' must be a string or null."}), 400

    # 4. Perform update via database layer
    updated_task = db.update_task(
        task_id=task_id,
        done=done_val,
        title=title_val,
        due_date=due_date_val
    )

    return jsonify(updated_task), 200


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task_item(task_id):
    """
    DELETE /api/tasks/<id>
    Removes a task from the database.
    Status Codes:
        200 OK: Task successfully deleted.
        404 Not Found: Task with specified ID does not exist.
    """
    # 1. Attempt to delete task in database
    deleted = db.delete_task(task_id)
    if not deleted:
        return jsonify({"error": f"Task with ID {task_id} not found."}), 404

    return jsonify({
        "success": True,
        "message": f"Task {task_id} was deleted successfully."
    }), 200


# ------------------------------------------------------------------------------
# Generic HTTP Error Handlers
# ------------------------------------------------------------------------------
@app.errorhandler(404)
def handle_not_found(error):
    """
    Returns JSON 404 response for unmatched API routes.
    """
    if request.path.startswith('/api/'):
        return jsonify({"error": "API route not found."}), 404
    return render_template('index.html'), 404


@app.errorhandler(500)
def handle_internal_error(error):
    """
    Returns JSON 500 response for unexpected server errors.
    """
    return jsonify({"error": "Internal server error occurred."}), 500


# ------------------------------------------------------------------------------
# Application Entry Point
# ------------------------------------------------------------------------------
if __name__ == '__main__':
    # Run development server on port 5000 in debug mode for local laptop development
    print("Starting To-Do List Web Application on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=True)
