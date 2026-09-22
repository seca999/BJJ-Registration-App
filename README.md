# 🥋 BJJ Academy System — Local Deployment Guide

## Prerequisites
- Windows PC
- [Node.js LTS](https://nodejs.org/) installed

---

## Directory & File Paths

Create the following folder structure on drive `C:\`:

| Path | Purpose | What to Place Inside |
| :--- | :--- | :--- |
| `C:\BJJ Academy\Implement` | Deployment folder | `deploy_and_run.bat` |
| `C:\BJJ Academy\Implement\Versions` | ZIP release archives | Exported project `.zip` file |
| `C:\BJJ Academy\Database` | SQLite storage | `bjj_academy.db` (or `bjj_master.db`) |
| `C:\BJJ Academy\Code` | Extracted web application | Managed automatically by batch script |

---

## Quick Setup (PowerShell)

```powershell
mkdir "C:\BJJ Academy\Implement\Versions", "C:\BJJ Academy\Database", "C:\BJJ Academy\Code"
```

---

## How to Deploy & Run

1. Place `deploy_and_run.bat` in `C:\BJJ Academy\Implement\`.
2. Place your exported app `.zip` in `C:\BJJ Academy\Implement\Versions\`.
3. Place your active database file in `C:\BJJ Academy\Database\`.
4. Double-click `deploy_and_run.bat` (or run it via Command Prompt).
5. Open browser at **`http://localhost:5555`**.
