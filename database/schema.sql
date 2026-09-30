-- Database setup for the University Research Opportunity Portal.
-- This file contains structure only, with no credentials or demo records.

CREATE DATABASE IF NOT EXISTS research_portal
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE research_portal;

CREATE TABLE IF NOT EXISTS research_opportunities (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    research_area VARCHAR(100) NOT NULL,
    faculty_name VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL,
    required_skills TEXT NOT NULL,
    positions_available INT NOT NULL,
    application_deadline DATE NOT NULL,
    status ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_title_not_empty
        CHECK (CHAR_LENGTH(TRIM(title)) > 0),

    CONSTRAINT chk_description_not_empty
        CHECK (CHAR_LENGTH(TRIM(description)) > 0),

    CONSTRAINT chk_research_area_not_empty
        CHECK (CHAR_LENGTH(TRIM(research_area)) > 0),

    CONSTRAINT chk_faculty_name_not_empty
        CHECK (CHAR_LENGTH(TRIM(faculty_name)) > 0),

    CONSTRAINT chk_department_not_empty
        CHECK (CHAR_LENGTH(TRIM(department)) > 0),

    CONSTRAINT chk_required_skills_not_empty
        CHECK (CHAR_LENGTH(TRIM(required_skills)) > 0),

    CONSTRAINT chk_positions_positive
        CHECK (positions_available >= 1),

    CONSTRAINT chk_status_valid
        CHECK (status IN ('Open', 'Closed'))
) ENGINE=InnoDB;
