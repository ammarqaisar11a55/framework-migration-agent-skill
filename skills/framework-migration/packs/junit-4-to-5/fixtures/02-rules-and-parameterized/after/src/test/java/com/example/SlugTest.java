package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.Collection;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

public class SlugTest {
    public static Collection<Object[]> cases() {
        return Arrays.asList(new Object[][] {
            {"Hello World", "hello-world"},
            {"  Trim me  ", "trim-me"},
            {"C++ & Java!", "c-java"},
        });
    }

    private String title;
    private String expected;

    public void initSlugTest(String title, String expected) {
        this.title = title;
        this.expected = expected;
    }

    @MethodSource("cases")
    @ParameterizedTest(name = "{0} -> {1}")
    public void slugs(String title, String expected) {
        initSlugTest(title, expected);
        assertEquals(expected, NoteStore.slug(title));
    }
}
