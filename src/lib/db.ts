import { Pool as PgPool, PoolClient } from 'pg';
import mysql from 'mysql2/promise';

export interface DbStatus {
  connected: boolean;
  engine: 'postgres' | 'mysql';
  host: string;
  database: string;
  message: string;
  error?: string;
}

let pgPool: PgPool | null = null;
let mysqlPool: mysql.Pool | null = null;

function isPostgresUrl(urlStr?: string): boolean {
  if (!urlStr) return false;
  const trimmed = urlStr.trim().toLowerCase();
  return trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://');
}

function getDatabaseConfig() {
  const dbUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MYSQL_URL || process.env.DB_URL || '').trim();

  if (isPostgresUrl(dbUrl)) {
    let host = 'Neon Postgres';
    let database = 'neondb';
    try {
      const parsed = new URL(dbUrl);
      host = `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
      database = parsed.pathname.replace(/^\//, '') || 'neondb';
    } catch {}

    return {
      engine: 'postgres' as const,
      dbUrl,
      host,
      database,
    };
  }

  // Fallback to MySQL
  return {
    engine: 'mysql' as const,
    dbUrl,
    host: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`,
    database: process.env.DB_NAME || 'library_management',
  };
}

function getPgPool(): PgPool {
  if (!pgPool) {
    const { dbUrl } = getDatabaseConfig();
    pgPool = new PgPool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPool;
}

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    const { dbUrl, database } = getDatabaseConfig();
    if (dbUrl && !isPostgresUrl(dbUrl)) {
      mysqlPool = mysql.createPool(dbUrl);
    } else {
      mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true,
      });
    }
  }
  return mysqlPool;
}

// Convert MySQL syntax to Postgres syntax
function translateToPg(sql: string): { sql: string; isInsert: boolean } {
  let paramIndex = 1;
  let translated = sql.replace(/\?/g, () => `$${paramIndex++}`);

  // Translate MySQL GROUP_CONCAT to PostgreSQL STRING_AGG
  translated = translated.replace(
    /GROUP_CONCAT\s*\(\s*DISTINCT\s+([^)]+?)\s+SEPARATOR\s+['"](.*?)['"]\s*\)/gi,
    "STRING_AGG(DISTINCT $1, '$2')"
  );
  translated = translated.replace(
    /GROUP_CONCAT\s*\(\s*([^)]+?)\s+SEPARATOR\s+['"](.*?)['"]\s*\)/gi,
    "STRING_AGG($1, '$2')"
  );

  // Replace DATE_SUB(...) interval syntax
  translated = translated.replace(
    /DATE_SUB\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi,
    "(CURRENT_DATE - INTERVAL '$1 months')"
  );

  const isInsert = /^\s*INSERT\s+INTO/i.test(translated);
  if (isInsert && !/RETURNING\s+/i.test(translated)) {
    translated = `${translated} RETURNING *`;
  }

  return { sql: translated, isInsert };
}

function extractInsertId(sql: string, firstRow: any): number | undefined {
  if (!firstRow) return undefined;
  const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
  if (!match) return undefined;
  const table = match[1].toLowerCase();
  switch (table) {
    case 'books':
      return firstRow.book_id;
    case 'categories':
      return firstRow.category_id;
    case 'authors':
      return firstRow.author_id;
    case 'publishers':
      return firstRow.publisher_id;
    case 'members':
      return firstRow.member_id;
    case 'loans':
      return firstRow.loan_id;
    case 'audit_log':
      return firstRow.log_id;
    default:
      return Object.values(firstRow)[0] as any;
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const { engine } = getDatabaseConfig();
  try {
    if (engine === 'postgres') {
      const p = getPgPool();
      const client = await p.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } else {
      const p = getMysqlPool();
      const conn = await p.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      return true;
    }
  } catch (err) {
    console.error('Database connection check error:', err);
    return false;
  }
}

export async function getDbStatus(): Promise<DbStatus> {
  const { engine, host, database } = getDatabaseConfig();
  try {
    if (engine === 'postgres') {
      const p = getPgPool();
      const client = await p.connect();
      const res = await client.query('SELECT version();');
      client.release();
      return {
        connected: true,
        engine: 'postgres',
        host,
        database,
        message: `Connected to live Neon PostgreSQL (${database})`,
      };
    } else {
      const p = getMysqlPool();
      const conn = await p.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      return {
        connected: true,
        engine: 'mysql',
        host,
        database,
        message: `Connected to live MySQL (${database})`,
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      engine,
      host,
      database,
      message: `Database connection error: ${err.message || 'Unable to connect'}`,
      error: err.message,
    };
  }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const { engine } = getDatabaseConfig();

  if (engine === 'postgres') {
    const p = getPgPool();
    const { sql: translatedSql, isInsert } = translateToPg(sql);
    const res = await p.query(translatedSql, params || []);

    if (isInsert) {
      const rows = res.rows as any;
      rows.insertId = extractInsertId(sql, res.rows[0]);
      rows.affectedRows = res.rowCount;
      return rows as T;
    }

    // For SELECT or other queries, attach insertId/affectedRows for convenience
    const rows = res.rows as any;
    rows.affectedRows = res.rowCount;
    return rows as T;
  }

  // MySQL Execution
  const p = getMysqlPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}

export async function transaction<T>(
  callback: (connection: any) => Promise<T>
): Promise<T> {
  const { engine } = getDatabaseConfig();

  if (engine === 'postgres') {
    const p = getPgPool();
    const client = await p.connect();
    try {
      await client.query('BEGIN');

      const connWrapper = {
        execute: async (sql: string, params?: any[]) => {
          const { sql: translatedSql, isInsert } = translateToPg(sql);
          const res = await client.query(translatedSql, params || []);
          const rows = res.rows as any;
          rows.insertId = extractInsertId(sql, res.rows[0]);
          rows.affectedRows = res.rowCount;
          return [rows, res.fields];
        },
        query: async (sql: string, params?: any[]) => {
          const { sql: translatedSql, isInsert } = translateToPg(sql);
          const res = await client.query(translatedSql, params || []);
          const rows = res.rows as any;
          rows.insertId = extractInsertId(sql, res.rows[0]);
          rows.affectedRows = res.rowCount;
          return [rows, res.fields];
        },
      };

      const result = await callback(connWrapper);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // MySQL Transaction
  const p = getMysqlPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const { engine } = getDatabaseConfig();

  if (engine === 'postgres') {
    const p = getPgPool();
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS Categories (
          category_id   SERIAL PRIMARY KEY,
          category_name VARCHAR(100) NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS Authors (
          author_id   SERIAL PRIMARY KEY,
          author_name VARCHAR(200) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Publishers (
          publisher_id   SERIAL PRIMARY KEY,
          publisher_name VARCHAR(200) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Books (
          book_id          SERIAL PRIMARY KEY,
          isbn             VARCHAR(20)  NOT NULL UNIQUE,
          title            VARCHAR(300) NOT NULL,
          category_id      INT          NOT NULL REFERENCES Categories(category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
          publisher_id     INT          NOT NULL REFERENCES Publishers(publisher_id) ON UPDATE CASCADE ON DELETE RESTRICT,
          publication_year INT,
          total_copies     INT          NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
          created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_books_title ON Books(title);
        CREATE INDEX IF NOT EXISTS idx_books_isbn ON Books(isbn);

        CREATE TABLE IF NOT EXISTS Book_Authors (
          book_id   INT NOT NULL REFERENCES Books(book_id) ON UPDATE CASCADE ON DELETE CASCADE,
          author_id INT NOT NULL REFERENCES Authors(author_id) ON UPDATE CASCADE ON DELETE CASCADE,
          PRIMARY KEY (book_id, author_id)
        );

        CREATE TABLE IF NOT EXISTS Members (
          member_id         SERIAL PRIMARY KEY,
          full_name         VARCHAR(200) NOT NULL,
          email             VARCHAR(200) NOT NULL UNIQUE,
          phone             VARCHAR(20),
          registration_date DATE         NOT NULL DEFAULT CURRENT_DATE,
          membership_status VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive')),
          created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_members_email ON Members(email);

        CREATE TABLE IF NOT EXISTS Loans (
          loan_id     SERIAL PRIMARY KEY,
          book_id     INT          NOT NULL REFERENCES Books(book_id) ON UPDATE CASCADE ON DELETE RESTRICT,
          member_id   INT          NOT NULL REFERENCES Members(member_id) ON UPDATE CASCADE ON DELETE RESTRICT,
          issue_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
          due_date    DATE         NOT NULL,
          return_date DATE         DEFAULT NULL,
          created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_due_after_issue CHECK (due_date >= issue_date)
        );

        CREATE TABLE IF NOT EXISTS Audit_Log (
          log_id     SERIAL PRIMARY KEY,
          event_type VARCHAR(50)  NOT NULL,
          table_name VARCHAR(50)  NOT NULL,
          record_id  INT,
          details    TEXT,
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        );

        -- Compatibility Functions
        CREATE OR REPLACE FUNCTION CURDATE() RETURNS date AS $$
          SELECT CURRENT_DATE;
        $$ LANGUAGE sql;

        CREATE OR REPLACE FUNCTION DATEDIFF(d1 date, d2 date) RETURNS integer AS $$
          SELECT (d1 - d2)::integer;
        $$ LANGUAGE sql;

        -- Triggers
        CREATE OR REPLACE FUNCTION trg_loans_validate()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.due_date < NEW.issue_date THEN
            RAISE EXCEPTION 'Due date (%) cannot be earlier than issue date (%).', NEW.due_date, NEW.issue_date;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_loans_before_insert ON Loans;
        CREATE TRIGGER trg_loans_before_insert
        BEFORE INSERT OR UPDATE ON Loans
        FOR EACH ROW EXECUTE FUNCTION trg_loans_validate();

        CREATE OR REPLACE FUNCTION trg_loans_audit_insert()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO Audit_Log (event_type, table_name, record_id, details)
          VALUES ('BOOK_ISSUED', 'Loans', NEW.loan_id, 'Book ID: ' || NEW.book_id || ', Member ID: ' || NEW.member_id || ', Issue Date: ' || NEW.issue_date || ', Due Date: ' || NEW.due_date);
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_loans_after_insert ON Loans;
        CREATE TRIGGER trg_loans_after_insert
        AFTER INSERT ON Loans
        FOR EACH ROW EXECUTE FUNCTION trg_loans_audit_insert();

        CREATE OR REPLACE FUNCTION trg_loans_audit_return()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
            INSERT INTO Audit_Log (event_type, table_name, record_id, details)
            VALUES ('BOOK_RETURNED', 'Loans', NEW.loan_id, 'Book ID: ' || NEW.book_id || ', Member ID: ' || NEW.member_id || ', Return Date: ' || NEW.return_date);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_loans_after_return ON Loans;
        CREATE TRIGGER trg_loans_after_return
        AFTER UPDATE ON Loans
        FOR EACH ROW EXECUTE FUNCTION trg_loans_audit_return();
      `);

      return { success: true, message: 'All tables and triggers initialized successfully on Neon PostgreSQL.' };
    } finally {
      client.release();
    }
  }

  // MySQL init
  const p = getMysqlPool();
  const conn = await p.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS Categories (category_id INT AUTO_INCREMENT PRIMARY KEY, category_name VARCHAR(100) NOT NULL UNIQUE) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Authors (author_id INT AUTO_INCREMENT PRIMARY KEY, author_name VARCHAR(200) NOT NULL) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Publishers (publisher_id INT AUTO_INCREMENT PRIMARY KEY, publisher_name VARCHAR(200) NOT NULL) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Books (book_id INT AUTO_INCREMENT PRIMARY KEY, isbn VARCHAR(20) NOT NULL UNIQUE, title VARCHAR(300) NOT NULL, category_id INT NOT NULL, publisher_id INT NOT NULL, publication_year INT, total_copies INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, CONSTRAINT chk_total_copies CHECK (total_copies >= 0), FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON UPDATE CASCADE ON DELETE RESTRICT, FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id) ON UPDATE CASCADE ON DELETE RESTRICT) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Book_Authors (book_id INT NOT NULL, author_id INT NOT NULL, PRIMARY KEY (book_id, author_id), FOREIGN KEY (book_id) REFERENCES Books(book_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Members (member_id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(200) NOT NULL, email VARCHAR(200) NOT NULL UNIQUE, phone VARCHAR(20), registration_date DATE NOT NULL DEFAULT (CURRENT_DATE), membership_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Loans (loan_id INT AUTO_INCREMENT PRIMARY KEY, book_id INT NOT NULL, member_id INT NOT NULL, issue_date DATE NOT NULL DEFAULT (CURRENT_DATE), due_date DATE NOT NULL, return_date DATE DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, CONSTRAINT chk_due_after_issue CHECK (due_date >= issue_date), FOREIGN KEY (book_id) REFERENCES Books(book_id) ON UPDATE CASCADE ON DELETE RESTRICT, FOREIGN KEY (member_id) REFERENCES Members(member_id) ON UPDATE CASCADE ON DELETE RESTRICT) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS Audit_Log (log_id INT AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(50) NOT NULL, table_name VARCHAR(50) NOT NULL, record_id INT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB;
    `);
    return { success: true, message: 'All tables initialized successfully on MySQL.' };
  } finally {
    conn.release();
  }
}

export default {
  query,
  execute: query,
  transaction,
  getDbStatus,
  checkDatabaseConnection,
  initDatabase,
};
