const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
let dbUrl = '';
for (const rawLine of envContent.split('\n')) {
  const line = rawLine.trim();
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

if (!dbUrl) {
  console.error('No DATABASE_URL found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  console.log('Connected to Supabase PostgreSQL!');

  console.log('1. Creating schema tables & functions...');
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

    CREATE OR REPLACE FUNCTION CURDATE() RETURNS date AS $$
      SELECT CURRENT_DATE;
    $$ LANGUAGE sql;

    CREATE OR REPLACE FUNCTION DATEDIFF(d1 date, d2 date) RETURNS integer AS $$
      SELECT (d1 - d2)::integer;
    $$ LANGUAGE sql;

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

  console.log('2. Inserting seed data...');

  await client.query(`
    INSERT INTO Categories (category_name) VALUES
      ('Fiction'), ('Non-Fiction'), ('Science'), ('Technology'),
      ('History'), ('Philosophy'), ('Mathematics'), ('Literature'),
      ('Biography'), ('Self-Help')
    ON CONFLICT (category_name) DO NOTHING;

    INSERT INTO Authors (author_name) VALUES
      ('George Orwell'), ('Harper Lee'), ('F. Scott Fitzgerald'),
      ('Jane Austen'), ('Mark Twain'), ('J.K. Rowling'),
      ('Stephen King'), ('Isaac Asimov'), ('Agatha Christie'),
      ('Ernest Hemingway'), ('Leo Tolstoy'), ('Charles Dickens'),
      ('Robert C. Martin'), ('Martin Fowler'), ('Donald Knuth')
    ON CONFLICT DO NOTHING;

    INSERT INTO Publishers (publisher_name) VALUES
      ('Penguin Random House'), ('HarperCollins'), ('Simon & Schuster'),
      ('Macmillan'), ('Hachette'), ('Oxford University Press'),
      ('Cambridge University Press'), ('Pearson'), ('Wiley'),
      ('O''Reilly Media')
    ON CONFLICT DO NOTHING;
  `);

  // Check books count
  const bookCount = await client.query('SELECT COUNT(*) FROM Books');
  if (parseInt(bookCount.rows[0].count) === 0) {
    console.log('Adding books, book_authors, members, and loans...');
    await client.query(`
      INSERT INTO Books (isbn, title, category_id, publisher_id, publication_year, total_copies) VALUES
        ('978-0-451-52493-5', '1984', 1, 1, 1949, 5),
        ('978-0-06-112008-4', 'To Kill a Mockingbird', 1, 2, 1960, 4),
        ('978-0-7432-7356-5', 'The Great Gatsby', 8, 3, 1925, 3),
        ('978-0-14-143951-8', 'Pride and Prejudice', 8, 1, 1813, 4),
        ('978-0-14-028329-7', 'The Adventures of Tom Sawyer', 1, 1, 1876, 3),
        ('978-0-590-35340-3', 'Harry Potter and the Sorcerer''s Stone', 1, 4, 1997, 6),
        ('978-0-385-12167-5', 'The Shining', 1, 5, 1977, 3),
        ('978-0-553-29335-7', 'Foundation', 3, 1, 1951, 4),
        ('978-0-06-207348-8', 'Murder on the Orient Express', 1, 2, 1934, 3),
        ('978-0-684-80122-3', 'The Old Man and the Sea', 8, 3, 1952, 3),
        ('978-0-14-028734-9', 'War and Peace', 8, 1, 1869, 2),
        ('978-0-14-143960-0', 'A Tale of Two Cities', 8, 1, 1859, 3),
        ('978-0-13-235088-4', 'Clean Code', 4, 8, 2008, 5),
        ('978-0-201-63361-0', 'Refactoring', 4, 8, 1999, 3),
        ('978-0-201-89683-1', 'The Art of Computer Programming', 7, 8, 1968, 2),
        ('978-0-19-953556-9', 'A Brief History of Time', 3, 6, 1988, 4),
        ('978-0-7432-7357-2', 'The Republic', 6, 3, 380, 2),
        ('978-0-553-21311-7', 'Cosmos', 3, 1, 1980, 3),
        ('978-0-06-093546-7', 'To Kill a Kingdom', 1, 2, 2018, 4),
        ('978-0-14-044913-6', 'Crime and Punishment', 8, 1, 1866, 3)
      ON CONFLICT DO NOTHING;

      INSERT INTO Book_Authors (book_id, author_id) VALUES
        (1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
        (6, 6), (7, 7), (8, 8), (9, 9), (10, 10),
        (11, 11), (12, 12), (13, 13), (14, 14), (15, 15)
      ON CONFLICT DO NOTHING;

      INSERT INTO Members (full_name, email, phone, registration_date, membership_status) VALUES
        ('Alice Johnson', 'alice@example.com', '555-0101', '2024-01-15', 'active'),
        ('Bob Smith', 'bob@example.com', '555-0102', '2024-02-20', 'active'),
        ('Charlie Brown', 'charlie@example.com', '555-0103', '2024-03-10', 'active'),
        ('Diana Prince', 'diana@example.com', '555-0104', '2024-04-05', 'active'),
        ('Edward Norton', 'edward@example.com', '555-0105', '2024-05-12', 'active'),
        ('Fiona Green', 'fiona@example.com', '555-0106', '2024-06-01', 'inactive'),
        ('George Lucas', 'george@example.com', '555-0107', '2024-07-22', 'active'),
        ('Hannah Montana', 'hannah@example.com', '555-0108', '2024-08-15', 'active')
      ON CONFLICT DO NOTHING;

      INSERT INTO Loans (book_id, member_id, issue_date, due_date, return_date) VALUES
        (1, 1, '2024-09-01', '2024-09-15', '2024-09-14'),
        (2, 2, '2024-09-05', '2024-09-19', '2024-09-18'),
        (3, 3, '2024-09-10', '2024-09-24', NULL),
        (6, 1, '2024-09-15', '2024-09-29', '2024-09-28'),
        (8, 4, '2024-10-01', '2024-10-15', NULL),
        (13, 5, '2024-10-03', '2024-10-17', NULL),
        (1, 2, '2024-10-05', '2024-10-19', NULL),
        (6, 3, '2024-10-06', '2024-10-20', NULL),
        (15, 7, '2024-10-08', '2024-10-22', NULL),
        (4, 1, '2024-10-10', '2024-10-24', NULL),
        (11, 8, '2024-10-10', '2024-10-24', NULL),
        (9, 4, '2024-10-12', '2024-10-26', NULL),
        (2, 5, '2024-10-12', '2024-10-26', '2024-10-25'),
        (7, 7, '2024-10-13', '2024-10-27', NULL),
        (5, 2, '2024-10-14', '2024-10-28', NULL)
      ON CONFLICT DO NOTHING;
    `);
  }

  const tables = await client.query(`
    SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as col_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log('Tables created in public schema:');
  console.table(tables.rows);

  client.release();
  await pool.end();
  console.log('✅ Database initialization and seeding completed successfully!');
}

run().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
