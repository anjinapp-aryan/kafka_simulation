package com.suhail.kafkaplayground.day02;

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
 * Reusable Phase 2 consumer harness. Args: <group.id> <auto.offset.reset> [maxEmptyPolls]
 * Prints full record detail per poll batch, including batch size, to make
 * poll()'s batching behavior and auto.offset.reset behavior directly observable.
 */
public class PollConsumer {

    private static final Logger log = LoggerFactory.getLogger(PollConsumer.class);
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        String groupId = args.length > 0 ? args[0] : "poll-consumer-default";
        String offsetReset = args.length > 1 ? args[1] : "earliest";
        int maxEmptyPolls = args.length > 2 ? Integer.parseInt(args[2]) : 8;

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, offsetReset);

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList(TOPIC));

            int emptyPolls = 0;
            while (emptyPolls < maxEmptyPolls) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                if (records.isEmpty()) {
                    emptyPolls++;
                    continue;
                }
                emptyPolls = 0;
                log.info("poll() returned a batch of {} records", records.count());
                for (ConsumerRecord<String, String> record : records) {
                    log.info("topic={} partition={} offset={} key={} value={} timestamp={}",
                            record.topic(), record.partition(), record.offset(),
                            record.key(), record.value(), record.timestamp());
                }
                consumer.commitSync();
            }
            log.info("Consumer {} exiting, group={}", groupId, groupId);
        }
    }
}
