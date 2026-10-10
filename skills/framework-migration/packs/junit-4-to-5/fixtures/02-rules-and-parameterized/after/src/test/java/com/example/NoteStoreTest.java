package com.example;

import static org.hamcrest.CoreMatchers.containsString;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

public class NoteStoreTest {
    @TempDir
    public File folder;

    @Test
    public void savesAndLoadsNotes() throws Exception {
        NoteStore store = new NoteStore(folder.toPath());
        store.save("todo", "buy milk");
        assertEquals("buy milk", store.load("todo"));
    }

    @Test
    public void writesOneFilePerNote() throws Exception {
        File dir = newFolder(folder, "notes");
        NoteStore store = new NoteStore(dir.toPath());
        store.save("a", "1");
        store.save("b", "2");
        assertEquals(2, Files.list(dir.toPath()).count());
    }

    @Test
    public void rejectsNamesWithSlashes() {
        Throwable exception = assertThrows(IllegalArgumentException.class, () ->
            new NoteStore(folder.toPath()).save("a/b", "x"));
        assertThat(exception.getMessage(), containsString("bad note name"));
    }

    @Test
    public void unicodeRoundTripsOnUtf8Systems() throws Exception {
        assumeTrue("UTF-8".equals(System.getProperty("file.encoding", "UTF-8")), "needs UTF-8");
        NoteStore store = new NoteStore(folder.toPath());
        store.save("u", "naïve café");
        assertEquals("naïve café", store.load("u"));
    }

    private static File newFolder(File root, String... subDirs) throws IOException {
        String subFolder = String.join("/", subDirs);
        File result = new File(root, subFolder);
        if (!result.mkdirs()) {
            throw new IOException("Couldn't create folders " + root);
        }
        return result;
    }
}
