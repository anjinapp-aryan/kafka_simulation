package com.suhail.kafkaplayground.day10;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashSet;
import java.util.Set;

/**
 * Phase 10 (T7): business idempotency vs Kafka producer idempotence.
 * The Set stands in for a durable store (e.g. a payments table's primary key)
 * - the point is the CHECK-BEFORE-ACT pattern, not the storage technology.
 */
public class PaymentIdempotencyDemo {

    private static final Logger log = LoggerFactory.getLogger(PaymentIdempotencyDemo.class);
    private static final Set<String> processedPayments = new HashSet<>();

    public static void main(String[] args) {
        deliver("PAY-1001", 1000, "CUST-101");
        deliver("PAY-1001", 1000, "CUST-101"); // duplicate delivery (Phase 5: proven at-least-once replay)
        deliver("PAY-1002", 500, "CUST-102");
    }

    private static void deliver(String paymentId, int amount, String customer) {
        if (processedPayments.contains(paymentId)) {
            log.info("{} ALREADY PROCESSED -> skip business effect (no duplicate charge)", paymentId);
            return;
        }
        log.info("{} charging customer={} amount={}", paymentId, customer, amount);
        processedPayments.add(paymentId);
        log.info("{} -> PROCESSED, recorded in durable store", paymentId);
    }
}
