# Unified Tech Stack Implementation Plan | Payload CMS

# Viceroy Bali 2026 Case

## Executive Summary

**Project:** Luxury Hotel Branding, Blog & Booking Platform  
**Timeline:** 22 working days (160 hours)  
**Deployment:** GCP Cloud Run  
**Go-Live Target:** Day 22


## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE CDN                           │
│                  (SSL, DDoS, Edge Caching)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   GCP CLOUD LOAD BALANCER                       │
│              (Global IP, SSL Termination)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    GCP CLOUD RUN (Containerized)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         NEXT.JS 15 APP (Single Unified Service)           │  │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐    │  │
│  │  │   FRONTEND (RSC)    │  │   PAYLOAD CMS 3.0        │    │  │
│  │  │  - Homepage         │  │   - Admin (/admin)       │    │  │
│  │  │  - Suites           │  │   - Content API          │    │  │
│  │  │  - Experiences      │  │   - Media Management     │    │  │
│  │  │  - Blog             │  │   - RBAC Auth            │    │  │
│  │  │  - Booking Flow     │  │   - Figma Sync           │    │  │
│  │  └─────────────────────┘  └──────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │        NEXT.JS ROUTE HANDLERS (API Layer)            │ │  │
│  │  │  - /api/cloudbed/* (Booking Bridge)                  │ │  │
│  │  │  - /api/availability (Redis Cache)                   │ │  │
│  │  │  - /api/contact                                      │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐  ┌──────────▼────────┐  ┌────────▼────────┐
│ CLOUD SQL    │  │ MEMORYSTORE       │  │ CLOUD STORAGE   │
│ (PostgreSQL) │  │ (Redis)           │  │ (GCS Buckets)   │
│              │  │                   │  │                 │
│ - Content    │  │ - Session Cache   │  │ - Images 4K     │
│ - Users      │  │ - Availability    │  │ - Videos        │
│ - Blog Posts │  │ - Rate Limiting   │  │ - Documents     │
└──────────────┘  └───────────────────┘  └─────────────────┘
        │
┌───────▼────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                     │
│  - Cloudbed API (Booking Engine)                       │
│  - Figma API (Design Tokens Sync)                      │
│  - Google Analytics 4                                  │
│  - Sentry (Error Tracking)                             │
└────────────────────────────────────────────────────────┘
```

## 2. Project Structure

```
viceroy-bali/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-production.yml
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   └── FIGMA_SYNC_GUIDE.md
│
├── reference/
│   ├── brand-guidelines.md
│   ├── content-strategy.md
│   ├── cloudbed-api-specs.txt
│   └── design-tokens-mapping.txt
│
├── scripts/
│   ├── setup-local.sh
│   ├── setup-gcp.sh
│   ├── db-migrate.sh
│   ├── seed-content.sh
│   └── build-deploy.sh
│
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── (frontend)/               # Guest-facing routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── suites/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── experiences/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── dining/
│   │   │   │   └── page.tsx
│   │   │   ├── wellness/
│   │   │   │   └── page.tsx
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── contact/
│   │   │   │   └── page.tsx
│   │   │   └── booking/
│   │   │       ├── page.tsx
│   │   │       └── confirmation/page.tsx
│   │   │
│   │   ├── (payload)/                # Payload CMS Admin
│   │   │   └── admin/[[...segments]]/page.tsx
│   │   │
│   │   └── api/                      # Next.js Route Handlers
│   │       ├── cloudbed/
│   │       │   ├── availability/route.ts
│   │       │   ├── booking/route.ts
│   │       │   └── rates/route.ts
│   │       ├── contact/route.ts
│   │       ├── newsletter/route.ts
│   │       └── figma-sync/route.ts
│   │
│   ├── payload/                      # Payload CMS Configuration
│   │   ├── collections/
│   │   │   ├── Media.ts
│   │   │   ├── Users.ts
│   │   │   ├── Pages.ts
│   │   │   ├── BlogPosts.ts
│   │   │   ├── Suites.ts
│   │   │   ├── Experiences.ts
│   │   │   ├── Amenities.ts
│   │   │   └── SiteSettings.ts
│   │   │
│   │   ├── blocks/                   # Reusable Page Blocks
│   │   │   ├── Hero.ts
│   │   │   ├── Gallery.ts
│   │   │   ├── RichText.ts
│   │   │   ├── FeatureGrid.ts
│   │   │   ├── BookingWidget.ts
│   │   │   ├── Testimonials.ts
│   │   │   └── Newsletter.ts
│   │   │
│   │   ├── fields/                   # Reusable Field Groups
│   │   │   ├── seo.ts
│   │   │   ├── slug.ts
│   │   │   └── meta.ts
│   │   │
│   │   ├── access/                   # RBAC Logic
│   │   │   ├── isAdmin.ts
│   │   │   └── isEditor.ts
│   │   │
│   │   ├── hooks/                    # Payload Lifecycle Hooks
│   │   │   ├── revalidatePage.ts
│   │   │   └── syncToRedis.ts
│   │   │
│   │   └── payload.config.ts         # Master Configuration
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # Base UI Components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.module.scss
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── DatePicker/
│   │   │
│   │   ├── blocks/                   # Payload Block Renderers
│   │   │   ├── HeroBlock.tsx
│   │   │   ├── GalleryBlock.tsx
│   │   │   ├── RichTextBlock.tsx
│   │   │   └── BookingWidgetBlock.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Header.module.scss
│   │   │   │   └── Navigation.tsx
│   │   │   ├── Footer/
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Footer.module.scss
│   │   │   └── BookingBar/
│   │   │
│   │   └── features/
│   │       ├── booking/
│   │       │   ├── AvailabilityCalendar.tsx
│   │       │   ├── RoomSelector.tsx
│   │       │   └── CheckoutForm.tsx
│   │       └── blog/
│   │           ├── BlogCard.tsx
│   │           └── RelatedPosts.tsx
│   │
│   ├── lib/                          # Utility Libraries
│   │   ├── cloudbed/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── transforms.ts
│   │   ├── redis/
│   │   │   ├── client.ts
│   │   │   └── cache.ts
│   │   ├── gcs/
│   │   │   └── client.ts
│   │   ├── figma/
│   │   │   └── sync.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       ├── validators.ts
│   │       └── seo.ts
│   │
│   ├── styles/                       # Global Styles
│   │   ├── globals.scss
│   │   ├── variables.scss            # Design Tokens
│   │   ├── mixins.scss
│   │   ├── animations.scss
│   │   └── typography.scss
│   │
│   ├── types/                        # TypeScript Definitions
│   │   ├── cloudbed.ts
│   │   ├── payload.ts
│   │   └── global.ts
│   │
│   └── middleware.ts                 # Next.js Middleware
│
├── public/
│   ├── fonts/
│   ├── icons/
│   └── static/
│
├── .env.example
├── .env.local
├── .dockerignore
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 3. Technology Stack Specifications

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **next** | ^15.0.3 | App Router, RSC, Route Handlers |
| **react** | ^19.0.0 | UI Components, Server Components |
| **payload** | ^3.0.0 | Headless CMS, Admin Panel |
| **typescript** | ^5.6.0 | Type Safety |
| **@payloadcms/db-postgres** | ^3.0.0 | PostgreSQL Adapter |
| **@payloadcms/richtext-lexical** | ^3.0.0 | Rich Text Editor |
| **drizzle-orm** | ^0.35.0 | SQL ORM (Payload Internal) |
| **pg** | ^8.13.0 | PostgreSQL Driver |
| **ioredis** | ^5.4.0 | Redis Client |
| **@google-cloud/storage** | ^7.14.0 | GCS Integration |
| **@google-cloud/secret-manager** | ^5.8.0 | Secrets Management |

## 4. Installation Commands

### Initial Setup

```bash
# Create project directory
mkdir viceroy-bali && cd viceroy-bali

# Initialize PNPM workspace
pnpm init

# Install Next.js with TypeScript
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install Payload CMS
pnpm add payload @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/next

# Install Database & Caching
pnpm add pg drizzle-orm ioredis

# Install GCP Services
pnpm add @google-cloud/storage @google-cloud/secret-manager

# Install UI & Styling
pnpm add sass clsx class-variance-authority framer-motion

# Install Date/Time Utilities
pnpm add date-fns react-day-picker

# Install Form & Validation
pnpm add react-hook-form @hookform/resolvers zod

# Install Development Dependencies
pnpm add -D @types/node @types/react @types/react-dom
pnpm add -D eslint eslint-config-next prettier
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D drizzle-kit tsx dotenv-cli
```

### Optional Performance & Monitoring

```bash
# Analytics & Monitoring
pnpm add @vercel/analytics @sentry/nextjs sharp

# Image Optimization
pnpm add next-image-export-optimizer

# SEO
pnpm add next-seo schema-dts
```

## 5. Configuration Files

### package.json

```json
{
  "name": "viceroy-bali",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev": "cross-env NODE_OPTIONS='--inspect' next dev",
    "build": "next build",
    "start": "next start -p ${PORT:-3000}",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "payload": "payload",
    "generate:types": "payload generate:types",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "payload migrate",
    "db:seed": "tsx scripts/seed.ts",
    "setup:local": "bash scripts/setup-local.sh",
    "setup:gcp": "bash scripts/setup-gcp.sh",
    "format": "prettier --write \"src/**/*.{ts,tsx,scss}\"",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'src/*'
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Payload CMS Admin Integration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },

  // Image Optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/viceroy-bali-assets/**'
      }
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/login',
        permanent: false
      }
    ]
  }
}

module.exports = nextConfig
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4AF37',
          charcoal: '#2C2C2C',
          cream: '#F5F5DC',
          forest: '#1B4D3E',
          stone: '#8B8680'
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        serif: ['var(--font-playfair)']
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')
  ]
}

export default config
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/styles/*": ["./src/styles/*"],
      "@/types/*": ["./src/types/*"],
      "@/payload/*": ["./src/payload/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### .env.example

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_URL=http://localhost:3000
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/viceroy_bali
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=viceroy_bali
POSTGRES_USER=user
POSTGRES_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Payload CMS
PAYLOAD_SECRET=your-secret-key-min-32-chars
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Google Cloud Platform
GCP_PROJECT_ID=viceroy-bali-prod
GCP_STORAGE_BUCKET=viceroy-bali-assets
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json

# Cloudbed API
CLOUDBED_API_KEY=your-cloudbed-api-key
CLOUDBED_PROPERTY_ID=your-property-id
CLOUDBED_API_URL=https://api.cloudbed.com/v1

# Figma (Optional)
FIGMA_ACCESS_TOKEN=your-figma-token
FIGMA_FILE_KEY=your-file-key

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=your-sentry-dsn

# Email (Contact Forms)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reservations@viceroybali.com
SMTP_PASSWORD=your-app-password
```

## 6. Setup Scripts

### scripts/setup-local.sh

```bash
#!/bin/bash
set -e

echo "🏝️  Viceroy Bali - Local Development Setup"
echo "=========================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ PNPM required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start Docker services (PostgreSQL + Redis)
echo "🐳 Starting PostgreSQL and Redis..."
docker-compose up -d

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm db:migrate

# Generate TypeScript types
echo "⚙️  Generating Payload types..."
pnpm generate:types

# Seed initial data (optional)
read -p "🌱 Seed sample content? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm db:seed
fi

echo ""
echo "✅ Setup complete!"
echo "🚀 Run 'pnpm dev' to start development server"
echo "🔑 Admin: http://localhost:3000/admin"
```

### scripts/setup-gcp.sh

```bash
#!/bin/bash
set -e

echo "☁️  Viceroy Bali - GCP Infrastructure Setup"
echo "==========================================="

# Variables
PROJECT_ID="viceroy-bali-prod"
REGION="asia-southeast1"
ZONE="asia-southeast1-a"
DB_INSTANCE="viceroy-db-prod"
REDIS_INSTANCE="viceroy-redis-prod"
BUCKET_NAME="viceroy-bali-assets"

# Authenticate
echo "🔐 Authenticating with GCP..."
gcloud auth login

# Set project
echo "📋 Setting project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling GCP APIs..."
gcloud services enable sqladmin.googleapis.com
gcloud services enable redis.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create Cloud SQL (PostgreSQL)
echo "🗄️  Creating Cloud SQL instance..."
gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-8192 \
    --region=$REGION \
    --storage-type=SSD \
    --storage-size=50GB \
    --storage-auto-increase \
    --backup-start-time=03:00

# Create database
gcloud sql databases create viceroy_bali --instance=$DB_INSTANCE

# Create Redis instance
echo "💾 Creating Redis instance..."
gcloud redis instances create $REDIS_INSTANCE \
    --size=2 \
    --region=$REGION \
    --redis-version=redis_7_0 \
    --tier=standard

# Create GCS bucket
echo "🪣 Creating Cloud Storage bucket..."
gcloud storage buckets create gs://$BUCKET_NAME \
    --location=$REGION \
    --public-access-prevention \
    --uniform-bucket-level-access

# Create service account
echo "🔑 Creating service account..."
gcloud iam service-accounts create viceroy-app \
    --display-name="Viceroy Application Service Account"

# Grant permissions
SERVICE_ACCOUNT="viceroy-app@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/redis.editor"

gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.objectAdmin"

# Create service account key
echo "📥 Downloading service account key..."
gcloud iam service-accounts keys create ./gcp-service-account.json \
    --iam-account=$SERVICE_ACCOUNT

echo ""
echo "✅ GCP Infrastructure Setup Complete!"
echo "📝 Next steps:"
echo "   1. Update .env.local with connection strings"
echo "   2. Run database migrations"
echo "   3. Deploy with 'pnpm deploy:production'"
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: viceroy-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: viceroy_bali
      POSTGRES_USER: viceroy
      POSTGRES_PASSWORD: viceroy_local_dev_2024
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U viceroy"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: viceroy-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Dockerfile

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ARG DATABASE_URL
ARG PAYLOAD_SECRET
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

## 7. Implementation Timeline (22 Days)

### **Week 1: Foundation & Infrastructure** (Days 1-5, 40 hours)

#### Day 1-2: Environment Setup (16 hours)
- ✅ Initialize project structure
- ✅ Configure Next.js 15 + TypeScript
- ✅ Setup local Docker (PostgreSQL + Redis)
- ✅ Install and configure Payload CMS 3.0
- ✅ Create base collections (Users, Media, Pages)
- ✅ Configure Tailwind + SCSS architecture
- ✅ Setup ESLint, Prettier, Git hooks

**Deliverable:** Working local development environment

#### Day 3-4: GCP Infrastructure (16 hours)
- ✅ Setup GCP project and billing
- ✅ Provision Cloud SQL (PostgreSQL)
- ✅ Configure Cloud Memorystore (Redis)
- ✅ Create GCS buckets for media
- ✅ Setup Secret Manager
- ✅ Configure service accounts and IAM
- ✅ Test database connectivity

**Deliverable:** Production infrastructure ready

#### Day 5: Cloudbed Integration Setup (8 hours)
- ✅ Review Cloudbed API documentation
- ✅ Create API client wrapper (`lib/cloudbed/`)
- ✅ Implement authentication flow
- ✅ Build availability checker
- ✅ Create booking bridge route handlers
- ✅ Setup Redis caching for availability

**Deliverable:** Cloudbed API integration foundation

### **Week 2: CMS Configuration & Content Architecture** (Days 6-10, 40 hours)

#### Day 6-7: Payload Collections & Blocks (16 hours)
- ✅ **Collections:**
  - Suites (name, description, amenities, gallery, pricing tier)
  - Experiences (title, category, description, duration, gallery)
  - Blog Posts (title, author, content, categories, SEO)
  - Amenities (icon, name, description)
  - Site Settings (global config, contact info, social links)

- ✅ **Blocks:**
  - Hero (full-screen, video background support)
  - Gallery (lightbox, 4K image support)
  - Rich Text (Lexical editor)
  - Feature Grid (services, amenities)
  - Booking Widget (Cloudbed embed)
  - Testimonials (carousel)
  - Newsletter (subscription form)

**Deliverable:** Complete CMS data model

#### Day 8-9: Admin Panel Customization (16 hours)
- ✅ Configure RBAC (Admin, Editor roles)
- ✅ Custom dashboard widgets
- ✅ Media library optimization (GCS integration)
- ✅ Implement upload hooks (image optimization, CDN)
- ✅ Create content preview functionality
- ✅ Build SEO field groups
- ✅ Setup content versioning

**Deliverable:** Production-ready admin panel

#### Day 10: Figma Design System Sync (8 hours)
- ✅ Extract design tokens from Figma
- ✅ Map tokens to SCSS variables
- ✅ Create component mapping documentation
- ✅ Build Figma webhook listener (optional)
- ✅ Generate style guide page

**Deliverable:** Design-to-code pipeline

### **Week 3: Frontend Development** (Days 11-16, 48 hours)

#### Day 11-12: Core Layout & Navigation (16 hours)
- ✅ Header component (sticky, transparent on scroll)
- ✅ Multi-level navigation menu
- ✅ Mobile hamburger menu
- ✅ Booking bar (floating, always accessible)
- ✅ Footer (site links, social, newsletter)
- ✅ Loading states and skeletons

**Deliverable:** Responsive site chrome

#### Day 13-14: Homepage & Luxury Pages (16 hours)
- ✅ Homepage hero (video background, parallax)
- ✅ Suite showcase carousel
- ✅ Experience highlights grid
- ✅ Testimonials section
- ✅ Instagram feed integration
- ✅ Suites listing page
- ✅ Suite detail pages (dynamic routing)
- ✅ Experiences listing page
- ✅ Experience detail pages

**Deliverable:** Main marketing pages

#### Day 15: Blog System (8 hours)
- ✅ Blog listing (pagination, filters)
- ✅ Blog post detail (related posts)
- ✅ Category pages
- ✅ Search functionality
- ✅ Social sharing buttons
- ✅ Author bio cards

**Deliverable:** Content marketing engine

#### Day 16: Booking Flow (8 hours)
- ✅ Availability calendar (Cloudbed data)
- ✅ Room selection interface
- ✅ Guest information form
- ✅ Special requests field
- ✅ Booking summary
- ✅ Cloudbed redirect/iframe integration
- ✅ Confirmation page

**Deliverable:** End-to-end booking flow

### **Week 4: Polish, Performance & Launch** (Days 17-22, 32 hours)

#### Day 17-18: Animations & Micro-interactions (16 hours)
- ✅ Page transitions (Framer Motion)
- ✅ Scroll-triggered animations (GSAP/Intersection Observer)
- ✅ Hover effects on cards/buttons
- ✅ Image lazy loading
- ✅ Parallax effects
- ✅ Smooth scrolling

**Deliverable:** Luxury brand polish

#### Day 19: SEO & Performance Optimization (8 hours)
- ✅ Metadata generation (per page)
- ✅ Open Graph tags
- ✅ JSON-LD structured data
- ✅ Sitemap generation
- ✅ robots.txt
- ✅ Image optimization (AVIF/WebP)
- ✅ Code splitting
- ✅ Lighthouse audit (target: 90+ all metrics)

**Deliverable:** SEO-ready, fast site

#### Day 20: Testing & QA (8 hours)
- ✅ Cross-browser testing (Chrome, Safari, Firefox)
- ✅ Mobile responsiveness (iPhone, Android)
- ✅ Accessibility audit (WCAG 2.1 AA)
- ✅ Form validation testing
- ✅ Cloudbed booking flow end-to-end
- ✅ Admin panel stress testing
- ✅ Fix critical bugs

**Deliverable:** Production-ready codebase

#### Day 21: Deployment & CI/CD (6 hours)
- ✅ Build production Docker image
- ✅ Deploy to GCP Cloud Run
- ✅ Configure Cloud Load Balancer
- ✅ Setup SSL certificates
- ✅ Configure Cloudflare CDN
- ✅ Setup GitHub Actions CI/CD
- ✅ Environment variable management
- ✅ Smoke tests on production

**Deliverable:** Live production site

#### Day 22: Documentation & Handoff (2 hours)
- ✅ Write comprehensive README.md
- ✅ API documentation
- ✅ Admin user guide
- ✅ Deployment runbook
- ✅ Troubleshooting guide
- ✅ Content editor training materials

**Deliverable:** Complete project documentation

## 8. Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| **Lighthouse Performance** | 95+ | Code splitting, image optimization, CDN |
| **First Contentful Paint** | < 1.2s | SSR, critical CSS, preload fonts |
| **Largest Contentful Paint** | < 2.0s | Optimized images, lazy loading |
| **Time to Interactive** | < 3.0s | Minimal JavaScript, defer non-critical |
| **Cumulative Layout Shift** | < 0.1 | Reserved space for images, fonts |
| **Total Blocking Time** | < 200ms | Code splitting, minimal third-party scripts |
| **Availability SLA** | 99.9% | GCP Cloud Run auto-scaling, health checks |

## 9. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cloudbed API changes | Medium | High | Version lock, fallback static content |
| GCP quota limits | Low | Medium | Monitor usage, request increase early |
| Figma sync complexity | Medium | Low | Make optional, manual token updates |
| Timeline slippage | Medium | High | Daily progress tracking, cut non-critical features |
| Performance regression | Low | High | Lighthouse CI checks, bundle analysis |

## 10. Post-Launch Checklist

### Week 1 Post-Launch
- [ ] Monitor Cloud Run metrics (CPU, memory, requests)
- [ ] Review error logs in Cloud Logging
- [ ] Check Cloudbed booking conversion rate
- [ ] Gather user feedback on booking flow
- [ ] Review Google Analytics 4 data

### Week 2-4 Post-Launch
- [ ] Content editor training sessions
- [ ] Performance optimization based on real traffic
- [ ] A/B test booking widget placement
- [ ] SEO monitoring (Google Search Console)
- [ ] Plan Phase 2 features (if any)

## 11. Emergency Contacts & Support

| Service | Contact | Purpose |
|---------|---------|---------|
| **GCP Support** | [Support Console] | Infrastructure issues |
| **Cloudbed** | [API Support] | Booking integration |
| **Figma** | [Plugin Support] | Design sync issues |
| **Domain/DNS** | [Registrar] | Domain routing |

## 12. README.md Template

```markdown
# Viceroy Bali - Luxury Resort Website

> Modern, high-performance booking and branding platform built with Next.js 15, Payload CMS 3.0, and Google Cloud Platform.

## 🏗️ Architecture

[See Architecture Overview in Implementation Plan]

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PNPM 9+
- Docker & Docker Compose
- GCP account (for production)

### Local Development
```bash
pnpm setup:local
pnpm dev
```

Visit:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin

## Tech Stack

- **Framework:** Next.js 15 (App Router, RSC)
- **CMS:** Payload 3.0 (Headless CMS)
- **Database:** PostgreSQL (Cloud SQL)
- **Cache:** Redis (Memorystore)
- **Storage:** Google Cloud Storage
- **Deployment:** GCP Cloud Run
- **Styling:** Tailwind CSS + SCSS Modules

## Deployment

```bash
pnpm build
pnpm deploy:production
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Content Management](docs/CONTENT_GUIDE.md)


## Target Performance

- Lighthouse Score: 95+
- FCP: < 1.2s
- LCP: < 2.0s
- CLS: < 0.1

## 13. Next Steps

1. **Review this plan** with stakeholders
2. **Setup GitHub repository** and project board
3. **Run `scripts/setup-local.sh`** to initialize development
4. **Begin Day 1 tasks** following the timeline
5. **Daily standups** to track progress (15 min)
6. **Weekly demos** to stakeholders (Friday EOD)

**End of Implementation Plan**
