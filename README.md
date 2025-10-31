# SVKM Bill Management System

[![Star History Chart](https://api.star-history.com/svg?repos=MonilMehta/SVKM_Bill_Management&type=Date)](https://star-history.com/#MonilMehta/SVKM_Bill_Management&Date)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An Express + MongoDB platform that digitizes SVKM's bill lifecycle: from invoice capture and multi-stage approvals to analytics, reporting, and archival.

## Table of Contents
- [Overview](#overview)
- [Key Capabilities](#key-capabilities)
- [Architecture Highlights](#architecture-highlights)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available npm Scripts](#available-npm-scripts)
- [Roles and Access](#roles-and-access)
- [File Operations](#file-operations)
- [API Surface](#api-surface)
- [Integrations](#integrations)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Overview

Finance teams, site engineers, and approvers rely on this service to submit, validate, approve, and pay vendor invoices. Each bill flows through a configurable workflow, capturing metadata, audit history, SLA metrics, and supporting documents. The backend exposes REST APIs that power an internal React front end and feeds downstream analytics.

## Key Capabilities
- Multi-level bill workflow with state transitions, rejection handling, and audit trails.
- Role-aware access control using JWT authentication and custom middleware.
- Vendor, region, nature-of-work, currency, and taxation master data management.
- CSV and Excel import/export with server-side validation and S3-backed document storage.
- KPI dashboards, workflow stats, and reporting endpoints for process insight.
- Attachment management, Excel/CSV tooling, and archival-ready exports.

## Architecture Highlights
- **API Layer:** `Express` application (`index.js`) wires routes, middleware, and request validation.
- **Data Layer:** `Mongoose` models under `models/` define bills, workflows, users, masters, and audit entities.
- **Workflow Engine:** Controllers in `controllers/` orchestrate state transitions, role permissions, and metrics.
- **Security:** JWT auth (`middleware/middleware.js`) with reset-token support and cookie handling.
- **Storage:** MongoDB for transactional data, AWS S3 for attachments, and optional PDF output via `pdfkit`.
- **Observability:** Health checks at `/health`, structured logging, KPI/stats routes for dashboards.

## Project Structure

```
SVKM_Bill_Management/
├── index.js                 # Express app bootstrap, routing, middleware
├── controllers/             # Business logic for bills, workflow, reports, auth, users, vendors
├── middleware/              # JWT auth, role guards, error helpers
├── models/                  # Mongoose schemas for bills, workflow steps, masters, users, roles
├── routes/                  # API route definitions grouped by domain
├── utils/                   # DB connector, S3 helpers, CSV/Excel tooling, mailer, API schema config
├── constants/               # Role-to-workflow mappings and field access configuration
├── tasks.md                 # Detailed bill processing playbook and role access reference
├── package.json             # Dependencies and npm scripts
└── README.md
```

## Getting Started

1. **Prerequisites**
	- Node.js 18+
	- MongoDB cluster or Atlas connection string
		- AWS S3 bucket (for file uploads)
2. **Clone & Install**
	```bash
	git clone https://github.com/MonilMehta/SVKM_Bill_Management.git
	cd SVKM_Bill_Management
	npm install
	```
3. **Configure Environment**
	- Create `dev.env` (see variables below) and copy to `.env`.
	- Ensure IP allowlists for MongoDB and S3 credentials are active.
4. **Run Locally**
	```bash
	npm run dev
	```
 The server defaults to `http://localhost:5000`.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | HTTP server port (defaults to 5000) | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster/db` |
| `JWT_SECRET` | Primary JWT signing key | `super-secret` |
| `JWT_EXPIRE` | JWT lifetime for model methods | `10h` |
| `RESET_PASSWORD_JWT_SECRET` | Token secret for password reset flows | `reset-secret` |
| `S3_REGION` | AWS region for S3 operations | `ap-south-1` |
| `S3_BUCKET_NAME` | Bucket for attachments | `svkm-bills` |
| `S3_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | AWS secret key | `abc123` |
| `NODE_ENV` | `development` or `production` (affects error responses) | `development` |

> Tip: keep credentials out of version control and rotate secrets periodically.

## Available npm Scripts

- `npm run dev` – Start the server with `nodemon` for hot reload during development.
- `npm start` – Launch the production build with Node.

## Roles and Access

The system supports the following user roles:

- Site Team
- Quality Engineer
- Quantity Surveyor (QS)
- Site Engineer
- Site In-charge
- PIMO Team
- QS Mumbai
- IT Department
- Directors / Advisors / Trustees
- Accounts Department

## File Operations

- **Attachment Handling:** Uploaded documents are stored via AWS S3 using helpers in `utils/s3.js`. Files are versioned with timestamped keys for traceability.
- **Bulk Imports:** Controllers under `routes/excel-route.js` and `routes/bill-route.js` accept CSV and Excel payloads. Validation errors are aggregated per row to ease correction cycles.
- **Bulk Exports:** Finance teams can pull filtered bill datasets and reports using `/bill/export` and `/api/reports` endpoints, powered by `exceljs` and `json2csv`.
- **Archival Support:** Utility scripts in `utils/` (e.g., `csv-patch.js`, `vendor-csv-utils.js`) streamline data hygiene and master-data updates across environments.

## API Surface

- **Auth** (`/auth`): register, login, password update, session management.
- **Bills & Workflow** (`/bill`, `/workflow`, `/sentBills`, `/kpi`, `/stats`): CRUD operations, workflow history, KPI dashboards.
- **Masters** (`/master`, `/vendors`, `/users`, `/role`): manage reference data, user roles, and vendor onboarding.
- **Reporting** (`/api/reports`): export-ready datasets for finance and compliance.
- **File Operations** (`/excel`, `/bill/import`): CSV/Excel ingestion, template downloads, export endpoints.

## Integrations

- **CSV/Excel Tooling:** `/excel` routes and utilities handle ingestion, patching, and regeneration of spreadsheets.
- **AWS S3:** `utils/s3.js` encapsulates upload/delete operations; grant IAM permissions for `PutObject`, `GetObject`, and `DeleteObject` on the target bucket.
- **PDF Generation:** `pdfkit` support enables downstream creation of invoice summaries or approval packs.

## Troubleshooting

- **Mongo Connection Issues**: Verify `MONGODB_URI` and network allowlist. The server logs connection status on startup.
- **JWT Errors**: Ensure `JWT_SECRET` and `RESET_PASSWORD_JWT_SECRET` are defined; tokens issued prior to rotation become invalid.
- **File Upload Failures**: Multer errors surface as `File upload error` responses. Check file size limits, allowed MIME types, and S3 credentials.
- **CORS Problems**: Update the allowed origins array in `index.js` to match your front-end domain.

## Additional Resources

- Front-end client (React + Material UI): request access to the dedicated repository.

License: MIT