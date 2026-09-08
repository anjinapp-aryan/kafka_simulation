package com.suhail.kafkaplayground.day06;

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
 * Phase 6 (F1-F6): one configurable consumer covering join / graceful leave /
 * crash / empty-member / slow-consumer / assignment-strategy experiments.
 *
 * Args: <name> <group.id> <assignor> <maxPollIntervalMs> <processingDelayMs> <stopAfterSeconds>
 *
 *   assignor          - range | roundrobin | cooperative-sticky
 *   processingDelayMs - Thread.sleep() per non-empty poll batch (simulates slow processing)
 *   stopAfterSeconds  - 0 = run until killed; >0 = deterministic GRACEFUL close()
 *                       (reliable on Windows, where signal-based shutdown hooks are not)
 */
public class FailureLabConsumer {

    private static final String TOPIC = "phase6-orders";

    public static void main(String[] args) throws Exception {
        String name = args[0];
        String groupId = args[1];
        String assignor = args[2];
        int maxPollIntervalMs = Integer.parseInt(args[3]);
        long processingDelayMs = Long.parseLong(args[4]);
        long stopAfterSeconds = Long.parseLong(args[5]);

        Logger log = LoggerFactory.getLogger("[" + name + "]");

        String assignorClass = switch (assignor) {
            case "range" -> RangeAssignor.class.getName();
            case "roundrobin" -> RoundRobinAssignor.class.getName();
            case "cooperative-sticky" -> CooperativeStickyAssignor.class.getName();
            default -> throw new IllegalArgumentException("bad assignor: " + assignor);
        };

        Properties p = new Properties();
        p.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        p.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        p.put(ConsumerConfig.CLIENT_ID_CONFIG, name);
        p.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        p.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        p.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        p.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        p.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG, assignorClass);
        p.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, maxPollIntervalMs);

        KafkaConsumer<String, String> c = new KafkaConsumer<>(p);
        long deadline = stopAfterSeconds > 0
                ? System.currentTimeMillis() + stopAfterSeconds * 1000 : Long.MAX_VALUE;

        c.subscribe(Collections.singletonList(TOPIC), new ConsumerRebalanceListener() {
            @Override public void onPartitionsRevoked(Collection<TopicPartition> parts) {
                log.info("{} REVOKED {}", name, ids(parts));
            }
            @Override public void onPartitionsAssigned(Collection<TopicPartition> parts) {
                log.info("{} ASSIGNED {} (assignor={})", name, ids(parts), assignor);
            }
        });

        log.info("{} START group={} assignor={} max.poll.interval.ms={} delay={}ms stopAfter={}s",
                name, groupId, assignor, maxPollIntervalMs, processingDelayMs, stopAfterSeconds);

        try {
            while (System.currentTimeMillis() < deadline) {
                ConsumerRecords<String, String> recs = c.poll(Duration.ofMillis(1000));
                if (!recs.isEmpty()) {
                    log.info("{} got {} records", name, recs.count());
                    if (processingDelayMs > 0) {
                        log.info("{} SLOW PROCESSING {}ms (not calling poll() during this)",
                                name, processingDelayMs);
                        Thread.sleep(processingDelayMs);
                        log.info("{} processing done, about to poll/commit again", name);
                    }
                    try {
                        c.commitSync();
                    } catch (CommitFailedException e) {
                        log.error("{} COMMIT FAILED - evicted from group: {}", name, e.getMessage());
                    }
                }
            }
            log.info("{} GRACEFUL STOP (deadline reached), closing consumer", name);
        } catch (WakeupException e) {
            log.info("{} woken up", name);
        } finally {
            c.close();   // sends LeaveGroup -> immediate rebalance, no session-timeout wait
            log.info("{} CLOSED", name);
        }
    }

    private static String ids(Collection<TopicPartition> parts) {
        List<Integer> l = parts.stream().map(TopicPartition::partition).sorted().collect(Collectors.toList());
        return l.toString();
    }
}
