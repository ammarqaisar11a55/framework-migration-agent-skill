package com.example;

import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class GreeterNameTest {
    @Test
    public void includesTheName() {
        assertTrue(new Greeter().greet("Grace").endsWith(" Grace"));
    }
}
