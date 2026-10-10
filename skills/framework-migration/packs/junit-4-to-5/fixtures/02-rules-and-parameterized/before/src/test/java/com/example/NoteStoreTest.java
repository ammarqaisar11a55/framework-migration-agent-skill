package com.example;

import static org.junit.Assert.assertEquals;
import static org.junit.Assume.assumeTrue;

import java.io.File;
import java.nio.file.Files;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import org.junit.rules.TemporaryFolder;

public class NoteStoreTest {
    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    @Rule
    public ExpectedException thrown = ExpectedException.none();

    @Test
    public void savesAndLoadsNotes() throws Exception {
        NoteStore store = new NoteStore(folder.getRoot().toPath());
        store.save("todo", "buy milk");
        assertEquals("buy milk", store.load("todo"));
    }

    @Test
    public void writesOneFilePerNote() throws Exception {
        File dir = folder.newFolder("notes");
        NoteStore store = new NoteStore(dir.toPath());
        store.save("a", "1");
        store.save("b", "2");
        assertEquals(2, Files.list(dir.toPath()).count());
    }

    @Test
    public void rejectsNamesWithSlashes() throws Exception {
        thrown.expect(IllegalArgumentException.class);
        thrown.expectMessage("bad note name");
        new NoteStore(folder.getRoot().toPath()).save("a/b", "x");
    }

    @Test
    public void unicodeRoundTripsOnUtf8Systems() throws Exception {
        assumeTrue("needs UTF-8", "UTF-8".equals(System.getProperty("file.encoding", "UTF-8")));
        NoteStore store = new NoteStore(folder.getRoot().toPath());
        store.save("u", "naïve café");
        assertEquals("naïve café", store.load("u"));
    }
}
