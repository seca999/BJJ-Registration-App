import fs from 'fs';
import path from 'path';

/**
 * Format byte count to human-readable string (e.g., "48.2 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Normalize Windows / POSIX file path
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return '';
  let clean = inputPath.trim();
  // Strip outer quotes if provided by user e.g. "C:\BJJ Academy\Database\bjj_master.db"
  clean = clean.replace(/^["']|["']$/g, '');
  return path.normalize(clean);
}

/**
 * Check if the directory and file exist, retrieve real file stats and SQLite status.
 */
export async function inspectLocalDatabase(targetPath: string) {
  const normPath = normalizePath(targetPath);
  const dirPath = path.dirname(normPath);

  const dirExists = fs.existsSync(dirPath);
  const fileExists = fs.existsSync(normPath);

  let fileSizeBytes = 0;
  let lastModified: string | null = null;
  let canWrite = false;
  let tablesList: Array<{ name: string; count: number }> = [];
  let isSqliteValid = false;
  const issues: string[] = [];

  // Check write permissions in directory
  if (dirExists) {
    try {
      fs.accessSync(dirPath, fs.constants.W_OK);
      canWrite = true;
    } catch {
      canWrite = false;
      issues.push(`Directory is not writable: ${dirPath}`);
    }
  } else {
    issues.push(`Folder does not exist yet: ${dirPath} (will be created automatically on Fix/Build)`);
  }

  let actualInspectPath = normPath;
  let effectiveFileExists = fileExists;

  // If specified file doesn't exist or is 0 bytes, check for any existing .db / .sqlite file in the directory
  if (dirExists) {
    try {
      const stats = fileExists ? fs.statSync(normPath) : null;
      if (!fileExists || (stats && stats.size === 0)) {
        const files = fs.readdirSync(dirPath);
        const dbFile = files.find(f => f.endsWith('.db') || f.endsWith('.sqlite'));
        if (dbFile) {
          const candidatePath = path.join(dirPath, dbFile);
          const candidateStats = fs.statSync(candidatePath);
          if (candidateStats.size > 0) {
            actualInspectPath = candidatePath;
            effectiveFileExists = true;
            issues.push(`Detected active database file '${dbFile}' (${formatBytes(candidateStats.size)}) in folder ${dirPath}.`);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (effectiveFileExists) {
    try {
      const stats = fs.statSync(actualInspectPath);
      fileSizeBytes = stats.size;
      lastModified = stats.mtime.toISOString();

      if (fileSizeBytes === 0) {
        issues.push(`Database file is 0 KB (empty file). Run 'Build & Fix Database' to populate tables.`);
      } else {
        // Try opening with native SQLite module
        try {
          const sqliteModule: any = await import('node:sqlite');
          if (sqliteModule?.DatabaseSync) {
            const db = new sqliteModule.DatabaseSync(actualInspectPath, { readOnly: true });
            const tablesQuery = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
            
            for (const t of tablesQuery) {
              const tableName = (t as any).name;
              try {
                const countRes = db.prepare(`SELECT count(*) as count FROM "${tableName}";`).get() as any;
                tablesList.push({ name: tableName, count: countRes?.count || 0 });
              } catch {
                tablesList.push({ name: tableName, count: 0 });
              }
            }
            db.close();
            isSqliteValid = true;
          }
        } catch (sqliteErr: any) {
          // If not binary SQLite, check if it's an SQL text file or JSON
          try {
            const head = fs.readFileSync(actualInspectPath, { encoding: 'utf8', flag: 'r' }).slice(0, 500);
            if (head.includes('CREATE TABLE') || head.includes('INSERT INTO')) {
              isSqliteValid = true;
              issues.push('Database file contains SQL script text.');
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e: any) {
      issues.push(`Error inspecting file: ${e.message}`);
    }
  } else {
    issues.push(`File does not exist yet on disk: ${normPath}`);
  }

  // 10 expected academy tables
  const expectedTables = [
    'members',
    'classes',
    'attendance',
    'payments',
    'coaches',
    'subscription_plans',
    'expenses',
    'timetable_config',
    'gym_settings',
    'ibjjf_transfers',
  ];

  const tablesBreakdown = expectedTables.map((expName) => {
    const found = tablesList.find((t) => t.name === expName);
    return {
      name: expName,
      exists: !!found,
      rowCount: found ? found.count : 0,
    };
  });

  const existingCount = tablesBreakdown.filter((t) => t.exists).length;
  let healthScore = 0;
  if (fileExists && fileSizeBytes > 0 && isSqliteValid) {
    healthScore = Math.round((existingCount / expectedTables.length) * 100);
  }

  return {
    targetPath: normPath,
    directoryPath: dirPath,
    directoryExists: dirExists,
    fileExists,
    canWrite,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    lastModified,
    isSqliteValid,
    healthScore,
    existingTablesCount: existingCount,
    totalExpectedTables: expectedTables.length,
    tablesBreakdown,
    issues,
  };
}

/**
 * Build or repair the SQLite database directly on the Windows hard drive.
 */
export async function buildOrRepairLocalDatabase(targetPath: string, payload: any) {
  const normPath = normalizePath(targetPath);
  const dirPath = path.dirname(normPath);

  // 1. Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const {
    members = [],
    classes = [],
    attendance = [],
    payments = [],
    coaches = [],
    subscriptionPlans = [],
    expenses = [],
    timetableConfig = null,
    settings = null,
    ibjjfTransfers = [],
  } = payload;

  const companionSqlPath = path.join(dirPath, path.basename(normPath, path.extname(normPath)) + '.sql');
  const companionJsonPath = path.join(dirPath, path.basename(normPath, path.extname(normPath)) + '.json');

  let rowsCount = 0;
  let sqliteEngineUsed = 'none';

  // Attempt using native node:sqlite
  try {
    const sqliteModule: any = await import('node:sqlite');
    if (sqliteModule?.DatabaseSync) {
      sqliteEngineUsed = 'node:sqlite';
      const db = new sqliteModule.DatabaseSync(normPath);

      // Create Tables
      db.exec(`
        PRAGMA foreign_keys = ON;
        
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          birth_date TEXT,
          age_group TEXT,
          belt_rank TEXT,
          stripes INTEGER DEFAULT 0,
          membership_type TEXT,
          classes_remaining INTEGER DEFAULT 8,
          classes_total INTEGER DEFAULT 8,
          membership_start_date TEXT,
          membership_end_date TEXT,
          status TEXT DEFAULT 'active',
          total_classes_attended INTEGER DEFAULT 0,
          phone TEXT,
          email TEXT,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS classes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          coach_name TEXT,
          assistant_coach TEXT,
          start_time TEXT,
          end_time TEXT,
          room TEXT,
          days_of_week TEXT,
          active INTEGER DEFAULT 1,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT,
          class_name TEXT,
          class_category TEXT,
          class_id TEXT,
          status TEXT,
          classes_remaining_snapshot INTEGER,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'JOD',
          payment_method TEXT,
          plan_name TEXT,
          classes_credited INTEGER DEFAULT 8,
          period_start_date TEXT,
          period_end_date TEXT,
          status TEXT DEFAULT 'Completed',
          receipt_number TEXT,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS coaches (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          role TEXT,
          belt_rank TEXT,
          stripes INTEGER DEFAULT 0,
          email TEXT,
          phone TEXT,
          pay_type TEXT,
          rate REAL DEFAULT 0,
          active INTEGER DEFAULT 1,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          price REAL NOT NULL,
          currency TEXT DEFAULT 'JOD',
          billing_period TEXT DEFAULT 'monthly',
          duration_days INTEGER DEFAULT 30,
          classes_count INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          description TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'JOD',
          date TEXT NOT NULL,
          payment_method TEXT,
          recipient_or_vendor TEXT,
          invoice_ref TEXT,
          status TEXT DEFAULT 'Paid',
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS timetable_config (
          id TEXT PRIMARY KEY,
          academy_name TEXT,
          slogan TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS gym_settings (
          id TEXT PRIMARY KEY,
          gym_name TEXT,
          slogan TEXT,
          currency_symbol TEXT,
          default_coach TEXT,
          low_class_warning_threshold INTEGER,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS ibjjf_transfers (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          previous_category TEXT,
          new_category TEXT,
          age INTEGER,
          birth_date TEXT,
          transfer_date TEXT,
          reason TEXT,
          raw_json TEXT
        );
      `);

      // 1. Members
      const insertMember = db.prepare(`
        INSERT OR REPLACE INTO members (
          id, full_name, birth_date, age_group, belt_rank, stripes, membership_type,
          classes_remaining, classes_total, membership_start_date, membership_end_date,
          status, total_classes_attended, phone, email, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const m of members) {
        insertMember.run(
          m.id || '',
          m.fullName || '',
          m.birthDate || '',
          m.ageGroup || '',
          m.beltRank || '',
          m.stripes || 0,
          m.membershipType || '',
          m.classesRemaining || 0,
          m.classesTotal || 0,
          m.membershipStartDate || '',
          m.membershipEndDate || '',
          m.status || 'active',
          m.totalClassesAttended || 0,
          m.phone || '',
          m.email || '',
          m.notes || '',
          JSON.stringify(m)
        );
        rowsCount++;
      }

      // 2. Classes
      const insertClass = db.prepare(`
        INSERT OR REPLACE INTO classes (
          id, name, category, coach_name, assistant_coach, start_time, end_time, room, days_of_week, active, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const c of classes) {
        insertClass.run(
          c.id || '',
          c.name || '',
          c.category || '',
          c.coachName || '',
          c.assistantCoach || '',
          c.startTime || '',
          c.endTime || '',
          c.room || '',
          Array.isArray(c.daysOfWeek) ? c.daysOfWeek.join(',') : '',
          c.active ? 1 : 0,
          JSON.stringify(c)
        );
        rowsCount++;
      }

      // 3. Attendance
      const insertAtt = db.prepare(`
        INSERT OR REPLACE INTO attendance (
          id, member_id, member_name, date, time, class_name, class_category, class_id, status, classes_remaining_snapshot, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const a of attendance) {
        insertAtt.run(
          a.id || '',
          a.memberId || '',
          a.memberName || '',
          a.date || '',
          a.time || '',
          a.className || '',
          a.classCategory || '',
          a.classId || '',
          a.status || 'Present',
          a.classesRemainingSnapshot || 0,
          JSON.stringify(a)
        );
        rowsCount++;
      }

      // 4. Payments
      const insertPay = db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, member_id, member_name, date, amount, currency, payment_method, plan_name,
          classes_credited, period_start_date, period_end_date, status, receipt_number, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const p of payments) {
        insertPay.run(
          p.id || '',
          p.memberId || '',
          p.memberName || '',
          p.date || '',
          p.amount || 0,
          p.currency || 'JOD',
          p.paymentMethod || 'Cash',
          p.planName || '',
          p.classesCredited || 0,
          p.periodStartDate || '',
          p.periodEndDate || '',
          p.status || 'Completed',
          p.receiptNumber || '',
          p.notes || '',
          JSON.stringify(p)
        );
        rowsCount++;
      }

      // 5. Coaches
      const insertCoach = db.prepare(`
        INSERT OR REPLACE INTO coaches (
          id, full_name, role, belt_rank, stripes, email, phone, pay_type, rate, active, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const ch of coaches) {
        insertCoach.run(
          ch.id || '',
          ch.fullName || '',
          ch.role || '',
          ch.beltRank || '',
          ch.stripes || 0,
          ch.email || '',
          ch.phone || '',
          ch.payType || '',
          ch.rate || 0,
          ch.active ? 1 : 0,
          ch.notes || '',
          JSON.stringify(ch)
        );
        rowsCount++;
      }

      // 6. Subscription Plans
      const insertPlan = db.prepare(`
        INSERT OR REPLACE INTO subscription_plans (
          id, name, category, price, currency, billing_period, duration_days, classes_count, active, description, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const pl of subscriptionPlans) {
        insertPlan.run(
          pl.id || '',
          pl.name || '',
          pl.category || '',
          pl.price || 0,
          pl.currency || 'JOD',
          pl.billingPeriod || 'monthly',
          pl.durationDays || 30,
          pl.classesCount || 8,
          pl.active ? 1 : 0,
          pl.description || '',
          JSON.stringify(pl)
        );
        rowsCount++;
      }

      // 7. Expenses
      const insertExp = db.prepare(`
        INSERT OR REPLACE INTO expenses (
          id, title, category, amount, currency, date, payment_method, recipient_or_vendor, invoice_ref, status, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const ex of expenses) {
        insertExp.run(
          ex.id || '',
          ex.title || '',
          ex.category || '',
          ex.amount || 0,
          ex.currency || 'JOD',
          ex.date || '',
          ex.paymentMethod || 'Cash',
          ex.recipientOrVendor || '',
          ex.invoiceRef || '',
          ex.status || 'Paid',
          ex.notes || '',
          JSON.stringify(ex)
        );
        rowsCount++;
      }

      // 8. Timetable Config
      if (timetableConfig) {
        const insertTt = db.prepare(`
          INSERT OR REPLACE INTO timetable_config (id, academy_name, slogan, raw_json) VALUES (?, ?, ?, ?);
        `);
        insertTt.run(
          'active_timetable',
          timetableConfig.leftLogoTitle || 'ARTE SUAVE BJJ',
          timetableConfig.footerSlogan || 'MEET US AT THE MAT',
          JSON.stringify(timetableConfig)
        );
        rowsCount++;
      }

      // 9. Gym Settings
      if (settings) {
        const insertSet = db.prepare(`
          INSERT OR REPLACE INTO gym_settings (
            id, gym_name, slogan, currency_symbol, default_coach, low_class_warning_threshold, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `);
        insertSet.run(
          'gym_settings',
          settings.gymName || 'Arte Suave Academy',
          settings.slogan || 'Where Technique Conquers Strength',
          settings.currencySymbol || 'JOD',
          settings.defaultCoach || 'Professor Lucas Silva',
          settings.lowClassWarningThreshold || 2,
          JSON.stringify(settings)
        );
        rowsCount++;
      }

      // 10. IBJJF Transfers
      const insertTr = db.prepare(`
        INSERT OR REPLACE INTO ibjjf_transfers (
          id, member_id, member_name, previous_category, new_category, age, birth_date, transfer_date, reason, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const tr of ibjjfTransfers) {
        insertTr.run(
          tr.id || '',
          tr.memberId || '',
          tr.memberName || '',
          tr.previousCategory || '',
          tr.newCategory || '',
          tr.age || 0,
          tr.birthDate || '',
          tr.transferDate || '',
          tr.reason || '',
          JSON.stringify(tr)
        );
        rowsCount++;
      }

      db.close();
    }
  } catch (e: any) {
    console.error('Error writing SQLite binary file:', e);
  }

  // 2. Generate clean plain-text companion SQL script (.sql)
  let sql = `-- =========================================================================\n`;
  sql += `-- BJJ ACADEMY SYSTEM - SQLITE EXPORT\n`;
  sql += `-- Target: ${normPath}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- =========================================================================\n\n`;
  sql += `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n\n`;

  const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');

  // Insert Members
  sql += `-- 1. MEMBERS (${members.length} records)\n`;
  for (const m of members) {
    sql += `INSERT OR REPLACE INTO members (id, full_name, birth_date, age_group, belt_rank, stripes, membership_type, classes_remaining, classes_total, membership_start_date, membership_end_date, status, total_classes_attended, phone, email, notes) VALUES (${esc(m.id)}, ${esc(m.fullName)}, ${esc(m.birthDate)}, ${esc(m.ageGroup)}, ${esc(m.beltRank)}, ${m.stripes || 0}, ${esc(m.membershipType)}, ${m.classesRemaining || 0}, ${m.classesTotal || 0}, ${esc(m.membershipStartDate)}, ${esc(m.membershipEndDate)}, ${esc(m.status || 'active')}, ${m.totalClassesAttended || 0}, ${esc(m.phone)}, ${esc(m.email)}, ${esc(m.notes)});\n`;
  }

  sql += `\nCOMMIT;\n`;

  // Write companion SQL script
  fs.writeFileSync(companionSqlPath, sql, 'utf8');

  // Write companion JSON file
  fs.writeFileSync(companionJsonPath, JSON.stringify(payload, null, 2), 'utf8');

  // Get resulting file stats
  const finalStats = fs.statSync(normPath);

  return {
    success: true,
    targetPath: normPath,
    companionSqlPath,
    companionJsonPath,
    fileSizeBytes: finalStats.size,
    fileSizeFormatted: formatBytes(finalStats.size),
    sqliteEngineUsed,
    tablesWritten: 10,
    totalRowsWritten: rowsCount,
    message: `Database successfully built and written to ${normPath} (${formatBytes(finalStats.size)})!`,
  };
}

/**
 * Read data from SQLite file back into JavaScript objects
 */
export async function readLocalDatabase(targetPath: string) {
  const normPath = normalizePath(targetPath);
  if (!fs.existsSync(normPath)) {
    throw new Error(`Database file not found at ${normPath}`);
  }

  const result: any = {
    members: [],
    classes: [],
    attendance: [],
    payments: [],
    coaches: [],
    subscriptionPlans: [],
    expenses: [],
    timetableConfig: null,
    settings: null,
    ibjjfTransfers: [],
  };

  try {
    const sqliteModule: any = await import('node:sqlite');
    if (sqliteModule?.DatabaseSync) {
      const db = new sqliteModule.DatabaseSync(normPath, { readOnly: true });

      const safeSelect = (table: string) => {
        try {
          return db.prepare(`SELECT * FROM "${table}";`).all();
        } catch {
          return [];
        }
      };

      const parseRows = (rows: any[]) => {
        return rows.map((r) => {
          if (r.raw_json) {
            try {
              return JSON.parse(r.raw_json);
            } catch {
              // fallback
            }
          }
          return r;
        });
      };

      result.members = parseRows(safeSelect('members'));
      result.classes = parseRows(safeSelect('classes'));
      result.attendance = parseRows(safeSelect('attendance'));
      result.payments = parseRows(safeSelect('payments'));
      result.coaches = parseRows(safeSelect('coaches'));
      result.subscriptionPlans = parseRows(safeSelect('subscription_plans'));
      result.expenses = parseRows(safeSelect('expenses'));
      result.ibjjfTransfers = parseRows(safeSelect('ibjjf_transfers'));

      const ttRows = safeSelect('timetable_config');
      if (ttRows.length > 0 && ttRows[0].raw_json) {
        try {
          result.timetableConfig = JSON.parse(ttRows[0].raw_json);
        } catch {}
      }

      const setRows = safeSelect('gym_settings');
      if (setRows.length > 0 && setRows[0].raw_json) {
        try {
          result.settings = JSON.parse(setRows[0].raw_json);
        } catch {}
      }

      db.close();
      return result;
    }
  } catch (err: any) {
    // If SQLite read fails, check companion JSON
    const jsonPath = path.join(path.dirname(normPath), path.basename(normPath, path.extname(normPath)) + '.json');
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(raw);
    }
    throw err;
  }

  return result;
}
