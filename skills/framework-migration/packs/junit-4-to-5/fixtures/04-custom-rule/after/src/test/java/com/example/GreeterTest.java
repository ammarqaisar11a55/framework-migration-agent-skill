package com.example;

import static org.junit.Assert.assertEquals;

import java.util.Locale;
import org.junit.Rule;
import org.junit.Test;

public class GreeterTest {
    @Rule
    public DefaultLocaleRule french = new DefaultLocaleRule(Locale.FRENCH);

    @Test
    public void greetsInTheDefaultLanguage() {
        assertEquals("Bonjour Ada", new Greeter().greet("Ada"));
    }
}
