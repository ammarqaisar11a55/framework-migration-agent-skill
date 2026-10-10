package com.example;

import static org.junit.Assert.assertEquals;

import java.util.Locale;
import org.junit.Rule;
import org.junit.Test;

public class GreeterEnglishTest {
    @Rule
    public DefaultLocaleRule english = new DefaultLocaleRule(Locale.ENGLISH);

    @Test
    public void greetsInEnglish() {
        assertEquals("Hello Ada", new Greeter().greet("Ada"));
    }
}
