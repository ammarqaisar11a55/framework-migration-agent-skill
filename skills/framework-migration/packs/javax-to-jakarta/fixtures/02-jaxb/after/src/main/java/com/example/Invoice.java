package com.example;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import jakarta.xml.bind.annotation.XmlAccessType;
import jakarta.xml.bind.annotation.XmlAccessorType;
import jakarta.xml.bind.annotation.XmlAttribute;
import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;

@XmlRootElement(name = "invoice")
@XmlAccessorType(XmlAccessType.FIELD)
public class Invoice {
    @XmlAttribute
    public String number;

    @XmlElement(name = "line")
    public List<Line> lines = new ArrayList<>();

    @XmlAccessorType(XmlAccessType.FIELD)
    public static class Line {
        @XmlAttribute
        public String sku;

        @XmlElement
        public BigDecimal amount;

        public Line() {}

        public Line(String sku, String amount) {
            this.sku = sku;
            this.amount = new BigDecimal(amount);
        }
    }

    public BigDecimal total() {
        return lines.stream().map(l -> l.amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
