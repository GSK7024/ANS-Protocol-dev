# Changelog

All notable changes to the ANS Protocol will be documented in this file.

## [0.9.0-beta] - 2024-12-25

### 🚀 Major Features
- **Seller Portal:** Complete onboarding flow (`/seller-portal`) with wallet integration.
- **Webhook System:** Real-time event notifications for sellers with retry logic.
- **Analytics:** Seller dashboard with revenue, transaction counts, and time-series data.
- **Python SDK:** Full support for Python-based agents (`pip install ans-sdk`).

### 🛡️ Security
- **Critical Fix:** Added expiry validation to `buy_domain` smart contract instruction.
- **Hardening:** Implemented Rate Limiting, API Key Hashing, and Zod Input Validation.
- **Testing:** Added 97 unit tests coverage for Core logic, SDK, and APIs.
- **Infrastructure:** Added GitHub Actions CI pipeline.

### 📚 Documentation
- Added `GETTING_STARTED.md` for fast developer onboarding (DevNet).
- Added `SELLER_INTEGRATION.md` comprehensive integration guide.
- Added `AUDIT_PREPARATION.md` security analysis report.

### 💅 UI/UX
- **Landing Page:** Polished "Cyberpunk Professional" design with dark mode aesthetics.
- **Status Page:** Live system health monitoring endpoint and UI (`/status`).
- **Resilience:** Added Custom 404, specific Error Boundaries, and Maintenance Mode.
