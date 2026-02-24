# Training Management System v2.0
## Cook Shire Council — React + FastAPI + PostgreSQL + Docker

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (port 80/443)               │
│              Reverse Proxy + SSL + Rate Limit         │
├────────────────────┬────────────────────────────────┤
│   /api/*           │   /*                            │
│   ↓                │   ↓                             │
│   FastAPI          │   Vite React                    │
│   (port 8000)      │   (port 80)                     │
│   ↓                │                                 │
│   PostgreSQL       │                                 │
│   (port 5432)      │                                 │
└────────────────────┴────────────────────────────────┘
```

### Tech Stack

| Layer     | Technology                         |
|-----------|-----------------------------------|
| Frontend  | React 18 + Vite + Tailwind CSS    |
| Backend   | Python FastAPI + SQLAlchemy        |
| Database  | PostgreSQL 16                      |
| Proxy     | Nginx + Let's Encrypt SSL         |
| Container | Docker + Docker Compose           |
| Server    | Kamatera AU-SY (79.108.224.58)    |
| Repo      | GitHub                             |

### Quick Start (Development)

```bash
# Clone
git clone https://github.com/Jsolersafety/Training_matrix.git
cd Training_matrix

# Copy env
cp .env.example .env

# Start all services
docker-compose up -d

# View at http://localhost
```

### Deploy to Kamatera

```bash
# SSH into server
ssh root@79.108.224.58

# Run deploy script
curl -sSL https://raw.githubusercontent.com/Jsolersafety/Training_matrix/main/scripts/deploy.sh | bash
```

Or manually:
```bash
git clone https://github.com/Jsolersafety/Training_matrix.git /opt/training-matrix
cd /opt/training-matrix
cp .env.example .env
# Edit .env with secure passwords
docker-compose up -d
```

### Project Structure

```
training-matrix/
├── docker-compose.yml          # All services
├── .env.example                # Environment template
├── frontend/                   # Vite + React
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx            # Entry point
│       ├── App.jsx             # Router
│       ├── api/client.js       # API functions
│       ├── components/
│       │   ├── Layout.jsx      # Nav + Header
│       │   └── ui.jsx          # Modal, Badges, etc.
│       └── pages/
│           ├── Dashboard.jsx
│           ├── MatrixPage.jsx  # Competency matrix
│           ├── CoursesPage.jsx
│           ├── PeoplePage.jsx  # Staff + records
│           └── ReportsPage.jsx
├── backend/                    # FastAPI
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI app
│   │   ├── core/
│   │   │   ├── config.py       # Settings
│   │   │   └── database.py     # DB connection
│   │   ├── models/
│   │   │   └── models.py       # SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── schemas.py      # Pydantic schemas
│   │   └── api/routes/
│   │       ├── departments.py
│   │       ├── roles.py
│   │       ├── competencies.py
│   │       ├── matrix.py       # The core matrix
│   │       ├── courses.py
│   │       ├── people.py       # + CSV import
│   │       ├── training_records.py  # + file upload
│   │       └── reports.py      # Compliance reports
│   └── scripts/
│       └── init_db.sql         # Seed data (157 roles, 229 competencies)
├── nginx/
│   ├── nginx.conf
│   └── conf.d/default.conf
└── scripts/
    └── deploy.sh               # One-click deploy
```

### API Endpoints

| Method | Endpoint                          | Description                  |
|--------|----------------------------------|------------------------------|
| GET    | /api/health                       | Health check                 |
| GET    | /api/matrix                       | Full competency matrix       |
| PUT    | /api/matrix/cell                  | Update single matrix cell    |
| PUT    | /api/matrix/bulk                  | Bulk update matrix           |
| GET    | /api/departments                  | List departments             |
| CRUD   | /api/roles                        | Manage roles                 |
| CRUD   | /api/competencies                 | Manage competencies          |
| CRUD   | /api/courses                      | Manage training courses      |
| CRUD   | /api/people                       | Manage staff                 |
| POST   | /api/people/csv-import            | Import from CSV              |
| CRUD   | /api/training-records             | Manage training records      |
| POST   | /api/training-records/{id}/upload | Upload certificate file      |
| GET    | /api/reports/compliance           | Staff compliance report      |
| GET    | /api/reports/departments          | Department summary           |
| GET    | /api/reports/expiring             | Expiring training            |
| GET    | /api/reports/stats                | Dashboard statistics         |

Interactive API docs at: `http://your-server/api/docs`

### Data

Pre-loaded with Cook Shire Council data:
- **17 Departments** (Fleet & Civil Works, Engineering, Water & Waste, etc.)
- **156 Roles** (from Depot Admin Officer to CEO)
- **234 Competencies** (licences, certificates, safety, skills)
- **2,079 Role-Competency Requirements** (the full training matrix)

---

## 🔧 PROMPT FOR MAKING CHANGES

Copy this prompt to Claude when you need changes:

```
I have a Training Management System deployed on Kamatera (79.108.224.58)
with Docker. GitHub repo: https://github.com/Jsolersafety/Training_matrix.git

Tech stack:
- Frontend: Vite + React 18 + Tailwind CSS (in /frontend)
- Backend: Python FastAPI + SQLAlchemy (in /backend)
- Database: PostgreSQL 16 (seeded with 157 roles × 229 competencies)
- Docker Compose with Nginx reverse proxy

Key files:
- Frontend pages: frontend/src/pages/ (Dashboard, MatrixPage, CoursesPage, PeoplePage, ReportsPage)
- Frontend API client: frontend/src/api/client.js
- Backend routes: backend/app/api/routes/ (matrix.py, people.py, courses.py, etc.)
- Database models: backend/app/models/models.py
- Pydantic schemas: backend/app/schemas/schemas.py
- Seed data: backend/scripts/init_db.sql

The change I want to make is: [DESCRIBE YOUR CHANGE HERE]

Please provide the exact file changes needed and any new files to create.
After changes, I'll run: docker-compose build && docker-compose up -d
```

### Common Changes

**Add a new page:**
1. Create `frontend/src/pages/NewPage.jsx`
2. Add route in `frontend/src/App.jsx`
3. Add nav link in `frontend/src/components/Layout.jsx`

**Add a new API endpoint:**
1. Create route in `backend/app/api/routes/newroute.py`
2. Add schema in `backend/app/schemas/schemas.py`
3. Register in `backend/app/main.py`
4. Add API function in `frontend/src/api/client.js`

**Add a database table:**
1. Add model in `backend/app/models/models.py`
2. Export in `backend/app/models/__init__.py`
3. Restart: tables auto-create on startup

**Update after changes:**
```bash
cd /opt/training-matrix
git pull
docker-compose build --no-cache
docker-compose up -d
```
