package com.example;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

public class CalculatorTest {
    private Calculator calculator;
    private int calls;

    @Before
    public void setUp() {
        calculator = new Calculator();
    }

    @After
    public void tearDown() {
        assertTrue("each test uses the calculator", calls > 0);
    }

    @Test
    public void dividesWholeNumbers() {
        calls++;
        assertEquals("6 / 3", 2, calculator.divide(6, 3));
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsDivisionByZero() {
        calls++;
        calculator.divide(1, 0);
    }

    @Test(timeout = 1000)
    public void dividesQuickly() {
        calls++;
        for (int i = 1; i < 100_000; i++) {
            calculator.divide(i, 1);
        }
    }

    @Ignore("rounding is not specified yet")
    @Test
    public void roundsTowardsZero() {
        assertEquals(-2, calculator.divide(-7, 3));
    }
}
