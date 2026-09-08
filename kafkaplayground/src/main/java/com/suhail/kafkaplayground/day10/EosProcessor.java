package com.suhail.kafkaplayground.day10;

import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Phase 10 (T3/T4): one poll of input -> transactionally produce output +
 * commit input offset, atomically. Args: <transactional.id> <group.id> <crashAfterSend:true|false>
 *
 * crashAfterSend=true simulates T4: output is sent, then the process exits
 * (System.exit) BEFORE sendOffsetsToTransaction/commitTransaction -> the
 * transaction is left open, and the broker's producer epoch fencing/
 * transaction timeout aborts it.
 */
public class EosProcessor {

    private static final String INPUT = "phase10-payment-input";
    private static final String OUTPUT = "phase10-payment-events";

    public static void main(String[] args) throws Exception {
        String txnId = args[0];
        String groupId = args[1];
        boolean crashAfterSend = Boolean.parseBoolean(args[2]);
        Logger log = LoggerFactory.getLogger("[" + txnId + "]");

        Properties cp = new Properties();
        cp.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        cp.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        cp.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        cp.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        cp.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        cp.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        cp.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");

        Properties pp = new Properties();
        pp.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        pp.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        pp.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        pp.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, txnId);

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(cp);
        KafkaProducer<String, String> producer = new KafkaProducer<>(pp);

        producer.initTransactions();
        consumer.subscribe(Collections.singletonList(INPUT));

        ConsumerRecords<String, String> recs = ConsumerRecords.empty();
        for (int i = 0; i < 10 && recs.isEmpty(); i++) {
            recs = consumer.poll(Duration.ofMillis(1000));
        }
        if (recs.isEmpty()) {
            log.info("NO INPUT RECORDS - nothing to process");
            producer.close(); consumer.close();
            return;
        }

        producer.beginTransaction();
        log.info("beginTransaction() for {} input records", recs.count());

        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();
        for (ConsumerRecord<String, String> r : recs) {
            String outValue = "PROCESSED[" + r.value() + "]";
            RecordMetadata md = producer.send(new ProducerRecord<>(OUTPUT, outValue)).get();
            log.info("input partition={} offset={} value={} -> output partition={} offset={}",
                    r.partition(), r.offset(), r.value(), md.partition(), md.offset());
            offsets.put(new TopicPartition(INPUT, r.partition()),
                    new OffsetAndMetadata(r.offset() + 1));
        }

        if (crashAfterSend) {
            log.info("SIMULATED CRASH: exiting before sendOffsetsToTransaction/commitTransaction");
            Runtime.getRuntime().halt(1); // hard exit, no shutdown hooks, no cleanup
        }

        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());
        producer.commitTransaction();
        log.info("commitTransaction() OK - input offsets and output records committed atomically");

        producer.close();
        consumer.close();
    }
}
