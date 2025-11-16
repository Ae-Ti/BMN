package com.example.BMN.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Optional startup migration that moves integer `age` values into a `date_of_birth` column.
 *
 * Disabled by default. Enable by setting `app.migrate.age-to-dob=true` in the active profile.
 *
 * Migration strategy:
 * - For each row where `age` IS NOT NULL and `date_of_birth` IS NULL, compute an approximate
 *   birth date as (currentDate minus age years) with month/day set to Jan 1 (i.e. birth year only).
 * - Update the `date_of_birth` column for that user id.
 *
 * This runner uses plain SQL so it works even though the entity no longer exposes `age`.
 */
@Component
public class AgeToDobMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AgeToDobMigrationRunner.class);

    private final JdbcTemplate jdbc;
    private final Environment env;

    public AgeToDobMigrationRunner(JdbcTemplate jdbc, Environment env) {
        this.jdbc = jdbc;
        this.env = env;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        boolean enabled = Boolean.parseBoolean(env.getProperty("app.migrate.age-to-dob", "false"));
        if (!enabled) {
            log.debug("AgeToDobMigrationRunner disabled (app.migrate.age-to-dob not set)");
            return;
        }

        log.info("AgeToDobMigrationRunner starting: migrating age -> date_of_birth (approx)");

        // Defensive: check that columns exist
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, age FROM site_user WHERE age IS NOT NULL AND date_of_birth IS NULL"
            );

            log.info("Found {} users with age but missing date_of_birth", rows.size());

            for (Map<String, Object> r : rows) {
                Number idNum = (Number) r.get("id");
                Number ageNum = (Number) r.get("age");
                if (idNum == null || ageNum == null) continue;
                long id = idNum.longValue();
                int age = ageNum.intValue();

                // approximate DOB: current date minus age years, set to Jan 1
                LocalDate approx = LocalDate.now().minusYears(age).withDayOfYear(1);
                Date sqlDate = Date.valueOf(approx);

                int updated = jdbc.update("UPDATE site_user SET date_of_birth = ? WHERE id = ?", sqlDate, id);
                if (updated > 0) {
                    log.info("Migrated user id={} age={} -> date_of_birth={}", id, age, approx);
                } else {
                    log.warn("Failed to update user id={} (age={})", id, age);
                }
            }
        } catch (Exception ex) {
            log.error("AgeToDobMigrationRunner failed: {}", ex.getMessage(), ex);
        }
    }
}
