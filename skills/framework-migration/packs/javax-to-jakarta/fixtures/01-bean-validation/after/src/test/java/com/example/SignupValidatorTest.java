package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Set;
import org.junit.jupiter.api.Test;

class SignupValidatorTest {
    private final SignupValidator validator = new SignupValidator();

    @Test
    void acceptsAValidSignup() {
        assertEquals(Set.of(), validator.invalidFields(new Signup("ada", "ada@example.org", 36)));
    }

    @Test
    void reportsEveryInvalidField() {
        assertEquals(Set.of("age", "email", "username"), validator.invalidFields(new Signup(" ", "not-an-email", 9)));
    }

    @Test
    void limitsTheUsernameLength() {
        assertEquals(Set.of("username"), validator.invalidFields(new Signup("x".repeat(21), "a@b.c", 20)));
    }
}
