package com.suhail.kafkaplayground.day04;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;

/** Phase 4: produces a small set of uniquely-identifiable records for group-isolation proof. */
public class IdentifiedOrderProducer {

    private static final Logger log = LoggerFactory.getLogger(IdentifiedOrderProducer.class);
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        String prefix = args.length > 0 ? args[0] : "Order";
        int count = args.length > 1 ? Integer.parseInt(args[1]) : 5;

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            for (int i = 1; i <= count; i++) {
                String value = String.format("%s-%03d", prefix, i);
                ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, null, value);
                producer.send(record, (metadata, exception) -> {
                    if (exception != null) {
                        log.error("Send failed for value={}", value, exception);
                    } else {
                        log.info("value={} -> partition={} offset={}", value, metadata.partition(), metadata.offset());
                    }
                });
            }
            producer.flush();
        }
    }
}
