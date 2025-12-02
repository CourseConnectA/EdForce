# Edforce CRM - Enterprise Customer Relationship Management System

A modern, full-stack Customer Relationship Management (CRM) system built with enterprise-grade technologies and best practices.

## 🏗️ Architecture Overview

### Backend Stack
- **Framework**: Node.js with NestJS
- **Database**: PostgreSQL 15+ with TypeORM
- **API**: REST API with OpenAPI/Swagger documentation
- **Authentication**: JWT tokens with refresh mechanism
- **Caching**: Redis for session and data caching
- **Search**: Elasticsearch for full-text search
- **Queue**: Redis/Bull for background jobs

### Frontend Stack
- **Framework**: React 18+ with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Build Tool**: Vite
- **Charts**: Chart.js for data visualization
- **PWA**: Progressive Web App capabilities

## 📊 Core Features

### CRM Modules

### Custom Fields (Dynamic)
- Define custom fields per module (Leads, Opportunities, Contacts) in Settings
- Supported types: text, textarea, number, date, boolean, select, multiselect
- **Authentication & Authorization**: Role-based access control (RBAC)
- **Multi-tenancy**: Support for multiple organizations
- **Reporting & Analytics**: Comprehensive reporting system
- **Real-time Updates**: WebSocket integration
- **Mobile Support**: Responsive design and PWA

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- PostgreSQL 15+ 
- Redis 7+
- npm 9+ or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Edforce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start with Docker (Recommended)**
   ```bash
   docker-compose up -d
   ```

5. **Or start manually**
   ```bash
   # Start backend
   cd backend
   npm run start:dev

   # Start frontend (in another terminal)
   cd frontend
   npm run dev
   ```

### Access the Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000/api
- **API Documentation**: http://localhost:3000/api/docs

## 📁 Project Structure

```
Edforce/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── modules/        # Feature modules (accounts, contacts, etc.)
│   │   ├── database/       # Database configuration and migrations
│   │   ├── common/         # Shared utilities and decorators
│   │   └── main.ts         # Application entry point
│   ├── package.json
│   └── Dockerfile
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and slices
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom React hooks
│   │   └── theme/          # Material-UI theme configuration
│   ├── package.json
│   └── Dockerfile
├── shared/                 # Shared TypeScript types and interfaces
│   ├── src/
│   │   ├── entities.ts     # Business entity interfaces
│   │   ├── dto.ts          # Data Transfer Objects
│   │   └── enums.ts        # Shared enumerations
│   └── package.json
├── docker-compose.yml      # Docker services configuration
└── package.json           # Root package.json for workspace
```

## 🔧 Development

### Available Scripts

From the root directory:
- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications

### Backend Scripts
- `npm run start:dev` - Start backend in development mode
- `npm run migration:generate` - Generate new database migration
- `npm run migration:run` - Run pending migrations
- `npm run seed` - Seed database with sample data

### Frontend Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build locally

## ⚙️ Custom Fields: How to Use

1) Open Settings > Custom Fields in the app sidebar
2) Choose the module tab (Leads, Opportunities, Contacts)
3) Click “Add Field” and configure:
   - Label and optional Key (auto-generated from label if omitted)
   - Type (text, number, select, etc.)
   - Required, Order, Help Text
   - For selects, enter options (one per line)
4) Save. The new field immediately appears in that module’s create/edit form under “Custom Fields”
5) Values save along with the record; you can edit or delete fields anytime

Backend endpoints (JWT-protected, NestJS):
- GET `/custom-fields/definitions?entityType=lead|opportunity|contact`
- POST `/custom-fields/definitions` (create)
- PATCH `/custom-fields/definitions/:id` (update)
- DELETE `/custom-fields/definitions/:id` (delete)
- POST `/custom-fields/values` with `{ entityType, recordId, values: { key: value } }`
- GET `/custom-fields/values?entityType=...&recordId=...`

Implementation details:
- Definitions: `custom_field_definitions` (TypeORM entity)
- Values: `custom_field_values` (JSONB value, per record)
- Frontend dynamic renderer: `src/components/custom-fields/CustomFieldsRenderer.tsx`
- Settings page: `src/pages/settings/CustomFieldsPage.tsx`

## 🗄️ Database Schema

The system uses PostgreSQL with the following core entities:

### Core Business Entities
- **Account**: Companies and organizations
- **Contact**: Individual contacts
- **Lead**: Potential customers
- **Opportunity**: Sales opportunities
- **Case**: Customer service cases

### Activity Entities
- **Task**: To-do items and activities
- **Meeting**: Scheduled meetings
- **Call**: Phone call records
- **Email**: Email communications

### Sales Entities
- **Product**: Product catalog
- **Quote**: Price quotes
- **Invoice**: Billing documents

### System Entities
- **User**: System users
- **Role**: User roles and permissions
- **Campaign**: Marketing campaigns

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: TypeORM query builder protection
- **XSS Protection**: Content Security Policy headers
- **Rate Limiting**: API request rate limiting
- **HTTPS Enforcement**: SSL/TLS encryption in production

## 📊 API Documentation

The API is fully documented using OpenAPI/Swagger specification:
- **Local**: http://localhost:3000/api/docs
- **Authentication**: Bearer token required for protected endpoints
- **Rate Limits**: 100 requests per 15 minutes per IP
- **Versioning**: API versioning support

## 🔄 State Management

### Redux Store Structure
```typescript
{
  auth: {          // Authentication state
    user: User | null,
    isAuthenticated: boolean,
    tokens: { access, refresh }
  },
  ui: {            // UI state
    sidebarOpen: boolean,
    loading: boolean,
    notifications: []
  },
  accounts: {      // Accounts module state
    accounts: Account[],
    selectedAccount: Account | null,
    filters: FilterState
  },
  // ... other modules
}
```

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first responsive layout
- **Dark/Light Theme**: Theme switching capability
- **Data Tables**: Advanced filtering, sorting, and pagination
- **Forms**: Dynamic form generation with validation
- **Charts**: Interactive data visualizations
- **Drag & Drop**: Intuitive drag-and-drop interfaces
- **Real-time Updates**: Live data synchronization
- **Progressive Web App**: Offline capability and app-like experience

## 🧪 Testing

### Backend Testing
- **Unit Tests**: Jest-based unit testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: End-to-end testing with Supertest

### Frontend Testing
- **Component Tests**: React Testing Library
- **Hook Tests**: Custom hook testing
- **Integration Tests**: User interaction testing

Run tests:
```bash
npm test
```

## 📈 Performance Optimization

- **Database Indexing**: Optimized database queries
- **Caching**: Redis caching for frequently accessed data
- **Code Splitting**: Lazy loading of route components
- **Bundle Optimization**: Webpack optimization techniques
- **Image Optimization**: Responsive images and lazy loading
- **CDN Integration**: Static asset delivery optimization

## 🚀 Deployment

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Build applications:
   ```bash
   npm run build
   ```

2. Set production environment variables
3. Start production servers
4. Configure reverse proxy (Nginx)
5. Set up SSL certificates

### Production start notes
- Always build the backend before starting it in production mode to avoid stale compiled artifacts:
   - From `backend/`: use `npm run serve:prod` (builds then runs `node dist/main`).
   - If you use `npm run start:prod` directly, ensure you ran `npm run build` beforehand.

### Troubleshooting: Lead create returns 403
- Roles allowed to create leads: Center Manager and Counselor only.
- If you see 403 when creating a lead while authenticated as one of these roles:
   1) Ensure backend was started with a fresh build (`npm run serve:prod`).
   2) As a temporary workaround, you can route creates to the fallback endpoint `/api/leads/open-create`.
       - Frontend can toggle this via env: set `VITE_USE_OPEN_CREATE=true` and rebuild the frontend.
   3) Verify your token role claims via `/api/auth/profile`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the [API documentation](http://localhost:3000/api/docs)
- Review the [project wiki](wiki-url)

## 🗺️ Roadmap

### Phase 1 ✅
- [x] Core architecture setup
- [x] Authentication system
- [x] Basic CRUD operations
- [x] Database schema

### Phase 2 🚧
- [ ] Advanced reporting
- [ ] Email integration
- [ ] Mobile app
- [ ] Third-party integrations

### Phase 3 📋
- [ ] AI/ML features
- [ ] Advanced analytics
- [ ] Workflow automation
- [ ] Multi-language support

---

**Built with ❤️ using modern web technologies**