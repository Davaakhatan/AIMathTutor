-- Get all tables in public schema
SELECT 
    schemaname,
    tablename,
    tableowner
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename;

