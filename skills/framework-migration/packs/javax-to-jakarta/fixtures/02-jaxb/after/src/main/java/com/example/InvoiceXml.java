package com.example;

import java.io.StringReader;
import java.io.StringWriter;
import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Marshaller;

public final class InvoiceXml {
    private static final JAXBContext CONTEXT;

    static {
        try {
            CONTEXT = JAXBContext.newInstance(Invoice.class);
        } catch (JAXBException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    private InvoiceXml() {}

    public static String write(Invoice invoice) throws JAXBException {
        Marshaller marshaller = CONTEXT.createMarshaller();
        marshaller.setProperty(Marshaller.JAXB_FRAGMENT, Boolean.TRUE);
        StringWriter out = new StringWriter();
        marshaller.marshal(invoice, out);
        return out.toString();
    }

    public static Invoice read(String xml) throws JAXBException {
        return (Invoice) CONTEXT.createUnmarshaller().unmarshal(new StringReader(xml));
    }
}
