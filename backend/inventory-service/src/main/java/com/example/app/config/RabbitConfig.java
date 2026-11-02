package com.example.app.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitConfig {

    public static final String EXCHANGE_NAME = "freshvend.order.exchange";
    public static final String QUEUE_NAME = "order.paid.queue";
    public static final String ROUTING_KEY = "order.paid";

    // Kết quả nhả hàng do machine-coldchain-service báo về (DISPENSED / JAMMED + voucher hoàn tiền)
    public static final String DISPENSE_RESULT_QUEUE = "order.dispense.result.queue";
    public static final String DISPENSE_RESULT_ROUTING_KEY = "order.dispense.result";

    public static final String DIRECT_EXCHANGE_NAME = "freshvend.direct.exchange";
    public static final String DISPENSE_COMMAND_QUEUE = "dispense.command.queue";
    public static final String DISPENSE_ROUTING_KEY = "dispense.command";

    // Dead Letter Exchange & Queue
    public static final String DLX_NAME = "freshvend.dlx";
    public static final String DLQ_NAME = "dispense.failure.dlq";
    public static final String DLQ_ROUTING_KEY = "dispense.failure";

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin rabbitAdmin = new RabbitAdmin(connectionFactory);
        rabbitAdmin.setAutoStartup(true);
        return rabbitAdmin;
    }

    // 1. Direct Exchange chính cho lệnh điều phối nhả hàng
    @Bean
    public DirectExchange dispenseDirectExchange() {
        return new DirectExchange(DIRECT_EXCHANGE_NAME);
    }

    // 2. Dead Letter Exchange (DLX)
    @Bean
    public DirectExchange deadLetterExchange() {
