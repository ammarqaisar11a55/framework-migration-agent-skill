package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class InvoiceXmlTest {
    @Test
    void writesAttributesAndElements() throws Exception {
        Invoice invoice = new Invoice();
        invoice.number = "INV-1";
        invoice.lines.add(new Invoice.Line("tea", "3.50"));
        assertEquals("<invoice number=\"INV-1\"><line sku=\"tea\"><amount>3.50</amount></line></invoice>", InvoiceXml.write(invoice));
    }

    @Test
    void readsAndTotalsLines() throws Exception {
        Invoice invoice = InvoiceXml.read("<invoice number=\"INV-2\"><line sku=\"a\"><amount>1.25</amount></line><line sku=\"b\"><amount>2</amount></line></invoice>");
        assertEquals("INV-2", invoice.number);
        assertEquals(2, invoice.lines.size());
        assertEquals(new BigDecimal("3.25"), invoice.total());
    }
}
