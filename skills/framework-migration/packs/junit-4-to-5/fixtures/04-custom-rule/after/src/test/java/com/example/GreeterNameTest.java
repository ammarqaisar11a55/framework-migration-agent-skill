package com.example;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

public class GreeterNameTest {
    @Test
    public void includesTheName() {
        assertTrue(new Greeter().greet("Grace").endsWith(" Grace"));
    }
}
