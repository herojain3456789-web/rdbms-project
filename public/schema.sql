-- ============================================================
-- BOOKSTACK — Library Management & Book Tracking System
-- MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS library_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE library_management;

-- ============================================================
-- 1. Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS Categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ============================================================
-- 2. Authors
-- ============================================================
CREATE TABLE IF NOT EXISTS Authors (
  author_id   INT AUTO_INCREMENT PRIMARY KEY,
  author_name VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

-- ============================================================
-- 3. Publishers
-- ============================================================
CREATE TABLE IF NOT EXISTS Publishers (
  publisher_id   INT AUTO_INCREMENT PRIMARY KEY,
  publisher_name VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

-- ============================================================
-- 4. Books
-- ============================================================
CREATE TABLE IF NOT EXISTS Books (
  book_id          INT AUTO_INCREMENT PRIMARY KEY,
  isbn             VARCHAR(20)  NOT NULL UNIQUE,
  title            VARCHAR(300) NOT NULL,
  category_id      INT          NOT NULL,
  publisher_id     INT          NOT NULL,
  publication_year INT,
  total_copies     INT          NOT NULL DEFAULT 1,
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_total_copies CHECK (total_copies >= 0),
  CONSTRAINT chk_publication_year CHECK (publication_year IS NULL OR publication_year BETWEEN 1000 AND 2100),

  CONSTRAINT fk_books_category
    FOREIGN KEY (category_id) REFERENCES Categories(category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_books_publisher
    FOREIGN KEY (publisher_id) REFERENCES Publishers(publisher_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_books_title ON Books(title);
CREATE INDEX idx_books_isbn ON Books(isbn);

-- ============================================================
-- 5. Book_Authors (many-to-many junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS Book_Authors (
  book_id   INT NOT NULL,
  author_id INT NOT NULL,

  PRIMARY KEY (book_id, author_id),

  CONSTRAINT fk_ba_book
    FOREIGN KEY (book_id) REFERENCES Books(book_id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_ba_author
    FOREIGN KEY (author_id) REFERENCES Authors(author_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. Members
-- ============================================================
CREATE TABLE IF NOT EXISTS Members (
  member_id         INT AUTO_INCREMENT PRIMARY KEY,
  full_name         VARCHAR(200) NOT NULL,
  email             VARCHAR(200) NOT NULL UNIQUE,
  phone             VARCHAR(20),
  registration_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
  membership_status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_members_email ON Members(email);

-- ============================================================
-- 7. Loans
-- ============================================================
CREATE TABLE IF NOT EXISTS Loans (
  loan_id     INT AUTO_INCREMENT PRIMARY KEY,
  book_id     INT  NOT NULL,
  member_id   INT  NOT NULL,
  issue_date  DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date    DATE NOT NULL,
  return_date DATE DEFAULT NULL,

  CONSTRAINT chk_due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT chk_return_after_issue CHECK (return_date IS NULL OR return_date >= issue_date),

  CONSTRAINT fk_loans_book
    FOREIGN KEY (book_id) REFERENCES Books(book_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_loans_member
    FOREIGN KEY (member_id) REFERENCES Members(member_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_loans_book ON Loans(book_id);
CREATE INDEX idx_loans_member ON Loans(member_id);
CREATE INDEX idx_loans_return ON Loans(return_date);

-- ============================================================
-- 8. Audit_Log (for triggers)
-- ============================================================
CREATE TABLE IF NOT EXISTS Audit_Log (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id  INT,
  details    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 9. TRIGGERS
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_before_loan_insert;
DROP TRIGGER IF EXISTS trg_after_loan_insert;
DROP TRIGGER IF EXISTS trg_before_loan_update;

DELIMITER //

-- Trigger 1: BEFORE INSERT on Loans — validate availability & dates
CREATE TRIGGER trg_before_loan_insert
BEFORE INSERT ON Loans
FOR EACH ROW
BEGIN
  DECLARE v_total INT;
  DECLARE v_active_loans INT;
  DECLARE v_member_status VARCHAR(10);

  -- Check member is active
  SELECT membership_status INTO v_member_status
  FROM Members WHERE member_id = NEW.member_id;

  IF v_member_status != 'active' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot issue book: member is inactive';
  END IF;

  -- Check due_date >= issue_date
  IF NEW.due_date < NEW.issue_date THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Due date must be on or after issue date';
  END IF;

  -- Check availability
  SELECT total_copies INTO v_total
  FROM Books WHERE book_id = NEW.book_id;

  SELECT COUNT(*) INTO v_active_loans
  FROM Loans
  WHERE book_id = NEW.book_id AND return_date IS NULL;

  IF v_active_loans >= v_total THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Cannot issue book: no available copies';
  END IF;
END//

-- Trigger 2: AFTER INSERT on Loans — audit log
CREATE TRIGGER trg_after_loan_insert
AFTER INSERT ON Loans
FOR EACH ROW
BEGIN
  INSERT INTO Audit_Log (event_type, table_name, record_id, details)
  VALUES (
    'BOOK_ISSUED',
    'Loans',
    NEW.loan_id,
    CONCAT('Book ID: ', NEW.book_id, ', Member ID: ', NEW.member_id,
           ', Issue Date: ', NEW.issue_date, ', Due Date: ', NEW.due_date)
  );
END//

-- Trigger 3: BEFORE UPDATE on Loans — validate return date
CREATE TRIGGER trg_before_loan_update
BEFORE UPDATE ON Loans
FOR EACH ROW
BEGIN
  IF NEW.return_date IS NOT NULL AND NEW.return_date < OLD.issue_date THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Return date cannot be before issue date';
  END IF;

  -- Log the return
  IF OLD.return_date IS NULL AND NEW.return_date IS NOT NULL THEN
    INSERT INTO Audit_Log (event_type, table_name, record_id, details)
    VALUES (
      'BOOK_RETURNED',
      'Loans',
      NEW.loan_id,
      CONCAT('Book ID: ', NEW.book_id, ', Member ID: ', NEW.member_id,
             ', Returned: ', NEW.return_date)
    );
  END IF;
END//

DELIMITER ;

-- ============================================================
-- 10. SEED DATA
-- ============================================================

-- Categories
INSERT INTO Categories (category_name) VALUES
  ('Fiction'), ('Non-Fiction'), ('Science'), ('Technology'),
  ('History'), ('Philosophy'), ('Mathematics'), ('Literature'),
  ('Biography'), ('Self-Help');

-- Authors
INSERT INTO Authors (author_name) VALUES
  ('George Orwell'), ('Harper Lee'), ('F. Scott Fitzgerald'),
  ('Jane Austen'), ('Mark Twain'), ('J.K. Rowling'),
  ('Stephen King'), ('Isaac Asimov'), ('Agatha Christie'),
  ('Ernest Hemingway'), ('Leo Tolstoy'), ('Charles Dickens'),
  ('Robert C. Martin'), ('Martin Fowler'), ('Donald Knuth');

-- Publishers
INSERT INTO Publishers (publisher_name) VALUES
  ('Penguin Random House'), ('HarperCollins'), ('Simon & Schuster'),
  ('Macmillan'), ('Hachette'), ('Oxford University Press'),
  ('Cambridge University Press'), ('Pearson'), ('Wiley'),
  ('O''Reilly Media');

-- Books
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
  ('978-0-7432-7357-2', 'The Republic', 6, 3, -380, 2),
  ('978-0-553-21311-7', 'Cosmos', 3, 1, 1980, 3),
  ('978-0-06-093546-7', 'To Kill a Kingdom', 1, 2, 2018, 4),
  ('978-0-14-044913-6', 'Crime and Punishment', 8, 1, 1866, 3);

-- Book_Authors
INSERT INTO Book_Authors (book_id, author_id) VALUES
  (1, 1), (2, 2), (3, 3), (4, 4), (5, 5),
  (6, 6), (7, 7), (8, 8), (9, 9), (10, 10),
  (11, 11), (12, 12), (13, 13), (14, 14), (15, 15);

-- Members
INSERT INTO Members (full_name, email, phone, registration_date, membership_status) VALUES
  ('Alice Johnson', 'alice@example.com', '555-0101', '2024-01-15', 'active'),
  ('Bob Smith', 'bob@example.com', '555-0102', '2024-02-20', 'active'),
  ('Charlie Brown', 'charlie@example.com', '555-0103', '2024-03-10', 'active'),
  ('Diana Prince', 'diana@example.com', '555-0104', '2024-04-05', 'active'),
  ('Edward Norton', 'edward@example.com', '555-0105', '2024-05-12', 'active'),
  ('Fiona Green', 'fiona@example.com', '555-0106', '2024-06-01', 'inactive'),
  ('George Lucas', 'george@example.com', '555-0107', '2024-07-22', 'active'),
  ('Hannah Montana', 'hannah@example.com', '555-0108', '2024-08-15', 'active');

-- Loans (mix of active and returned)
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
  (5, 2, '2024-10-14', '2024-10-28', NULL);
