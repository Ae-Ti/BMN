package com.example.BMN.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Optional runner to DROP the legacy `age` column from `site_user`.
 *
 * Usage: enable by setting `app.migrate.drop-age=true` in the active profile or environment.
 * The runner first checks INFORMATION_SCHEMA (or equivalent) to confirm the column exists,
 * and will skip if not present. It logs actions and errors.
 */
@Component
public class DropAgeColumnRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DropAgeColumnRunner.class);

    private final JdbcTemplate jdbc;
    private final Environment env;

    public DropAgeColumnRunner(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        boolean enabled = Boolean.parseBoolean(env.getProperty("app.migrate.drop-age", "false"));
        if (!enabled) {
            log.debug("DropAgeColumnRunner disabled (app.migrate.drop-age not set)");
            return;
        }

        log.info("DropAgeColumnRunner: checking for legacy column 'age' on site_user");

        try {
            // INFORMATION_SCHEMA is available on H2. For other DBs the query may differ,
            // but we try a conservative approach that works for common dev DB.
            Integer count = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE UPPER(TABLE_NAME)='SITE_USER' AND UPPER(COLUMN_NAME)='AGE'",
                    Integer.class
            );
            if (count == null || count == 0) {
                log.info("DropAgeColumnRunner: no 'age' column found; nothing to do");
                return;
            }

            log.info("DropAgeColumnRunner: 'age' column present; attempting to DROP it");
            try {
                jdbc.execute("ALTER TABLE site_user DROP COLUMN age");
                log.info("DropAgeColumnRunner: successfully dropped 'age' column from site_user");
            } catch (Exception ex) {
                log.error("DropAgeColumnRunner: failed to drop column 'age': {}", ex.getMessage(), ex);
            }
        } catch (Exception e) {
            log.error("DropAgeColumnRunner: error while checking/dropping 'age' column: {}", e.getMessage(), e);
        }
    }
}
