package com.suhail.kafkaplayground.day10;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Properties;

/**
 * Phase 10 (T1): commit vs abort a Kafka transaction.
 * Args: <transactional.id> <commit|abort> <value1> [value2 ...]
 */
public class TransactionalProducer {

    private static final Logger log = LoggerFactory.getLogger(TransactionalProducer.class);
    private static final String TOPIC = "phase10-payment-events";

    public static void main(String[] args) {
        String txnId = args[0];
        String outcome = args[1];

        Properties p = new Properties();
        p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        p.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, txnId);

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(p)) {
            producer.initTransactions();
            log.info("initTransactions() ok, transactional.id={}", txnId);

            producer.beginTransaction();
            log.info("beginTransaction()");

            for (int i = 2; i < args.length; i++) {
                RecordMetadata md = producer.send(new ProducerRecord<>(TOPIC, args[i])).get();
                log.info("send value={} -> partition={} offset={}", args[i], md.partition(), md.offset());
            }

            if ("commit".equals(outcome)) {
                producer.commitTransaction();
                log.info("commitTransaction() OK");
            } else {
                producer.abortTransaction();
                log.info("abortTransaction() OK");
            }
        } catch (Exception e) {
            log.error("FAILED: {}: {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }
}
