--
-- ER/Studio Data Architect SQL Code Generation
-- Project :      BoringLogs_required.dm1
--
-- Date Created : Wednesday, November 23, 2016 12:12:20
-- Target DBMS : MySQL 5.x
--

-- 
-- TABLE: LITHOLOGY_1 
--

CREATE TABLE LITHOLOGY_1(
    Lith_ID        INT UNSIGNED    AUTO_INCREMENT,
    Point_Num      INT UNSIGNED    NOT NULL,
    Description    VARCHAR(50),
    Depth          FLOAT(18, 2),
    Bottom         FLOAT(18, 2),
    PRIMARY KEY (Lith_ID)
)ENGINE=INNODB
;



-- 
-- TABLE: POINT_1 
--

CREATE TABLE POINT_1(
    Point_Num            INT UNSIGNED    AUTO_INCREMENT,
    ProjectID            INT UNSIGNED    NOT NULL,
    PointID              VARCHAR(50),
    Elevation            FLOAT(18, 2),
    Date                 DATE,
    HoleDepth            FLOAT(18, 2),
    Location             VARCHAR(50),
    Water_Depth_First    FLOAT(18, 1),
    Water_Depth_Comp     FLOAT(18, 1),
    Latitude             VARCHAR(50),
    Longitude             VARCHAR(50),
    Boring_Type          VARCHAR(50),
    PRIMARY KEY (Point_Num)
)ENGINE=INNODB
;



-- 
-- TABLE: PROJECT_1 
--

CREATE TABLE PROJECT_1(
    ProjectID              INT UNSIGNED    AUTO_INCREMENT,
    FileName               VARCHAR(50),
    County                 VARCHAR(50),
    Coeff_Consol_Factor    FLOAT(18, 4),
    Project_Location       VARCHAR(50),
    PRIMARY KEY (ProjectID)
)ENGINE=INNODB
;



-- 
-- TABLE: SAMPLE_1 
--

CREATE TABLE SAMPLE_1(
    Sample_ID        INT UNSIGNED    AUTO_INCREMENT,
    Point_Num        INT UNSIGNED    NOT NULL,
    Depth            FLOAT(18, 2),
    Length           FLOAT(18, 2),
    Blows_2nd_6in    VARCHAR(50),
    Blows_3rd_6in    VARCHAR(50),
    Qu               FLOAT(18, 2),
    Moisture         INT,
    PRIMARY KEY (Sample_ID)
)ENGINE=INNODB
;



-- 
-- TABLE: LITHOLOGY_1 
--

ALTER TABLE LITHOLOGY_1 ADD CONSTRAINT RefPOINT_151 
    FOREIGN KEY (Point_Num)
    REFERENCES POINT_1(Point_Num)
;


-- 
-- TABLE: POINT_1 
--

ALTER TABLE POINT_1 ADD CONSTRAINT RefPROJECT_141 
    FOREIGN KEY (ProjectID)
    REFERENCES PROJECT_1(ProjectID)
;


-- 
-- TABLE: SAMPLE_1 
--

ALTER TABLE SAMPLE_1 ADD CONSTRAINT RefPOINT_181 
    FOREIGN KEY (Point_Num)
    REFERENCES POINT_1(Point_Num)
;


