# University Research Opportunity Portal

Computer Networks Assignment 01 — Fall 2026.

A web application for managing university research opportunities.
Users can create opportunities, browse and filter them, view complete
details, edit fields, close opportunities, and delete records.

All opportunity data is retrieved from and persisted in MySQL through
the FastAPI backend.

## GitHub repository

[University Research Opportunity Portal](https://github.com/ahmedforge/university_research_portal)

## Technology stack

- Backend: Python, FastAPI, Uvicorn, and Pydantic
- Database: MySQL 8, SQLAlchemy 2, and PyMySQL
- Frontend: HTML, CSS, vanilla JavaScript, and Bootstrap 5
- API testing: Postman

SQLAlchemy handles database access through mapped models and
parameterized queries. PyMySQL connects the Python application to MySQL.

## Features

- Create opportunities with required-field validation
- Browse opportunities and view complete details
- Search by opportunity information
- Filter by status and research area
- Edit opportunity fields
- Close an opportunity without deleting it
- Delete an opportunity after confirmation
- Display loading, empty, success, and error states
- Use a responsive interface on desktop and mobile screens

## Repository structure

```text
backend/
  app/
    __init__.py
    config.py
    database.py
    errors.py
    main.py
    models.py
    schemas.py
    routes/
      __init__.py
      opportunities.py
  requirements.txt
  requirements-dev.txt
database/
  schema.sql
frontend/
  index.html
  styles.css
  forms.css
  app.js
  create.js
postman/
  research_portal.postman_collection.json
.env.example
.gitignore
README.md
```

## Prerequisites

The project was developed on Ubuntu 24.04 LTS with Python 3.12 and MySQL 8.

Required software:

- Python 3.12 with pip and virtual environment support
- MySQL 8
- Git
- A modern browser
- Postman for running the supplied API collection

Internet access is needed to install dependencies and load Bootstrap
from its CDN.

On Ubuntu, install the prerequisites:

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip mysql-server git
sudo systemctl enable --now mysql
```

## 1. Clone the repository

```bash
git clone https://github.com/ahmedforge/university_research_portal.git
cd university_research_portal
```

Run the following setup commands from the repository root.

## 2. Create the database

Import the supplied schema:

```bash
sudo mysql < database/schema.sql
```

Open the MySQL administrative console with its command history disabled:

```bash
sudo env MYSQL_HISTFILE=/dev/null mysql
```

Run the following SQL. Replace the example password with a password
chosen for your local installation.

```sql
CREATE USER IF NOT EXISTS 'research_portal_user'@'127.0.0.1'
IDENTIFIED BY 'replace_with_your_local_password';

ALTER USER 'research_portal_user'@'127.0.0.1'
IDENTIFIED BY 'replace_with_your_local_password';

GRANT SELECT, INSERT, UPDATE, DELETE
ON research_portal.*
TO 'research_portal_user'@'127.0.0.1';

EXIT;
```

The application account needs permission to read and change records.
Schema creation is performed separately using the administrative account.

Check the application account:

```bash
mysql --protocol=TCP -h 127.0.0.1 -P 3306 \
  -u research_portal_user -p research_portal
```

Enter your local password when prompted. Then run:

```sql
SHOW TABLES;
EXIT;
```

The table `research_opportunities` should be listed.

The schema contains structure only. Create demonstration records through
the frontend or the Postman collection.

## 3. Configure the environment

Copy the example configuration:

```bash
cp .env.example .env
nano .env
```

Set the values for your local installation:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=research_portal
DB_USER=research_portal_user
DB_PASSWORD=replace_with_your_local_password
FRONTEND_ORIGIN=http://localhost:5500
```

The password must match the MySQL application account.
Quote the password value if required by dotenv syntax, such as when it
contains spaces or a hash character.

The `.env` file is ignored by Git. Only `.env.example`, containing
placeholder values, is included in the repository.

## 4. Install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Optional dependencies for Python API testing:

```bash
python -m pip install -r backend/requirements-dev.txt
```

## 5. Run the backend

In the first terminal, from the repository root:

```bash
source .venv/bin/activate
python -m uvicorn app.main:app --app-dir backend \
  --reload --host 127.0.0.1 --port 8000
```

Keep this terminal running.

Check database connectivity from another terminal:

```bash
curl -i http://127.0.0.1:8000/api/health
```

Expected status: `200 OK`.

```json
{"status":"ok","database":"connected"}
```

Interactive API documentation is available at:

[Swagger UI](http://127.0.0.1:8000/docs)

## 6. Run the frontend

In a second terminal, from the repository root:

```bash
python3 -m http.server 5500 --bind 127.0.0.1 --directory frontend
```

Keep this terminal running and open:

[Research Portal](http://localhost:5500)

Use `localhost` for the frontend URL because the default allowed CORS
origin is `http://localhost:5500`.

The frontend sends API requests to `http://127.0.0.1:8000`.
Both servers must be running.

## Opportunity fields

| Field | Description |
| --- | --- |
| id | Automatically generated unique identifier |
| title | Opportunity title |
| description | Complete project description |
| research_area | Research area |
| faculty_name | Supervising faculty member |
| department | Faculty department |
| required_skills | Skills required for the opportunity |
| positions_available | Positive integer number of positions |
| application_deadline | Deadline in YYYY-MM-DD format |
| status | Open or Closed |
| created_at | Database-generated creation timestamp |
| updated_at | Database-maintained modification timestamp |

Text fields must contain non-whitespace characters.
New deadlines must be today or later.
When editing, an existing deadline can remain unchanged.
Status defaults to `Open` when omitted during creation.

## API endpoints

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | Check API and database connectivity | 200 |
| POST | `/api/opportunities` | Create an opportunity | 201 |
| GET | `/api/opportunities` | Retrieve all opportunities | 200 |
| GET | `/api/opportunities/{id}` | Retrieve one opportunity | 200 |
| PUT | `/api/opportunities/{id}` | Update supplied fields | 200 |
| DELETE | `/api/opportunities/{id}` | Delete an opportunity | 200 |

The update endpoint accepts partial updates. Omitted fields retain their
existing values. An empty update or an explicitly null field is rejected.

Close an opportunity using the update endpoint:

```json
{"status":"Closed"}
```

Deletion returns:

```json
{"message":"Research opportunity deleted successfully."}
```

Retrieving all opportunities returns a JSON array, including an empty
array when no records exist.

## Error responses

- `400 Bad Request`: invalid input, invalid ID, or empty update
- `404 Not Found`: requested opportunity does not exist
- `500 Internal Server Error`: database or unexpected server failure

Validation errors include field information:

```json
{
  "detail": "Invalid request data.",
  "errors": [
    {
      "field": "body.positions_available",
      "message": "Input should be greater than or equal to 1"
    }
  ]
}
```

A missing opportunity returns:

```json
{"detail":"Research opportunity not found."}
```

Server errors return a safe message without exposing database credentials.

## Postman API testing

Import this file into Postman:

```text
postman/research_portal.postman_collection.json
```

Select the `University Research Opportunity Portal` collection.
Open the Collection Runner and run all ten requests in their listed order
with one iteration. No separate environment is required.

The collection's `baseUrl` defaults to `http://127.0.0.1:8000`.
Keep the backend and MySQL running during the test.

The collection tests:

1. Create a networking opportunity
2. Create a cybersecurity opportunity
3. Create a data science opportunity
4. Retrieve all opportunities
5. Retrieve one opportunity
6. Update opportunity fields
7. Close an opportunity
8. Delete an opportunity
9. Retrieve the deleted opportunity and verify 404
10. Submit invalid input and verify 400

Scripts generate a future deadline and save newly created IDs for later
requests. IDs are not hardcoded.

Verified result: **37 assertions passed, zero failures**.

Each complete run creates three records and deletes the first one.
The other two remain available for demonstration. Running the collection
again creates additional records.

## Frontend verification

With both servers running:

1. Create an opportunity using Add opportunity.
2. Confirm that its card appears and survives a browser reload.
3. Open View details and check its saved fields.
4. Edit its title or available positions and verify persistence.
5. Close it and verify that its status changes to Closed.
6. Search and combine status and research-area filters.
7. Delete a disposable record and confirm that it disappears.
8. Check required-field validation in the create and edit forms.

## Troubleshooting

### Address already in use

A server is already using the requested port. Use the existing server,
or stop it with Ctrl+C in its terminal before restarting it.

### Frontend cannot reach the API

Check that the backend is running on port 8000 and that `/api/health`
returns a successful response. Open the frontend at
`http://localhost:5500` to match the configured CORS origin.

### Database access denied

Verify the MySQL username, password, host, and privileges.
The password in `.env` must match the local application account.

### Frontend remains on the loading screen

Check JavaScript syntax if Node.js is installed:

```bash
node --check frontend/app.js
node --check frontend/create.js
```

No output means that the syntax checks passed.
Inspect the browser console for additional errors and perform a hard
refresh after correcting a script.

### Bootstrap components do not open

Check internet access because Bootstrap is loaded from a CDN.

## Screenshots

Frontend screenshots will be added during final submission preparation.

## Demonstration video

[Watch the demonstration](docs/demo.webm)

Duration: approximately 59.21 seconds.

The video is included in the repository and final submission.

## Assignment scope

This project implements the assignment's opportunity-management workflow.
Authentication and user roles are outside its current scope.
