package com.example;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public class NoteStore {
    private final Path dir;

    public NoteStore(Path dir) {
        this.dir = dir;
    }

    public void save(String name, String text) throws IOException {
        if (name.isBlank() || name.contains("/")) {
            throw new IllegalArgumentException("bad note name: " + name);
        }
        Files.writeString(dir.resolve(name + ".txt"), text, StandardCharsets.UTF_8);
    }

    public String load(String name) throws IOException {
        return Files.readString(dir.resolve(name + ".txt"), StandardCharsets.UTF_8);
    }

    public static String slug(String title) {
        return title.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }
}
