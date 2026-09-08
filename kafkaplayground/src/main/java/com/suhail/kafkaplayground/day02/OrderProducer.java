package com.suhail.kafkaplayground.day02;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;

/**
 * Minimal producer for T7/T8/T9. Run with args: "unkeyed" or "keyed" (default: unkeyed).
 */
public class OrderProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderProducer.class);
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        String mode = args.length > 0 ? args[0] : "unkeyed";

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {

            if (mode.equals("t7")) {
                for (int i = 1; i <= 5; i++) {
                    send(producer, null, "Order-" + i);
                }
            } else if (mode.equals("unkeyed")) {
                for (int i = 1; i <= 20; i++) {
                    send(producer, null, "Order-" + i);
                }
            } else if (mode.equals("keyed")) {
                send(producer, "customer-101", "Order-A");
                send(producer, "customer-102", "Order-B");
                send(producer, "customer-101", "Order-C");
                send(producer, "customer-103", "Order-D");
            }

            producer.flush();
        }
    }

    private static void send(KafkaProducer<String, String> producer, String key, String value) {
        ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, key, value);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                log.error("Send failed for key={} value={}", key, value, exception);
            } else {
                log.info("key={} value={} -> partition={} offset={}",
                        key, value, metadata.partition(), metadata.offset());
            }
        });
    }
}
