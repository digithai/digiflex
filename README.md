# DigiFlex

DigiFlex is a multi-tenant Work From Home (WFH) and leave management application designed for organizations to track and manage employee WFH requests, leave requests, and team schedules. The application provides role-based access control, approval workflows, and integration with Google Calendar for seamless scheduling.

## Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple organizations/tenants with isolated data
- **Role-Based Access Control**: 
  - Superadmins: Manage tenants and system-wide settings
  - Tenant Admins: Manage users, settings, and approve requests within their tenant
  - Approvers: Review and approve/reject WFH requests
  - Users: Submit WFH and leave requests, view their dashboard

### WFH Management
- Submit WFH requests with date selection
- Approval workflow for pending requests
- Visual calendar view showing WFH days
- Restricted day highlighting on calendar
- Automatic Google Calendar sync for approved requests
- Request history and status tracking

### Leave Management
- Submit leave requests (sick leave, time off, etc.)
- Leave balance tracking
- Approval workflow
- Public holiday management
- Leave history and status tracking

### User Management
- User creation and management
- Role assignment (tenant admin, approver, user)
- Position and team assignment
- User profile management
- Active/inactive user status

### Team & Organization
- Team view with member listings
- Position-based organization
- Office and country information
- Employment date tracking

### Settings & Configuration
- Configurable WFH rules and limits
- Email notifications for approvals and rejections
- Tenant-specific settings
- Company information management

### Integration
- Google Calendar integration for WFH events
- Email notifications
- RESTful API architecture

### Security
- JWT-based authentication
- Protected routes and middleware
- Environment-based configuration
- Secure password hashing

## Setup

## Docker

Make sure Docker and Docker Compose are installed on the instance.

1. Go to the directory containing both front-end and back-end directories
3. Make sure the following files are present:
   - .env (generate keys using `openssl rand -base64 64`)
   - .env.sample
   - docker-compose.yml
   - This README
4. Run in a screen

```bash
docker compose build
docker compose up
```

5. When finished, run

```bash
docker compose down
```

## Create a superadmin user

You can create a superadmin user using the provided interactive script:

```bash
cd digiflex-server
npm run create-superadmin
```

The script will prompt you to enter:
- Superadmin name
- Superadmin email
- Superadmin password

Note: Superadmins do not require a tenant assignment. For tenant-level administration, use the Tenant Portal to create tenant admins.

## Database Migration Scripts

### Migrate existing users to Digithai tenant

This script migrates existing database users into the new multi-tenant structure:

1. Creates a default tenant "Digithai" (slug: digithai) if not present
2. Converts existing admins to tenant admins of Digithai
3. Keeps approvers and users with their current roles, assigns them to Digithai
4. Moves all related data (holidays, requests, settings) to Digithai

```bash
cd digiflex-server
npm run migrate-to-digithai
```

## Linting

To run the linters for code quality checks:

```bash
# Server linting
cd digiflex-server
npm run lint

# Client linting
cd digiflex-client
npm run lint
```

## Development

See the `volume` and `command` lines in the `docker-compose.yml` file. During development, uncomment these lines in order to override the Dockerfiles' `CMD` instructions and enable hot reloading.
