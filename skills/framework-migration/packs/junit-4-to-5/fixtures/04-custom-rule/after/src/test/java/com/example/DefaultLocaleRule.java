package com.example;

import java.util.Locale;
import org.junit.rules.TestRule;
import org.junit.runner.Description;
import org.junit.runners.model.Statement;

/** Runs each test with a given default locale and restores the previous one. */
public class DefaultLocaleRule implements TestRule {
    private final Locale locale;

    public DefaultLocaleRule(Locale locale) {
        this.locale = locale;
    }

    @Override
    public Statement apply(Statement base, Description description) {
        return new Statement() {
            @Override
            public void evaluate() throws Throwable {
                Locale previous = Locale.getDefault();
                Locale.setDefault(locale);
                try {
                    base.evaluate();
                } finally {
                    Locale.setDefault(previous);
                }
            }
        };
    }
}
