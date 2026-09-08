package com.suhail.kafkaplayground.day03;

import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.errors.WakeupException;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.stream.Collectors;

/**
 * Phase 3: a long-lived, named consumer group member. Runs until externally
 * killed (SIGTERM/Ctrl+C), logging its identity and every assignment change
 * so multiple instances can be started/stopped while inspecting group state
 * via Kafka CLI in parallel.
 *
 * Args: <consumerName> <group.id>
 */
public class GroupMemberConsumer {

    private static Logger log;
    private static final String TOPIC = "orders";

    public static void main(String[] args) {
        String name = args[0];
        String groupId = args[1];
        log = LoggerFactory.getLogger("[" + name + "]");

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.CLIENT_ID_CONFIG, name);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
        Runtime.getRuntime().addShutdownHook(new Thread(consumer::wakeup));

        consumer.subscribe(Collections.singletonList(TOPIC), new ConsumerRebalanceListener() {
            @Override
            public void onPartitionsRevoked(Collection<TopicPartition> partitions) {
                log.info("Consumer={} Group={} REVOKED partitions={}", name, groupId, describe(partitions));
            }

            @Override
            public void onPartitionsAssigned(Collection<TopicPartition> partitions) {
                log.info("Consumer={} Group={} ASSIGNED partitions={}", name, groupId, describe(partitions));
            }
        });

        log.info("Consumer={} Group={} starting, waiting for assignment...", name, groupId);

        try {
            while (true) {
                ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
                if (!records.isEmpty()) {
                    log.info("Consumer={} Group={} received {} records", name, groupId, records.count());
                    consumer.commitSync();
                }
            }
        } catch (WakeupException e) {
            log.info("Consumer={} Group={} shutting down", name, groupId);
        } finally {
            consumer.close();
        }
    }

    private static String describe(Collection<TopicPartition> partitions) {
        List<Integer> parts = partitions.stream()
                .map(TopicPartition::partition)
                .sorted()
                .collect(Collectors.toList());
        return parts.toString();
    }
}
