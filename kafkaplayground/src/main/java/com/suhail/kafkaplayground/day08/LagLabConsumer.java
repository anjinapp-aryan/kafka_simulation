package com.suhail.kafkaplayground.day08;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

/**
 * Phase 8 (L1-L4): consumer with controllable poll batch size and per-record
 * processing cost, so lag can be created and drained on demand.
 *
 * Args: <name> <group.id> <maxPollRecords> <perRecordDelayMs> <runSeconds>
 *
 * Logs every poll: batch size actually returned, cumulative count, and the
 * wall-clock gap since the previous poll (the number max.poll.interval.ms
 * is measured against).
 */
public class LagLabConsumer {

    private static final String TOPIC = "phase8-orders";

    public static void main(String[] args) throws Exception {
        String name = args[0];
        String groupId = args[1];
        int maxPollRecords = Integer.parseInt(args[2]);
        long perRecordDelayMs = Long.parseLong(args[3]);
        long runSeconds = Long.parseLong(args[4]);

        Logger log = LoggerFactory.getLogger("[" + name + "]");

        Properties p = new Properties();
        p.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        p.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        p.put(ConsumerConfig.CLIENT_ID_CONFIG, name);
        p.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        p.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        p.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        p.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        p.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);

        long deadline = System.currentTimeMillis() + runSeconds * 1000;
        long total = 0, polls = 0, lastPoll = System.currentTimeMillis();
        long start = System.currentTimeMillis();

        try (KafkaConsumer<String, String> c = new KafkaConsumer<>(p)) {
            c.subscribe(Collections.singletonList(TOPIC));
            log.info("{} START group={} max.poll.records={} perRecordDelayMs={} runSeconds={}",
                    name, groupId, maxPollRecords, perRecordDelayMs, runSeconds);

            while (System.currentTimeMillis() < deadline) {
                ConsumerRecords<String, String> recs = c.poll(Duration.ofMillis(500));
                long now = System.currentTimeMillis();
                if (!recs.isEmpty()) {
                    polls++;
                    total += recs.count();
                    log.info("{} poll#{} returned {} records (cumulative={}) gapSinceLastPollMs={}",
                            name, polls, recs.count(), total, now - lastPoll);
                    if (perRecordDelayMs > 0) {
                        Thread.sleep(perRecordDelayMs * recs.count());
                    }
                    c.commitSync();
                }
                lastPoll = now;
            }
            double secs = (System.currentTimeMillis() - start) / 1000.0;
            log.info("{} DONE consumed={} in {}s -> {} records/sec (polls={}, avgBatch={})",
                    name, total, String.format("%.1f", secs),
                    String.format("%.1f", total / secs), polls,
                    polls == 0 ? 0 : String.format("%.1f", (double) total / polls));
        }
    }
}
