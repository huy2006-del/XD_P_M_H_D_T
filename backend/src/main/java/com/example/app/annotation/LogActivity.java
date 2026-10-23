package com.freshvend.identity_service.annotation;

import com.freshvend.identity_service.enums.ActionType;
import com.freshvend.identity_service.enums.EntityType;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogActivity {
    ActionType action();
    EntityType entity();
    String details() default "";
}
