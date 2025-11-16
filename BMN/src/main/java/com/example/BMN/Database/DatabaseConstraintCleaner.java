package com.example.BMN.Database;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Development-only utility: on startup, look for UNIQUE indexes/constraints on SITE_USER.nickname
 * and drop them if present. This helps local H2 DBs created earlier to remove stale unique
 * constraints without manual console steps.
 *
 * This runner is activated only when the 'dev' profile is active. It logs actions and swallows
 * errors so it won't prevent application startup in other environments.
 */
@Component
public class DatabaseConstraintCleaner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConstraintCleaner.class);

    private final JdbcTemplate jdbc;
    private final Environment env;

    public DatabaseConstraintCleaner(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try {
            boolean isDev = false;
            try {
                String[] active = env.getActiveProfiles();
                for (String p : active) if ("dev".equalsIgnoreCase(p)) { isDev = true; break; }
            } catch (Exception ignored) {}

            boolean explicit = Boolean.parseBoolean(env.getProperty("app.dropNicknameUnique", "false"));
            if (!isDev && !explicit) {
                log.info("DB cleaner: not running (activate 'dev' profile or set app.dropNicknameUnique=true to enable)");
                return;
            }

            log.info("DB cleaner: scanning SITE_USER indexes/constraints for nickname unique keys...");

            // 1) Look for indexes referencing SITE_USER (INDEXES table varies by H2 version but columns exist)
            List<Map<String, Object>> idxs = jdbc.queryForList("SELECT * FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME = 'SITE_USER'");
            for (Map<String, Object> row : idxs) {
                Object cols = row.get("COLUMN_NAME");
                Object indexName = row.get("INDEX_NAME");
                Object uniqueFlag = row.get("UNIQUE_INDEX"); // some H2 versions use UNIQUE_INDEX
                if (uniqueFlag == null) uniqueFlag = row.get("UNIQUE");

                String colsStr = cols != null ? cols.toString() : "";
                if (colsStr.toUpperCase().contains("NICKNAME")) {
                    log.info("Found index {} on columns {} (unique={})", indexName, colsStr, uniqueFlag);
                    try {
                        String drop = String.format("DROP INDEX %s", quoteSqlIdentifier(indexName));
                        log.info("Dropping index using: {}", drop);
                        jdbc.execute(drop);
                        log.info("Dropped index {}", indexName);
                    } catch (Exception e) {
                        log.warn("Failed to drop index {}: {}", indexName, e.getMessage());
                    }
                }
            }

            // 2) Look for table constraints (unique constraints) referencing SITE_USER
            List<Map<String, Object>> cons = jdbc.queryForList("SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME='SITE_USER'");
            for (Map<String, Object> row : cons) {
                Object constraintName = row.get("CONSTRAINT_NAME");
                Object columns = row.get("COLUMN_LIST");
                Object type = row.get("CONSTRAINT_TYPE");
                String colsStr = columns != null ? columns.toString() : "";
                if ("UNIQUE".equalsIgnoreCase(String.valueOf(type)) && colsStr.toUpperCase().contains("NICKNAME")) {
                    log.info("Found UNIQUE constraint {} on {}", constraintName, colsStr);
                    try {
                        String drop = String.format("ALTER TABLE SITE_USER DROP CONSTRAINT %s", quoteSqlIdentifier(constraintName));
                        log.info("Dropping constraint using: {}", drop);
                        jdbc.execute(drop);
                        log.info("Dropped constraint {}", constraintName);
                    } catch (Exception e) {
                        log.warn("Failed to drop constraint {}: {}", constraintName, e.getMessage());
                    }
                }
            }

            log.info("DB cleaner (dev): finished scanning SITE_USER");
        } catch (Exception ex) {
            log.warn("DB cleaner (dev) encountered an error and will not block startup: {}", ex.getMessage());
        }
    }

    private String quoteSqlIdentifier(Object raw) {
        if (raw == null) return "";
        String name = raw.toString();
        // if already quoted, return as-is
        if (name.startsWith("\"") && name.endsWith("\"")) return name;
        // wrap with double quotes to preserve case/special chars
        return '"' + name + '"';
    }
}
