# 🏥 Aethera-CRM

**AI-Powered Healthcare Provider CRM**

![Status](https://img.shields.io/badge/status-phase%201%20complete-green)
![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers%20%7C%20Pages-blue)
![License](https://img.shields.io/badge/license-proprietary-red)

---

## 📖 Overview

Aethera-CRM is a comprehensive customer relationship management system designed specifically for healthcare provider management. Built on Cloudflare's serverless platform with integrated AI capabilities, it streamlines provider data management, lead tracking, and customer relationships.

### Key Features

- ✅ **Contact & Organization Management** - Full CRM functionality
- ✅ **Lead Management with AI Scoring** - Intelligent lead prioritization
- ✅ **Deal Pipeline** - Visual Kanban board for sales tracking
- ✅ **Activity Tracking** - Calls, emails, meetings, tasks
- ✅ **Provider Directory** - NPPES integration for healthcare providers
- ✅ **Email Integration** - Gmail sync with AI assistance (Phase 5)
- ✅ **AI Call Assistant** - Real-time call transcription and suggestions (Phase 8)
- ✅ **Workflow Automation** - 24 pre-built automation workflows (Phase 9)
- ✅ **Public Provider Directory** - Searchable provider database

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (v20 recommended)
- **npm or yarn**
- **Cloudflare account** with Workers, Pages, D1, and AI Gateway access

### Installation (Automated)

```powershell
# Run as Administrator
cd C:\Aethera-CRM
.\scripts\install-prerequisites.ps1

# After restart, run:
.\scripts\setup.ps1
```

### Manual Installation

```powershell
# 1. Install Node.js from https://nodejs.org

# 2. Install dependencies
cd cloudflare\workers
npm install

cd ..\pages
npm install

# 3. Setup Cloudflare
cd ..
.\scripts\setup-cloudflare.ps1

# 4. Start development servers
# Terminal 1 - Backend
cd cloudflare\workers
npm run dev

# Terminal 2 - Frontend
cd ..\pages
npm run dev
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8787
- **Default Login:** `aethera` / `Aetherahealthcare@2026`

---

## 📁 Project Structure

```
Aethera-CRM/
├── cloudflare/
│   ├── workers/          # Backend API (Hono.js + TypeScript)
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints (13 modules)
│   │   │   ├── middleware/
│   │   │   ├── db/       # Database schema & migrations
│   │   │   ├── services/ # Business logic
│   │   │   └── utils/    # Helpers & validation
│   │   └── wrangler.toml
│   └── pages/            # Frontend (React + Ant Design)
│       ├── src/
│       │   ├── modules/  # App modules (10 components)
│       │   ├── components/
│       │   ├── services/ # API client
│       │   └── stores/   # State management
│       └── package.json
├── scripts/              # Setup & deployment scripts
├── docs/                 # Documentation
└── .env                  # Environment configuration
```

---

## 🔧 Technology Stack

### Backend
- **Runtime:** Cloudflare Workers
- **Framework:** Hono.js
- **Language:** TypeScript
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Queues:** Cloudflare Queues
- **AI:** Cloudflare AI Gateway (Gemma, Llama, Mistral)

### Frontend
- **Framework:** React 18
- **UI Library:** Ant Design 5.x
- **Build Tool:** Vite
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Routing:** React Router v6

### Integrations (Phased)
- **NPPES API** - Provider data import
- **Gmail API** - Email sync
- **Twilio** - Voice & SMS
- **Medicare/Medicaid** - Enrollment verification
- **n8n** - Workflow automation
- **DocuSeal** - E-signatures
- **Cal.com** - Meeting scheduling
- **Jitsi** - Video conferencing

---

## 📊 Implementation Status

### ✅ Phase 1 Complete (Days 1-5)
- [x] Project scaffolding
- [x] Database schema (20+ tables)
- [x] Authentication system
- [x] Core CRUD APIs (all modules)
- [x] Frontend UI components
- [x] Environment configuration

### 📋 Upcoming Phases

| Phase | Focus | Timeline |
|-------|-------|----------|
| **Phase 2** | Core CRM Enhancements | Week 2 |
| **Phase 3** | NPPES Integration | Week 3 |
| **Phase 4** | Email Scraping | Week 4 |
| **Phase 5** | Gmail Integration | Week 5 |
| **Phase 6** | AI Features | Week 6 |
| **Phase 7** | Self-Hosted Services | Week 7 |
| **Phase 8** | Twilio + AI Call Assistant | Week 8 |
| **Phase 9** | Workflow Automation | Week 9 |
| **Phase 10** | Provider Directory | Week 10 |
| **Phase 11** | Backup + Polish | Week 11 |
| **Phase 12** | Testing + Documentation | Week 12 |

---

## 🔐 Security

- **Authentication:** JWT + API Keys + OAuth 2.0
- **Authorization:** Role-based access control
- **Data Protection:** Encryption at rest and in transit
- **Audit Logging:** All actions tracked
- **Rate Limiting:** 1000 requests/hour per API key
- **Input Validation:** Zod schemas on all endpoints

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | <200ms | TBD |
| Database Query Time | <100ms | TBD |
| Frontend Load Time | <2s | TBD |
| Search Results | <500ms | TBD |
| AI Inference | <5s | TBD |

---

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Cloudflare Workers | ~$10-50 |
| Cloudflare Pages Pro | $20 |
| Cloudflare D1 | ~$5-10 |
| Cloudflare AI Gateway | ~$50-200 |
| Cloudflare R2 | $0-10 |
| Twilio | ~$20 |
| **Total** | **~$105-310/month** |

*Note: Actual costs depend on usage volume*

---

## 📚 Documentation

- **[INSTALL.md](INSTALL.md)** - Installation guide
- **[docs/SETUP.md](docs/SETUP.md)** - Detailed setup instructions
- **[docs/PHASE1-STATUS.md](docs/PHASE1-STATUS.md)** - Phase 1 status
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Complete status report
- **[API Documentation](#)** - OpenAPI spec (coming soon)

---

## 🧪 Testing

```powershell
# Run tests (coming in Phase 12)
cd cloudflare\workers
npm test

cd ..\pages
npm test
```

---

## 🚀 Deployment

### Deploy Backend

```powershell
cd cloudflare\workers
npm run deploy
```

### Deploy Frontend

```powershell
cd cloudflare\pages
npm run build
npx wrangler pages deploy dist
```

---

## 🐛 Troubleshooting

### Common Issues

**Node.js not found:**
- Install from https://nodejs.org
- Restart computer after installation
- Open new terminal window

**Wrangler authentication errors:**
```powershell
npx wrangler login
```

**Database errors:**
```powershell
npx wrangler d1 execute aethera-crm-db --file=src/db/schema.sql
```

**Port conflicts:**
```powershell
# Kill process on port 8787 or 5173
netstat -ano | findstr :8787
taskkill /PID <PID> /F
```

---

## 📞 Support

- **Email:** info@aetherahealthcare.com
- **Documentation:** See docs/ folder
- **Status:** Check IMPLEMENTATION_STATUS.md

---

## 📝 License

Proprietary - Aethera Healthcare © 2026

---

## 🎯 Roadmap

### Q2 2026
- ✅ Phase 1: Foundation
- ⏳ Phase 2-6: Core features + AI
- ⏳ Phase 7-12: Advanced features

### Q3 2026
- Mobile app (React Native)
- Advanced analytics
- Multi-tenant support
- API marketplace

### Q4 2026
- Enterprise features
- White-label options
- Advanced AI features
- Integration marketplace

---

**Built with ❤️ for Healthcare Provider Management**
