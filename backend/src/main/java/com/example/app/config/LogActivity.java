package com.example.app.config;

import com.example.app.entity.ActionType;
import com.example.app.entity.EntityType;

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
