export interface InterviewContent {
  question: string;
  answer: string;
  memorySentence: string;
  productionExample: string;
  why: { question: string; answer: string };
}

export const INTERVIEW_CONTENT: Record<string, InterviewContent> = {
  P1: {
    question: 'How does Kafka distribute work among consumers?',
    answer:
      'Kafka stores data in partitions. Consumers in the same consumer group share those partitions. Each partition has exactly one consumer owner within a group at a time.',
    memorySentence: 'Partitions are the work units. Consumers share those work units.',
    productionExample:
      '3 partitions + 10 consumers: only 3 consumers can actively consume those partitions at the same time. The other 7 are idle for this topic/group.',
    why: {
      question: "Why can't C4 get a partition?",
      answer:
        'There are only 3 partitions. A partition can have only one owner inside the same consumer group. Therefore the fourth consumer remains idle.',
    },
  },
};
