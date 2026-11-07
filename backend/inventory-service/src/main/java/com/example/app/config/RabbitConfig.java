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
        return new DirectExchange(DLX_NAME);
    }

    // 3. Dead Letter Queue (DLQ)
    @Bean
    public Queue dispenseFailureDlq() {
        return new Queue(DLQ_NAME, true);
    }

    // 4. Binding DLQ vào DLX
    @Bean
    public Binding dlqBinding(Queue dispenseFailureDlq, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(dispenseFailureDlq)
                .to(deadLetterExchange)
                .with(DLQ_ROUTING_KEY);
    }

    // Queue dispense.command.queue (+ binding) do machine-coldchain-service khai báo và tiêu thụ.
    // Không khai báo lại ở đây để tránh xung đột tham số x-dead-letter-* (PRECONDITION_FAILED).

    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue orderPaidQueue() {
        return new Queue(QUEUE_NAME, true);
    }

    @Bean
    public Binding binding(Queue orderPaidQueue, TopicExchange orderExchange) {
        return BindingBuilder.bind(orderPaidQueue).to(orderExchange).with(ROUTING_KEY);
    }

    @Bean
    public Queue dispenseResultQueue() {
        return new Queue(DISPENSE_RESULT_QUEUE, true);
    }

    @Bean
    public Binding dispenseResultBinding(@Qualifier("dispenseResultQueue") Queue dispenseResultQueue,
                                         @Qualifier("orderExchange") TopicExchange orderExchange) {
        return BindingBuilder.bind(dispenseResultQueue).to(orderExchange).with(DISPENSE_RESULT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public CommandLineRunner initRabbitTopology(RabbitAdmin rabbitAdmin) {
        return args -> {
            rabbitAdmin.initialize();
        };
    }
}