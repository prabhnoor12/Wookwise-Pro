# Sexy-Saas-2 Backend

This backend powers a SaaS platform for managing bookings, clients, services, and business operations. It provides a secure, multi-tenant REST API with automated background jobs, authentication, and integrations.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (admin, user, owner)
  - Middleware for resource ownership and permissions

- **Business & Tenant Management**
  - Isolated data per business/tenant
  - CRUD for businesses and settings

- **Service Management**
  - Create, update, delete, and list services
  - Assign providers and manage availability

- **Booking System**
  - Create, update, cancel, and list bookings
  - Automated email notifications and reminders
  - Support for recurring and group bookings

- **Client Management**
  - Manage client records, search, import/export
  - View client booking history

- **Provider Scheduling**
  - Manage provider availability and breaks

- **Recurring Invoices & Reminders**
  - Automated jobs for generating invoices and sending reminders

- **Dashboard & Reporting**
  - Endpoints for dashboard data and analytics

- **File Uploads**
  - S3 integration for secure file storage

- **Error Handling**
  - Centralized error and validation middleware

- **Background Jobs**
  - Queue and worker system for background processing

- **Audit Logging**
  - Track critical actions for security and compliance

- **API Rate Limiting**
  - Protect resources by limiting requests per user/IP

- **OpenAPI/Swagger Documentation**
  - Auto-generated, interactive API documentation

## Main API Endpoints

- `GET /api/services` — List services
- `POST /api/services` — Add service
- `GET /api/clients` — List clients
- `POST /api/clients` — Add client
- `GET /api/bookings` — List bookings
- `POST /api/bookings` — Add booking (triggers email)
- `GET /api/dashboard` — Dashboard data

## Automated Jobs

- Recurring invoice generation
- Booking reminders
- Can be triggered manually or via scheduler

## Setup

1. Install dependencies:
   ```sh
   npm install
