import java.sql.*;
import java.util.*;

public class H2IndexInspector {
    public static void main(String[] args) throws Exception {
        boolean doDrop = false;
        for (String a : args) if ("--drop".equalsIgnoreCase(a)) doDrop = true;
        String dbPath = System.getProperty("db.path", "/Users/taeilbae/bmn-testdb");
        String url = "jdbc:h2:file:" + dbPath + ";IFEXISTS=TRUE";
        String user = System.getProperty("db.user", "sa");
        String pass = System.getProperty("db.pass", "");
        System.out.println("Connecting to " + url + " as " + user);
        try (Connection c = DriverManager.getConnection(url, user, pass)) {
            DatabaseMetaData md = c.getMetaData();
            System.out.println("Connected. Database product: " + md.getDatabaseProductName() + " " + md.getDatabaseProductVersion());
            List<String> drops = new ArrayList<>();

            // Indexes
            try (PreparedStatement ps = c.prepareStatement("SELECT * FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME = 'SITE_USER'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    boolean any = false;
                    while (rs.next()) {
                        String indexName = rs.getString("INDEX_NAME");
                        String cols = rs.getString("COLUMN_NAME");
                        Object unique = null;
                        try { unique = rs.getObject("UNIQUE_INDEX"); } catch (Exception ignored) {}
                        if (unique == null) try { unique = rs.getObject("UNIQUE"); } catch (Exception ignored) {}
                        if (cols != null && cols.toUpperCase().contains("NICKNAME")) {
                            any = true;
                            System.out.println("Found INDEX: " + indexName + " on cols=" + cols + " unique=" + unique);
                            drops.add("DROP INDEX " + quote(indexName));
                        }
                    }
                    if (!any) System.out.println("No matching INDEX entries found.");
                }
            } catch (SQLException e) {
                System.out.println("Error reading INFORMATION_SCHEMA.INDEXES: " + e.getMessage());
            }

            // Constraints
            try (PreparedStatement ps = c.prepareStatement("SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME='SITE_USER'")) {
                try (ResultSet rs = ps.executeQuery()) {
                    boolean any = false;
                    while (rs.next()) {
                        String consName = rs.getString("CONSTRAINT_NAME");
                        String cols = null;
                        try { cols = rs.getString("COLUMN_LIST"); } catch (Exception ignored) {}
                        String type = rs.getString("CONSTRAINT_TYPE");
                        if ((cols != null && cols.toUpperCase().contains("NICKNAME")) || (consName != null && consName.toUpperCase().contains("NICKNAME"))) {
                            any = true;
                            System.out.println("Found CONSTRAINT: " + consName + " type=" + type + " cols=" + cols);
                            drops.add("ALTER TABLE SITE_USER DROP CONSTRAINT " + quote(consName));
                        }
                    }
                    if (!any) System.out.println("No matching TABLE_CONSTRAINTS entries found.");
                }
            } catch (SQLException e) {
                System.out.println("Error reading INFORMATION_SCHEMA.TABLE_CONSTRAINTS: " + e.getMessage());
            }

            if (drops.isEmpty()) {
                System.out.println("No DROP statements necessary.");
            } else {
                System.out.println("\nSuggested DROP statements (will be executed if --drop is given):");
                for (String d : drops) System.out.println(d);
                if (doDrop) {
                    System.out.println("\nRunning DROP statements...");
                    for (String d : drops) {
                        System.out.println("Executing: " + d);
                        try (Statement s = c.createStatement()) {
                            s.execute(d);
                            System.out.println("OK");
                        } catch (SQLException ex) {
                            System.out.println("FAILED: " + ex.getMessage());
                        }
                    }
                    System.out.println("Done.");
                }
            }
        } catch (SQLException e) {
            System.err.println("Connection failed: " + e.getMessage());
            System.exit(2);
        }
    }

    private static String quote(String name) {
        if (name == null) return "";
        if (name.startsWith("\"") && name.endsWith("\"")) return name;
        return '"' + name + '"';
    }
}
