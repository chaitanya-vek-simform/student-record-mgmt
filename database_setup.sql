IF DB_ID('student_db') IS NULL
BEGIN
    CREATE DATABASE student_db;
END;
GO

USE student_db;
GO

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'student',
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@test.com')
BEGIN
    INSERT INTO users (email, password_hash, role)
    VALUES ('admin@test.com', '$2b$10$YSPFYKQh1ODobKXStv.8C.ed4ZhTHBmeCteAPeR2RIXptumij23GW', 'admin');
END;
GO

IF OBJECT_ID('dbo.students', 'U') IS NULL
BEGIN
    CREATE TABLE students (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        department NVARCHAR(MAX) NOT NULL,
        created_by INT NULL,
        created_at DATETIME2 DEFAULT SYSDATETIME()
    );
END;
GO

IF COL_LENGTH('dbo.students', 'created_by') IS NULL
BEGIN
    ALTER TABLE students ADD created_by INT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_students_users_created_by'
)
BEGIN
    ALTER TABLE students
    ADD CONSTRAINT FK_students_users_created_by
    FOREIGN KEY (created_by) REFERENCES users(id);
END;
GO

DECLARE @admin_id INT = (SELECT TOP 1 id FROM users WHERE email = 'admin@test.com');

IF @admin_id IS NOT NULL
BEGIN
    UPDATE students
    SET created_by = @admin_id
    WHERE created_by IS NULL;
END;
GO

IF NOT EXISTS (SELECT 1 FROM students)
BEGIN
    INSERT INTO students (name, department) VALUES
    ('Alice Smith', 'Computer Science'),
    ('Bob Johnson', 'Mechanical Engineering'), 
    ('Charlie Brown', 'Electrical Engineering'),
    ('Diana Prince', 'Civil Engineering'),
    ('Ethan Hunt', 'Aerospace Engineering'),
    ('Fiona Gallagher', 'Chemical Engineering'),
    ('George Martin', 'Biomedical Engineering'),
    ('Hannah Baker', 'Environmental Engineering'),
    ('Ian Fleming', 'Industrial Engineering'),
    ('Jane Doe', 'Software Engineering');
END;
GO
