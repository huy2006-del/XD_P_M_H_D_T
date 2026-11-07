package com.example.app.config;

import com.example.app.dto.request.DispenseRequestMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.MessageConverter;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RabbitMQConfigTest {

    private final RabbitMQConfig config = new RabbitMQConfig();

    @Test
    void dispenseQueueIsDurableAndRoutesRejectedMessagesToConfiguredDlq() {
        var queue = config.dispenseQueue();

        assertEquals(RabbitMQConfig.DISPENSE_QUEUE, queue.getName());
        assertEquals(Boolean.TRUE, queue.isDurable());
        assertEquals(RabbitMQConfig.DEAD_LETTER_EXCHANGE,
                queue.getArguments().get("x-dead-letter-exchange"));
        assertEquals(RabbitMQConfig.DEAD_LETTER_ROUTING_KEY,
                queue.getArguments().get("x-dead-letter-routing-key"));
    }

    @Test
    void messageConverterRoundTripsDispenseCommandsAsJson() {
        MessageConverter converter = config.jackson2JsonMessageConverter(new ObjectMapper());
        DispenseRequestMessage request = new DispenseRequestMessage("ORD-10", "4", "B2", true);

        Message jsonMessage = converter.toMessage(request, new MessageProperties());
        Object decodedMessage = converter.fromMessage(jsonMessage);

        assertEquals(request, decodedMessage);
    }

    @Test
    void dispenseResultQueueIsBoundToOrderExchange() {
        var queue = config.dispenseResultQueue();
        var exchange = config.orderTopicExchange();
        var binding = config.dispenseResultBinding(queue, exchange);

        assertEquals(RabbitMQConfig.DISPENSE_RESULT_QUEUE, queue.getName());
        assertEquals(RabbitMQConfig.ORDER_EXCHANGE, binding.getExchange());
        assertEquals(RabbitMQConfig.DISPENSE_RESULT_ROUTING_KEY, binding.getRoutingKey());
    }
}
