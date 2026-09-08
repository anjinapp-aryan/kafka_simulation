package com.suhail.kafkaplayground.day05;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

/**
 * Phase 5: a single bounded run (one batch, then exits) with a controllable
 * commit-timing mode, so a "crash" is simulated precisely as "the process
 * ends without calling commitSync() at this point" rather than relying on
 * OS-level kill timing. Args: <group.id> <mode>
 *
 * modes:
 *   no-commit             - read, print, exit. Never commits.
 *   commit-after-process  - read, print, "process", commitSync(). Normal safe pattern.
 *   commit-before-crash   - read, print, commitSync() FIRST, then throw before "processing".
 *   process-then-crash    - read, print, "process", then throw BEFORE commitSync().
 */
public class OffsetSemanticsConsumer {

    private static Logger log;
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        String groupId = args[0];
        String mode = args[1];
        log = LoggerFactory.getLogger("[" + groupId + "]");

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.CLIENT_ID_CONFIG, groupId + "-client");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList(TOPIC));

        ConsumerRecords<String, String> records = ConsumerRecords.empty();
        for (int attempt = 0; attempt < 10 && records.isEmpty(); attempt++) {
            records = consumer.poll(Duration.ofMillis(1000));
        }

        if (records.isEmpty()) {
            log.info("Group={} mode={} NO RECORDS RECEIVED", groupId, mode);
            consumer.close();
            return;
        }

        for (ConsumerRecord<String, String> record : records) {
            log.info("Group={} mode={} RECEIVED partition={} offset={} key={} value={}",
                    groupId, mode, record.partition(), record.offset(), record.key(), record.value());
        }

        switch (mode) {
            case "no-commit":
                log.info("Group={} mode={} NOT COMMITTING, exiting", groupId, mode);
                consumer.close();
                break;

            case "commit-after-process":
                log.info("Group={} mode={} PROCESSING business logic...", groupId, mode);
                log.info("Group={} mode={} PROCESSING complete", groupId, mode);
                consumer.commitSync();
                log.info("Group={} mode={} COMMITTED", groupId, mode);
                consumer.close();
                break;

            case "commit-before-crash":
                consumer.commitSync();
                log.info("Group={} mode={} COMMITTED BEFORE PROCESSING", groupId, mode);
                throw new RuntimeException("SIMULATED CRASH before business processing runs");

            case "process-then-crash":
                log.info("Group={} mode={} PROCESSING business logic...", groupId, mode);
                log.info("Group={} mode={} PROCESSING complete (side effect already happened)", groupId, mode);
                throw new RuntimeException("SIMULATED CRASH before commitSync() runs");

            default:
                throw new IllegalArgumentException("Unknown mode: " + mode);
        }
    }
}
