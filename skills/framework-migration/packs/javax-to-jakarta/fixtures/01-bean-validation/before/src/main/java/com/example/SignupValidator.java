package com.example;

import java.util.Set;
import java.util.TreeSet;
import javax.validation.ConstraintViolation;
import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;

public class SignupValidator {
    private final Validator validator;

    public SignupValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    /** The names of the invalid fields, sorted. */
    public Set<String> invalidFields(Signup signup) {
        Set<String> fields = new TreeSet<>();
        for (ConstraintViolation<Signup> violation : validator.validate(signup)) {
            fields.add(violation.getPropertyPath().toString());
        }
        return fields;
    }
}
