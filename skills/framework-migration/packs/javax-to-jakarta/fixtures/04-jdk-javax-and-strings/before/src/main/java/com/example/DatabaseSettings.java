package com.example;

import java.util.Properties;

/** Reads the JDBC URL from configuration written for either persistence namespace. */
public final class DatabaseSettings {
    static final String LEGACY_URL_KEY = "javax.persistence.jdbc.url";
    static final String URL_KEY = "jakarta.persistence.jdbc.url";

    private DatabaseSettings() {}

    public static String jdbcUrl(Properties properties) {
        return properties.getProperty(URL_KEY, properties.getProperty(LEGACY_URL_KEY));
    }
}
