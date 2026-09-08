package com.suhail.kafkaplayground.day07;

import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.KafkaException;
import org.apache.kafka.common.Metric;
import org.apache.kafka.common.MetricName;

import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutionException;

/**
 * Phase 7 (PR1-PR6): producer reliability experiments.
 *
 * Args: <mode> [arg]
 *   acks <0|1|all>   - PR1: send with given acks, report callback metadata
 *   idem-conflict    - PR3: enable.idempotence=true + acks=1 -> expect ConfigException
 *   idem-send        - PR3: idempotent producer, show assigned producer id/epoch
 *   timeout          - PR2/PR6: unreachable broker + short delivery.timeout.ms
 *   batching <ms>    - PR5: linger.ms effect on batch metrics
 */
public class ReliabilityProducer {

    private static final Logger log = LoggerFactory.getLogger(ReliabilityProducer.class);
    private static final String TOPIC = "phase7-orders";

    public static void main(String[] args) throws Exception {
        String mode = args[0];
        switch (mode) {
            case "acks"          -> acks(args[1]);
            case "idem-conflict" -> idemConflict();
            case "idem-send"     -> idemSend();
            case "timeout"       -> timeout();
            case "batching"      -> batching(Long.parseLong(args[1]));
            case "delivery-timeout" -> deliveryTimeout();
            default -> throw new IllegalArgumentException("bad mode: " + mode);
        }
    }

    private static Properties base() {
        Properties p = new Properties();
        p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        return p;
    }

    /** PR1: acks semantics. Note offset returned for acks=0. */
    private static void acks(String acksValue) throws Exception {
        Properties p = base();
        p.put(ProducerConfig.ACKS_CONFIG, acksValue);
        // idempotence defaults to true in clients >= 3.0 and REQUIRES acks=all,
        // so it must be explicitly disabled to test acks=0 / acks=1 at all.
        p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "all".equals(acksValue));

        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            for (int i = 1; i <= 3; i++) {
                String v = "acks" + acksValue + "-" + i;
                long t0 = System.nanoTime();
                RecordMetadata md = prod.send(new ProducerRecord<>(TOPIC, v)).get();
                long us = (System.nanoTime() - t0) / 1000;
                log.info("acks={} value={} -> partition={} offset={} hasOffset={} ackLatencyMicros={}",
                        acksValue, v, md.partition(), md.offset(), md.hasOffset(), us);
            }
        }
    }

    /** PR3: idempotence is incompatible with acks=1 - client rejects at construction. */
    private static void idemConflict() {
        Properties p = base();
        p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        p.put(ProducerConfig.ACKS_CONFIG, "1");
        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            log.error("UNEXPECTED: producer constructed with idempotence=true + acks=1");
        } catch (KafkaException e) {
            log.info("EXPECTED REJECTION: {}: {}", e.getClass().getSimpleName(), e.getMessage());
        }
    }

    /** PR3: idempotent producer gets a producer id + epoch (the dedup identity). */
    private static void idemSend() throws Exception {
        Properties p = base();
        p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            for (int i = 1; i <= 3; i++) {
                RecordMetadata md = prod.send(new ProducerRecord<>(TOPIC, "idem-" + i)).get();
                log.info("idempotent send value=idem-{} -> partition={} offset={}", i, md.partition(), md.offset());
            }
        }
    }

    /** PR2/PR6: no broker at this port -> retries bounded by delivery.timeout.ms. */
    private static void timeout() {
        Properties p = base();
        p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9099"); // nothing listening
        p.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 6000);
        p.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 2000);
        p.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        p.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 6000);

        log.info("config: delivery.timeout.ms=6000 request.timeout.ms=2000 retries=MAX_VALUE bootstrap=localhost:9099");
        long t0 = System.currentTimeMillis();
        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            prod.send(new ProducerRecord<>(TOPIC, "will-not-arrive")).get();
            log.error("UNEXPECTED: send succeeded");
        } catch (InterruptedException | ExecutionException | KafkaException e) {
            long ms = System.currentTimeMillis() - t0;
            Throwable c = e.getCause() != null ? e.getCause() : e;
            log.info("FAILED after {}ms with {}: {}", ms, c.getClass().getSimpleName(), c.getMessage());
        }
    }

    /**
     * PR6: real delivery.timeout.ms expiry. Sends once so metadata is cached and the
     * connection is warm, waits while the broker is stopped externally, then sends
     * again - that batch is accepted into the accumulator but can never be acked,
     * so it expires against delivery.timeout.ms (NOT max.block.ms).
     */
    private static void deliveryTimeout() throws Exception {
        Properties p = base();
        p.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 8000);
        p.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 3000);
        p.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 60000); // keep metadata blocking out of the picture

        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            RecordMetadata warm = prod.send(new ProducerRecord<>(TOPIC, "warmup")).get();
            log.info("WARMUP ok -> partition={} offset={} (metadata now cached)", warm.partition(), warm.offset());

            log.info("STOP BROKER NOW - sleeping 12s");
            Thread.sleep(12000);

            log.info("sending while broker is down (delivery.timeout.ms=8000)");
            long t0 = System.currentTimeMillis();
            try {
                prod.send(new ProducerRecord<>(TOPIC, "during-outage")).get();
                log.error("UNEXPECTED: send succeeded");
            } catch (ExecutionException e) {
                long ms = System.currentTimeMillis() - t0;
                log.info("EXPIRED after {}ms: {}: {}", ms,
                        e.getCause().getClass().getSimpleName(), e.getCause().getMessage());
            }
        }
    }

    /** PR5: linger.ms effect on batching, read from real producer metrics. */
    private static void batching(long lingerMs) throws Exception {
        Properties p = base();
        p.put(ProducerConfig.LINGER_MS_CONFIG, lingerMs);
        p.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);

        try (KafkaProducer<String, String> prod = new KafkaProducer<>(p)) {
            for (int i = 1; i <= 30; i++) {
                prod.send(new ProducerRecord<>(TOPIC, "batch" + lingerMs + "-" + i));
            }
            prod.flush();
            for (Map.Entry<MetricName, ? extends Metric> e : prod.metrics().entrySet()) {
                String n = e.getKey().name();
                if (e.getKey().group().equals("producer-metrics")
                        && (n.equals("batch-size-avg") || n.equals("records-per-request-avg")
                            || n.equals("request-rate") || n.equals("record-send-total"))) {
                    log.info("linger.ms={} metric {}={}", lingerMs, n, e.getValue().metricValue());
                }
            }
        }
    }
}
