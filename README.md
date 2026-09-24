# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


# 💧 Society Water Billing Management System

A full-stack automated web application to manage quarterly water meter readings, billing, payment collections, and receipts for residential societies (94 Units: Block A - 64 units, Block B - 30 units).

## 🚀 Tech Stack
- **Backend:** Java 17, Spring Boot 3, Spring Data JPA, Hibernate, Apache POI
- **Database:** PostgreSQL
- **Frontend:** React 18, Vite, Bootstrap 5, Bootstrap Icons, React-to-Print

## 📦 Features
- **Auto-Calculated Readings:** Automatically fetches previous reading from DB; enter only the current reading.
- **Configurable Tariff Rates:** Support dynamic rates (₹5, ₹8, ₹10, ₹12, etc.).
- **Bill Generation:** Automatic carry-forward balance & total dues calculation.
- **Payment & Receipt:** Handles partial/excess payments, records transaction numbers, and generates printable receipts.
- **Comprehensive Reports:** Quarter-wise summaries & unit-wise historical reports.

## 🛠️ Setup & Run

### 1. Database Setup
Create database in PostgreSQL:
```sql
CREATE DATABASE water_billing_db;