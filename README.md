# KLS3 Sales OS

Internal Sales Operating System for KLS3.

KLS3 Sales OS centralizes prospecting, commercial activity, pipeline management and performance analytics across multiple KLS3 business lines.

## Purpose

The application is designed to answer one primary question:

> What commercial actions should we perform today to generate the most value?

This is an internal KLS3 application.

It is not intended to be a public SaaS product.

---

## Business Lines

The initial business lines are:

- Paul
- Sacha
- Calymia
- KLS3 Notaires

All business lines share a common commercial pipeline while maintaining their own business rules, revenue triggers and KPIs.

---

## Main Features

### Dashboard

Global commercial performance and business-line KPIs.

### Today

Daily commercial priorities:

- calls
- follow-ups
- meetings
- overdue actions
- prospects without a next action

### Focus Mode

Dedicated call-session interface presenting prospects one at a time.

Workflow:

Action → Result → Next Action → Next Prospect

### Pipeline

Kanban commercial pipeline shared across business lines.

### Prospect & Opportunity

Centralized view of:

- company
- contact
- opportunity
- activities
- notes
- next actions
- commercial history

### Analytics

Performance analysis by business line:

- calls
- conversations
- meetings
- opportunities
- proposals
- signatures
- revenue
- MRR
- pipeline
- conversion rates
- revenue per commercial hour

---

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Airtable
- Vercel

Optional / later:

- Framer Motion
- shadcn/ui
- n8n

---

## Architecture

```text
User
  ↓
KLS3 Sales OS
Next.js / React
  ↓
Next.js Server Layer
  ↓
Airtable

Airtable credentials must never be exposed to the browser.

All Airtable access must be performed server-side.

Production

Target URL:

https://sales.kls3-dev.com

Hosting:

Vercel

Source control:

GitHub

Environments
Local

Local development with Claude Code.

Preview

Vercel Preview Deployments.

Production

KLS3 internal production environment.

Security

The application is private.

Authentication is required before production use with real commercial data.

Secrets must never be committed to GitHub.

Use:

.env.local

for local secrets.

Use Vercel Environment Variables for Preview and Production.

Development Principles

KLS3 Sales OS must remain:

simple
fast
action-oriented
maintainable
commercially useful

Avoid unnecessary complexity.

This is an internal operational tool, not a generic CRM platform.

Product Specification

The complete functional, UX, technical and design specification is maintained in:

CLAUDE.md

Claude Code must read CLAUDE.md before implementing features.

Development Workflow

Development is organized into phases:

Project setup
Airtable data layer
Core CRM
Pipeline
Today
Focus Mode
Dashboard
Analytics
Authentication and production deployment

Claude Code must work one phase at a time.

Design System

KLS3 Sales OS follows the KLS3 visual identity.

Main colors:

Background       #0D0D0D
Cards            #111111
Accent           #4B7BF5
Primary text     #F0EDE8
Muted text       rgba(240,237,232,0.45)
Borders          rgba(255,255,255,0.07)

Typography:

Syne — headings
Inter — body

Dark mode only.

No glow.

No aggressive gradients.

No cyberpunk visual effects.

Status

Project initialization.


### Ensuite

Quand tu as créé `README.md`, `.gitignore` et `CLAUDE.md`, ton dossier doit simplement être :

```text
kls3-sales-os/
├── .gitignore
├── CLAUDE.md
└── README.md.
