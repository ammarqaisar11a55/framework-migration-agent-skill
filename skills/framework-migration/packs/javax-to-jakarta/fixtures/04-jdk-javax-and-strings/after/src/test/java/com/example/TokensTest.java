package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Properties;
import org.junit.jupiter.api.Test;

class TokensTest {
    @Test
    void signsWithHmacSha256() throws Exception {
        assertEquals("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8", new TokenSigner("key").sign("The quick brown fox jumps over the lazy dog"));
    }

    @Test
    void readsTheLegacyJdbcUrlKey() {
        Properties legacy = new Properties();
        legacy.setProperty("javax.persistence.jdbc.url", "jdbc:h2:mem:old");
        assertEquals("jdbc:h2:mem:old", DatabaseSettings.jdbcUrl(legacy));
    }

    @Test
    void prefersTheJakartaKey() {
        Properties both = new Properties();
        both.setProperty("javax.persistence.jdbc.url", "jdbc:h2:mem:old");
        both.setProperty("jakarta.persistence.jdbc.url", "jdbc:h2:mem:new");
        assertEquals("jdbc:h2:mem:new", DatabaseSettings.jdbcUrl(both));
    }
}
