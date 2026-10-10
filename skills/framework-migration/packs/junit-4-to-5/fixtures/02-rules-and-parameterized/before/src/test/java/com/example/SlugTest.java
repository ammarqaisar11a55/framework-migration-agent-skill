package com.example;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collection;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;
import org.junit.runners.Parameterized.Parameters;

@RunWith(Parameterized.class)
public class SlugTest {
    @Parameters(name = "{0} -> {1}")
    public static Collection<Object[]> cases() {
        return Arrays.asList(new Object[][] {
            {"Hello World", "hello-world"},
            {"  Trim me  ", "trim-me"},
            {"C++ & Java!", "c-java"},
        });
    }

    private final String title;
    private final String expected;

    public SlugTest(String title, String expected) {
        this.title = title;
        this.expected = expected;
    }

    @Test
    public void slugs() {
        assertEquals(expected, NoteStore.slug(title));
    }
}
