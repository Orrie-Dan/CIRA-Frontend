# CIRA - Citizens Infrastructure Reporting Application

**A comprehensive platform for citizens to report infrastructure issues, featuring web and mobile applications with an administrative dashboard for officers and administrators.**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Architecture](#project-architecture)
4. [Installation Guide](#installation-guide)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Administration](#administration)
8. [Troubleshooting](#troubleshooting)
9. [Additional Resources](#additional-resources)

---

## Overview

CIRA is a full-stack infrastructure reporting solution that enables citizens to report issues efficiently while providing government officers and administrators with powerful tools to manage and resolve these reports.

### Key Features

- **Citizen Reporting**: Web and mobile interfaces for submitting infrastructure issues
- **Administrative Dashboard**: Comprehensive management tools for officers and administrators
- **Real-time Updates**: Live status tracking and notifications
- **Image Upload**: Cloudinary integration for visual documentation
- **Secure Authentication**: JWT-based authentication system

---

## Prerequisites

Ensure the following software is installed on your development machine:

| Software | Minimum Version | Download Link |
|----------|----------------|---------------|
| Node.js | v18.0.0+ | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | v14.0+ | [postgresql.org](https://www.postgresql.org/download/) |
| Git | Latest | [git-scm.com](https://git-scm.com/downloads) |
| Expo CLI | Latest | `npm install -g expo-cli` |

### Optional Tools

- **pnpm** (recommended package manager): [pnpm.io](https://pnpm.io/installation)
- **pgAdmin** (PostgreSQL GUI): [pgadmin.org](https://www.pgadmin.org/)
- **Expo Go** mobile app for testing: [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## Project Architecture

```
CIRA/
├── api/                    # Backend API Server
│   ├── src/               # Source code
│   ├── prisma/            # Database schema and migrations
│   └── package.json       # API dependencies
├── app/                   # Next.js Web Application
├── mobile/                # React Native Mobile Application
├── components/            # Shared React Components
├── lib/                   # Shared Utilities
└── public/                # Static Assets
```

### Technology Stack

**Backend**
- Fastify (Node.js web framework)
- Prisma (ORM)
- PostgreSQL (Database)
- JWT (Authentication)

**Frontend**
- Next.js (Web application)
- React Native + Expo (Mobile application)
- Tailwind CSS (Styling)

**Infrastructure**
- Cloudinary (Image hosting)
- SendGrid (Email notifications - optional)
- Twilio (SMS notifications - optional)

---

## Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/Orrie-Dan/CIRA.git
cd CIRA
```

### Step 2: Database Setup

#### 2.1 Install PostgreSQL

Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/). During installation, set and remember the password for the `postgres` user.

**Verify installation:**
```bash
psql --version
```

#### 2.2 Create Database

Access PostgreSQL and create the database:

```sql
CREATE DATABASE cira_db;
```

Alternatively, use pgAdmin GUI to create the database.

### Step 3: API Configuration

#### 3.1 Install Dependencies

```bash
cd api
pnpm install
```

#### 3.2 Configure Environment Variables

Create `api/.env`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/cira_db?schema=public"

# Authentication Secrets
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
COOKIE_SECRET="your-cookie-secret-key-change-this-in-production"

# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Email Configuration (Optional)
# SENDGRID_API_KEY="your-sendgrid-api-key"
# FROM_EMAIL="noreply@cira.com"

# SMS Configuration (Optional)
# TWILIO_ACCOUNT_SID="your-twilio-account-sid"
# TWILIO_AUTH_TOKEN="your-twilio-auth-token"
# TWILIO_PHONE_NUMBER="+1234567890"
```

**Important:** Replace all placeholder values with actual credentials.

#### 3.3 Set Up Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com/)
2. Navigate to Dashboard
3. Copy Cloud Name, API Key, and API Secret
4. Add credentials to `api/.env`

#### 3.4 Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

#### 3.5 Start API Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

**Verify:** Access API documentation at `http://localhost:3001/api-docs`

### Step 4: Web Application Setup

#### 4.1 Install Dependencies

```bash
cd ..  # Return to root directory
pnpm install
```

#### 4.2 Configure Environment

Create `.env.local` in root directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

#### 4.3 Start Development Server

```bash
npm run dev
```

**Verify:** Access web application at `http://localhost:3000`

### Step 5: Mobile Application Setup

#### 5.1 Install Dependencies

```bash
cd mobile
npm install
```

#### 5.2 Configure Environment

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP_ADDRESS:3001
```

**Finding Your IP Address:**
- **Windows**: `ipconfig` (look for IPv4 Address)
- **macOS/Linux**: `ifconfig` or `ip addr` (look for inet address)

#### 5.3 Start Expo Server

```bash
npx expo start --lan
```

#### 5.4 Test on Device

1. Install Expo Go on your mobile device
2. Scan QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app
3. Ensure device and computer are on the same network

---

## Configuration

### Environment Variables Reference

#### API Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/cira_db` |
| `JWT_SECRET` | JWT signing secret | Yes | 32+ character random string |
| `COOKIE_SECRET` | Cookie signing secret | Yes | 32+ character random string |
| `PORT` | API server port | No | `3001` |
| `NODE_ENV` | Environment mode | No | `development` or `production` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | From Cloudinary dashboard |

#### Web Application Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API endpoint | Yes | `http://localhost:3001` |

#### Mobile Application Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend API endpoint | Yes | `http://192.168.1.100:3001` |

---

## Deployment

### Development Environment

Run all components simultaneously:

```bash
# Terminal 1: API Server
cd api && npm run dev

# Terminal 2: Web Application
npm run dev

# Terminal 3: Mobile Application
cd mobile && npx expo start --lan
```

### Production Deployment

#### API Server

```bash
cd api
npm run build
npm start
```

#### Web Application

```bash
npm run build
npm start
```

#### Mobile Application

```bash
cd mobile
# Android
npx expo build:android

# iOS
npx expo build:ios
```

---

## Administration

### Creating Administrator Account

After database initialization, create an admin user:

```bash
cd api
npm run create-admin
```

Follow the interactive prompts to set up the administrator account.

---

## Troubleshooting

### Database Issues

**Problem**: Cannot connect to database server

**Solutions**:
- Verify PostgreSQL service is running
- Confirm `DATABASE_URL` credentials in `.env`
- Check PostgreSQL is listening on correct port (default: 5432)

**Problem**: Authentication failed for user

**Solutions**:
- Verify username and password in connection string
- Check PostgreSQL user permissions

### API Server Issues

**Problem**: Port already in use

**Solutions**:
- Change `PORT` value in `api/.env`
- Identify and stop conflicting process:
  ```bash
  # Linux/macOS
  lsof -ti:3001 | xargs kill -9
  
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  ```

**Problem**: Prisma Client not generated

**Solution**:
```bash
cd api
npx prisma generate
```

### Web Application Issues

**Problem**: Cannot connect to API

**Solutions**:
- Verify API server is running
- Confirm `NEXT_PUBLIC_API_BASE_URL` matches API server address
- Check browser console for CORS errors

### Mobile Application Issues

**Problem**: Network request failed

**Solutions**:
- Ensure device and computer share same Wi-Fi network
- Use computer's IP address, not `localhost`
- Verify firewall allows connections
- Test API accessibility: `curl http://YOUR_IP:3001`

**Problem**: Expo cannot connect

**Solutions**:
- Try tunnel mode: `npx expo start --tunnel`
- Disable VPN connections
- Check corporate firewall settings
- Restart Expo development server

---

## Additional Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)

### Community Support

For issues, questions, and feature requests:
- **GitHub Issues**: [github.com/Orrie-Dan/CIRA/issues](https://github.com/Orrie-Dan/CIRA/issues)

---

## License

This project is licensed under [LICENSE TYPE]. See LICENSE file for details.

---

**Last Updated**: November 2025  
**Version**: 1.0.0