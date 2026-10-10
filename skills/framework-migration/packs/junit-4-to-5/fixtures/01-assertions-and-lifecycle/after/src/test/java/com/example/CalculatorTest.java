package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.util.concurrent.TimeUnit;

public class CalculatorTest {
    private Calculator calculator;
    private int calls;

    @BeforeEach
    public void setUp() {
        calculator = new Calculator();
    }

    @AfterEach
    public void tearDown() {
        assertTrue(calls > 0, "each test uses the calculator");
    }

    @Test
    public void dividesWholeNumbers() {
        calls++;
        assertEquals(2, calculator.divide(6, 3), "6 / 3");
    }

    @Test
    public void rejectsDivisionByZero() {
        assertThrows(IllegalArgumentException.class, () -> {
            calls++;
            calculator.divide(1, 0);
        });
    }

    @Test
    @Timeout(value = 1000, unit = TimeUnit.MILLISECONDS, threadMode = Timeout.ThreadMode.SEPARATE_THREAD)
    public void dividesQuickly() {
        calls++;
        for (int i = 1; i < 100_000; i++) {
            calculator.divide(i, 1);
        }
    }

    @Disabled("rounding is not specified yet")
    @Test
    public void roundsTowardsZero() {
        assertEquals(-2, calculator.divide(-7, 3));
    }
}
